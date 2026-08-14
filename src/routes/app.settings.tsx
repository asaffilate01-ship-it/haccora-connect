import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth, canAccess, ROLES, type Role } from "@/lib/auth";
import { ACTION_GROUPS, ACTION_LABELS, ROLE_ACTIONS, type Action } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/haccora-client";
import { disableWebPush, registerWebPush } from "@/lib/web-push";
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  LogOut,
  RefreshCw,
  Mail,
  KeyRound,
  Check,
  X,
  Loader2,
  UserPlus,
  Send,
} from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [{ title: "Settings — Haccora" }, { name: "robots", content: "noindex" }],
  }),
  component: SettingsPage,
});

type InspectorGrant = {
  id: string;
  inspector_user_id: string;
  evidence_scopes: string[];
  valid_until: string;
};

function SettingsPage() {
  const { t, lang } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [digest, setDigest] = useState(false);
  const [startOfDay, setStartOfDay] = useState(true);
  const [issueAlerts, setIssueAlerts] = useState(true);
  const [expiryAlerts, setExpiryAlerts] = useState(true);
  const [startTime, setStartTime] = useState("08:00");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "chef" | "staff">("staff");
  const [inviteState, setInviteState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inviteError, setInviteError] = useState("");
  const [inspectorEmail, setInspectorEmail] = useState("");
  const [inspectorScope, setInspectorScope] = useState("temperature");
  const [inspectorHours, setInspectorHours] = useState(24);
  const [inspectorState, setInspectorState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [inspectorError, setInspectorError] = useState("");
  const [inspectorGrants, setInspectorGrants] = useState<InspectorGrant[]>([]);
  const [revokingGrant, setRevokingGrant] = useState<string | null>(null);
  const [sensorName, setSensorName] = useState("");
  const [sensorExternalId, setSensorExternalId] = useState("");
  const [sensorMin, setSensorMin] = useState("0");
  const [sensorMax, setSensorMax] = useState("7");
  const [sensorState, setSensorState] = useState<"idle" | "saving" | "created" | "error">("idle");
  const [sensorSecret, setSensorSecret] = useState("");
  const [sensorError, setSensorError] = useState("");

  useEffect(() => {
    if (user && !canAccess(user.role, "settings", user.inspectorScopes)) {
      navigate({ to: "/app", replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    (async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase
        .from("profiles")
        .select("email_alerts,push_alerts,weekly_digest")
        .eq("id", authUser.id)
        .maybeSingle();
      if (data) {
        setEmailAlerts(!!data.email_alerts);
        setPushAlerts(!!data.push_alerts);
        setDigest(!!data.weekly_digest);
      }
      const { data: schedule } = await supabase
        .from("notification_preferences")
        .select(
          "start_of_day_enabled,issue_alerts_enabled,expiry_alerts_enabled,start_of_day_local_time",
        )
        .eq("user_id", authUser.id)
        .maybeSingle();
      if (schedule) {
        setStartOfDay(schedule.start_of_day_enabled);
        setIssueAlerts(schedule.issue_alerts_enabled);
        setExpiryAlerts(schedule.expiry_alerts_enabled);
        setStartTime(schedule.start_of_day_local_time.slice(0, 5));
      }
    })();
  }, []);

  useEffect(() => {
    if (!user || !["owner", "manager"].includes(user.role)) return;
    void supabase
      .from("inspector_access_grants" as any)
      .select("id,inspector_user_id,evidence_scopes,valid_until")
      .is("revoked_at", null)
      .gt("valid_until", new Date().toISOString())
      .order("valid_until")
      .then(({ data }) => setInspectorGrants((data ?? []) as unknown as InspectorGrant[]));
  }, [user]);

  const savePref = async (patch: {
    email_alerts?: boolean;
    push_alerts?: boolean;
    weekly_digest?: boolean;
  }) => {
    setSaveState("saving");
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      setSaveState("idle");
      return;
    }
    const profileResult = await supabase.from("profiles").update(patch).eq("id", authUser.id);
    const preferenceResult = await supabase.rpc("set_my_notification_preferences", {
      p_email_enabled: patch.email_alerts ?? undefined,
      p_push_enabled: patch.push_alerts ?? undefined,
      p_weekly_digest: patch.weekly_digest ?? undefined,
    });
    if (profileResult.error || preferenceResult.error) {
      setSaveState("error");
      return;
    }
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 1200);
  };

  const saveSchedule = async (patch: {
    startOfDay?: boolean;
    issueAlerts?: boolean;
    expiryAlerts?: boolean;
    startTime?: string;
  }) => {
    setSaveState("saving");
    const { error } = await supabase.rpc("set_my_notification_schedule", {
      p_start_of_day_enabled: patch.startOfDay,
      p_issue_alerts_enabled: patch.issueAlerts,
      p_expiry_alerts_enabled: patch.expiryAlerts,
      p_start_of_day_local_time: patch.startTime,
    });
    setSaveState(error ? "error" : "saved");
    if (!error) setTimeout(() => setSaveState("idle"), 1200);
  };

  if (!user) return null;

  const canInvite = user.role === "owner" || user.role === "manager";
  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviteState("sending");
    setInviteError("");
    const { error } = await supabase.functions.invoke("team-invite", {
      body: { email: inviteEmail.trim(), role: inviteRole },
    });
    if (error) {
      setInviteState("error");
      setInviteError(error.message);
    } else {
      setInviteState("sent");
      setInviteEmail("");
    }
  };

  const sendInspectorInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setInspectorState("sending");
    setInspectorError("");
    if (!user?.locationId) {
      setInspectorState("error");
      setInspectorError("Select a location first.");
      return;
    }
    const { error } = await supabase.functions.invoke("inspector-invite", {
      body: {
        email: inspectorEmail.trim(),
        locationIds: [user.locationId],
        scopes: [inspectorScope],
        accessHours: inspectorHours,
        reason: "Time-limited inspection evidence review",
      },
    });
    if (error) {
      setInspectorState("error");
      setInspectorError(error.message);
    } else {
      setInspectorState("sent");
      setInspectorEmail("");
    }
  };

  const revokeInspectorGrant = async (grantId: string) => {
    setRevokingGrant(grantId);
    setInspectorError("");
    const { error } = await supabase
      .from("inspector_access_grants" as any)
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", grantId);
    if (error) {
      setInspectorError(error.message);
    } else {
      setInspectorGrants((current) => current.filter((grant) => grant.id !== grantId));
    }
    setRevokingGrant(null);
  };

  const provisionSensor = async (event: React.FormEvent) => {
    event.preventDefault();
    setSensorState("saving");
    setSensorSecret("");
    setSensorError("");
    const min = Number(sensorMin.replace(",", "."));
    const max = Number(sensorMax.replace(",", "."));
    if (!user?.locationId || !Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      setSensorState("error");
      setSensorError("Check location and limits.");
      return;
    }
    const { data, error } = await supabase.functions.invoke("sensor-provision", {
      body: {
        name: sensorName.trim(),
        externalDeviceId: sensorExternalId.trim(),
        locationId: user.locationId,
        targetMin: min,
        targetMax: max,
      },
    });
    if (error || !data?.secret) {
      setSensorState("error");
      setSensorError(error?.message ?? "Sensor provisioning failed");
      return;
    }
    setSensorSecret(String(data.secret));
    setSensorState("created");
    setSensorName("");
    setSensorExternalId("");
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-4xl">
      <div>
        <div className="eyebrow">{t("app.tag")}</div>
        <h1 className="mt-1 text-3xl md:text-4xl flex items-center gap-3">
          <SettingsIcon size={28} /> {t("settings.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("settings.sub")}</p>
      </div>

      {/* Profile */}
      <section className="surface p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-primary" />
          <h2 className="font-display text-lg">{t("settings.profile")}</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t("settings.name")} value={user.name} />
          <Field label={t("settings.email")} value={user.email} />
          <Field label={t("settings.role")} value={t(`role.${user.role}`)} />
          <Field label={t("settings.location")} value={user.location} />
        </div>
      </section>

      {canInvite && (
        <section className="surface p-6">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus size={18} className="text-primary" />
            <h2 className="font-display text-lg">{"Invite team securely"}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {"Roles are assigned server-side; public sign-up cannot choose permissions."}
          </p>
          <form onSubmit={sendInvite} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
            <input
              required
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="team@example.com"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="staff">{t("role.staff")}</option>
              <option value="chef">{t("role.chef")}</option>
              {user.role === "owner" && <option value="manager">{t("role.manager")}</option>}
            </select>
            <button
              disabled={inviteState === "sending"}
              className="btn-alert-solid text-sm disabled:opacity-60"
            >
              {inviteState === "sending" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}{" "}
              {"Invite"}
            </button>
          </form>
          {inviteState === "sent" && (
            <div role="status" className="mt-3 text-sm text-success">
              {"Invitation sent."}
            </div>
          )}
          {inviteState === "error" && (
            <div role="alert" className="mt-3 text-sm text-destructive">
              {inviteError}
            </div>
          )}
        </section>
      )}

      {canInvite && (
        <section className="surface p-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-primary" />
            <h2 className="font-display text-lg">{"Time-limited inspector access"}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {`Read-only access for ${user.location}; scope and expiry are enforced server-side.`}
          </p>
          <form
            onSubmit={sendInspectorInvite}
            className="grid gap-3 lg:grid-cols-[1fr_12rem_8rem_auto]"
          >
            <input
              required
              type="email"
              value={inspectorEmail}
              onChange={(event) => setInspectorEmail(event.target.value)}
              placeholder="inspector@authority.example"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <select
              value={inspectorScope}
              onChange={(event) => setInspectorScope(event.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="temperature">Temperature</option>
              <option value="haccp">HACCP</option>
              <option value="cleaning">Cleaning</option>
              <option value="pest">Pest</option>
              <option value="allergens">Allergens</option>
              <option value="training">Training</option>
              <option value="traceability">Traceability</option>
              <option value="audits">Audits</option>
              <option value="documents">Documents</option>
              <option value="incidents">Incidents</option>
              <option value="equipment">Equipment & maintenance</option>
            </select>
            <select
              value={inspectorHours}
              onChange={(event) => setInspectorHours(Number(event.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <option value={1}>1 hour</option>
              <option value={8}>8 hours</option>
              <option value={24}>24 hours</option>
              <option value={72}>72 hours</option>
              <option value={168}>7 days</option>
            </select>
            <button
              disabled={inspectorState === "sending"}
              className="btn-alert-solid text-sm disabled:opacity-60"
            >
              {inspectorState === "sending" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}{" "}
              {"Send access"}
            </button>
          </form>
          {inspectorState === "sent" && (
            <div role="status" className="mt-3 text-sm text-success">
              {"Inspector access sent."}
            </div>
          )}
          {inspectorState === "error" && (
            <div role="alert" className="mt-3 text-sm text-destructive">
              {inspectorError}
            </div>
          )}
          {inspectorGrants.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="text-sm font-semibold">{"Active access grants"}</div>
              <div className="mt-2 space-y-2">
                {inspectorGrants.map((grant) => (
                  <div
                    key={grant.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs"
                  >
                    <span className="font-mono">{grant.inspector_user_id.slice(0, 8)}…</span>
                    <span>{grant.evidence_scopes.join(", ")}</span>
                    <span className="text-muted-foreground">
                      {new Date(grant.valid_until).toLocaleString("en-GB")}
                    </span>
                    <button
                      type="button"
                      disabled={revokingGrant === grant.id}
                      onClick={() => void revokeInspectorGrant(grant.id)}
                      className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {revokingGrant === grant.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <X size={12} />
                      )}
                      {"Revoke"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {canInvite && (
        <section className="surface p-6">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound size={18} className="text-primary" />
            <h2 className="font-display text-lg">{"Provision temperature sensor"}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {`Create a device for ${user.location}. Its secret is shown only once.`}
          </p>
          <form
            onSubmit={provisionSensor}
            className="grid gap-3 lg:grid-cols-[1fr_1fr_7rem_7rem_auto]"
          >
            <input
              required
              minLength={2}
              maxLength={160}
              value={sensorName}
              onChange={(event) => setSensorName(event.target.value)}
              placeholder={"Device name"}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <input
              required
              minLength={3}
              maxLength={160}
              value={sensorExternalId}
              onChange={(event) => setSensorExternalId(event.target.value)}
              placeholder="device-serial-001"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <input
              required
              inputMode="decimal"
              value={sensorMin}
              onChange={(event) => setSensorMin(event.target.value)}
              aria-label={"Minimum Celsius"}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <input
              required
              inputMode="decimal"
              value={sensorMax}
              onChange={(event) => setSensorMax(event.target.value)}
              aria-label={"Maximum Celsius"}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <button
              disabled={sensorState === "saving"}
              className="btn-alert-solid text-sm disabled:opacity-60"
            >
              {sensorState === "saving" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <KeyRound size={14} />
              )}{" "}
              {"Provision"}
            </button>
          </form>
          {sensorState === "created" && sensorSecret && (
            <div
              role="status"
              className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3"
            >
              <div className="text-sm font-semibold">
                {"Copy securely now; this value will not be shown again."}
              </div>
              <code className="mt-2 block break-all text-xs select-all">{sensorSecret}</code>
            </div>
          )}
          {sensorState === "error" && (
            <div role="alert" className="mt-3 text-sm text-destructive">
              {sensorError}
            </div>
          )}
        </section>
      )}

      {/* Notifications */}
      <section className="surface p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-primary" />
          <h2 className="font-display text-lg">{t("settings.notifications")}</h2>
          <span className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1">
            {saveState === "saving" && (
              <>
                <Loader2 size={12} className="animate-spin" />
                {t("app.saving") ?? "Saving…"}
              </>
            )}
            {saveState === "saved" && (
              <>
                <Check size={12} className="text-success" />
                {"Saved"}
              </>
            )}
            {saveState === "error" && <span className="text-destructive">{"Save failed"}</span>}
          </span>
        </div>
        <div className="divide-y divide-border">
          <Toggle
            icon={<Mail size={16} />}
            label={t("settings.n.email")}
            hint={t("settings.n.email.hint")}
            checked={emailAlerts}
            onChange={(v) => {
              setEmailAlerts(v);
              savePref({ email_alerts: v });
            }}
          />
          <Toggle
            icon={<Bell size={16} />}
            label={t("settings.n.push")}
            hint={t("settings.n.push.hint")}
            checked={pushAlerts}
            onChange={async (v) => {
              try {
                if (v) await registerWebPush();
                else await disableWebPush();
              } catch (pushError) {
                setSaveState("error");
                console.warn(pushError);
                return;
              }
              setPushAlerts(v);
              await savePref({ push_alerts: v });
            }}
          />
          <Toggle
            icon={<RefreshCw size={16} />}
            label={t("settings.n.digest")}
            hint={t("settings.n.digest.hint")}
            checked={digest}
            onChange={(v) => {
              setDigest(v);
              savePref({ weekly_digest: v });
            }}
          />
          <Toggle
            icon={<RefreshCw size={16} />}
            label="Start-of-day routine"
            hint="Remind me to complete opening checks before service."
            checked={startOfDay}
            onChange={(value) => {
              setStartOfDay(value);
              void saveSchedule({ startOfDay: value });
            }}
          />
          <Toggle
            icon={<Bell size={16} />}
            label="Open issues"
            hint="Alert me about unresolved corrective actions and exceptions."
            checked={issueAlerts}
            onChange={(value) => {
              setIssueAlerts(value);
              void saveSchedule({ issueAlerts: value });
            }}
          />
          <Toggle
            icon={<KeyRound size={16} />}
            label="Document and training expiry"
            hint="Warn me when staff evidence expires within 30 days."
            checked={expiryAlerts}
            onChange={(value) => {
              setExpiryAlerts(value);
              void saveSchedule({ expiryAlerts: value });
            }}
          />
          <label className="flex items-center justify-between gap-4 py-4 text-sm">
            <span>
              <strong className="block">Opening reminder time</strong>
              <span className="text-xs text-muted-foreground">
                Uses your organisation timezone.
              </span>
            </span>
            <input
              type="time"
              value={startTime}
              disabled={!startOfDay}
              onChange={(event) => setStartTime(event.target.value)}
              onBlur={() => void saveSchedule({ startTime })}
              className="rounded-lg border border-border bg-card px-3 py-2"
            />
          </label>
        </div>
      </section>
      {/* Permissions matrix */}
      <PermissionsMatrix currentRole={user.role} />

      {/* Danger */}
      <section className="surface p-6 border border-destructive/30">
        <h2 className="font-display text-lg text-destructive">{t("settings.danger")}</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">{t("settings.danger.body")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              signOut();
              navigate({ to: "/login" });
            }}
            className="inline-flex items-center gap-2 rounded-full bg-destructive text-destructive-foreground px-4 py-2 text-sm font-semibold hover:brightness-110 transition"
          >
            <LogOut size={14} /> {t("auth.signout")}
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function Toggle({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-4 py-3 cursor-pointer">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition ${checked ? "bg-primary" : "bg-secondary"}`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-4" : ""}`}
        />
      </button>
    </label>
  );
}

function PermissionsMatrix({ currentRole }: { currentRole: Role }) {
  const { t } = useI18n();
  const labels = ACTION_LABELS;
  const roleLabel = (r: Role) => t(`role.${r}`);
  return (
    <section className="surface p-6">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound size={18} className="text-primary" />
        <h2 className="font-display text-lg">{t("settings.perms.title")}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t("settings.perms.sub")}</p>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-4 w-4 rounded grid place-items-center bg-success/15 text-success">
            <Check size={12} />
          </span>
          {t("settings.perms.legend.yes")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-4 w-4 rounded grid place-items-center bg-destructive/10 text-destructive">
            <X size={12} />
          </span>
          {t("settings.perms.legend.no")}
        </span>
        <span className="ml-auto text-muted-foreground">
          {t("settings.perms.yourRole")}:{" "}
          <span className="font-bold text-foreground">{roleLabel(currentRole)}</span>
        </span>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="text-left font-medium py-2 pr-4">{t("settings.perms.action")}</th>
              {ROLES.map((r) => (
                <th
                  key={r}
                  className={`text-center font-medium px-2 py-2 ${r === currentRole ? "text-primary" : ""}`}
                >
                  {roleLabel(r)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACTION_GROUPS.map((g) => (
              <Fragment key={g.label}>
                <tr>
                  <td
                    colSpan={ROLES.length + 1}
                    className="pt-4 pb-1 text-[10px] uppercase tracking-widest font-bold text-foreground/60"
                  >
                    {g.label}
                  </td>
                </tr>
                {g.actions.map((a) => (
                  <tr key={a} className="border-t border-border">
                    <td className="py-2 pr-4">{labels[a]}</td>
                    {ROLES.map((r) => (
                      <PermCell key={r} role={r} action={a} highlight={r === currentRole} />
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PermCell({ role, action, highlight }: { role: Role; action: Action; highlight: boolean }) {
  const allowed = ROLE_ACTIONS[role].includes(action);
  return (
    <td className={`text-center px-2 py-2 ${highlight ? "bg-primary/5" : ""}`}>
      {allowed ? (
        <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-success/15 text-success">
          <Check size={12} />
        </span>
      ) : (
        <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-destructive/10 text-destructive">
          <X size={12} />
        </span>
      )}
    </td>
  );
}
