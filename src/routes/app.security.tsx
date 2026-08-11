import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  KeyRound,
  Laptop,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/security")({ component: SecurityCentre });

type Factor = { id: string; friendly_name?: string; status: string; created_at: string };
type DeviceSession = {
  id: string;
  device_label: string;
  platform: "web" | "ios" | "android";
  assurance_level: "aal1" | "aal2";
  first_seen_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};
type PrivacyRequest = {
  id: string;
  request_type: string;
  status: string;
  due_at: string;
  created_at: string;
};
type Approval = {
  id: string;
  action: string;
  reason: string;
  requested_by: string;
  status: string;
  expires_at: string;
  created_at: string;
};

const db = supabase as any;

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const result = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(result))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

function SecurityCentre() {
  const { user } = useAuth();
  const [aal, setAal] = useState("aal1");
  const [factors, setFactors] = useState<Factor[]>([]);
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolment, setEnrolment] = useState<{ id: string; qr: string; secret: string } | null>(
    null,
  );
  const [verificationCode, setVerificationCode] = useState("");
  const [requestType, setRequestType] = useState("export");
  const [requestDetails, setRequestDetails] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [factorResult, assuranceResult, sessionResult, requestResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      db
        .from("device_sessions")
        .select("id,device_label,platform,assurance_level,first_seen_at,last_seen_at,revoked_at")
        .order("last_seen_at", { ascending: false }),
      db
        .from("privacy_requests")
        .select("id,request_type,status,due_at,created_at")
        .order("created_at", { ascending: false }),
    ]);
    setFactors((factorResult.data?.totp ?? []) as Factor[]);
    setAal(assuranceResult.data?.currentLevel ?? "aal1");
    setSessions(sessionResult.data ?? []);
    setRequests(requestResult.data ?? []);
    if (user?.role === "owner" || user?.role === "manager") {
      const { data } = await db
        .from("high_risk_action_requests")
        .select("id,action,reason,requested_by,status,expires_at,created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      setApprovals(data ?? []);
    }
    setLoading(false);
  }, [user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const register = async () => {
      let seed = window.localStorage.getItem("haccora-device-session");
      if (!seed) {
        seed = crypto.randomUUID();
        window.localStorage.setItem("haccora-device-session", seed);
      }
      const fingerprint = await digest(`${user.id}:${seed}`);
      const browser = navigator.userAgent.includes("Firefox")
        ? "Firefox"
        : navigator.userAgent.includes("Edg/")
          ? "Edge"
          : navigator.userAgent.includes("Chrome")
            ? "Chrome"
            : navigator.userAgent.includes("Safari")
              ? "Safari"
              : "Web browser";
      await supabase.functions.invoke("security-center", {
        body: {
          action: "register_session",
          fingerprint,
          label: `${browser} · ${navigator.platform || "device"}`,
          platform: "web",
          assuranceLevel: aal === "aal2" ? "aal2" : "aal1",
        },
      });
    };
    void register();
  }, [aal, user]);

  const startMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Haccora ${new Date().toLocaleDateString()}`,
    });
    if (error || !data.totp) return toast.error(error?.message ?? "MFA enrollment failed");
    setEnrolment({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verifyMfa = async () => {
    if (!enrolment || !/^\d{6}$/.test(verificationCode)) {
      return toast.error("Enter the six-digit code.");
    }
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrolment.id,
    });
    if (challengeError || !challenge) return toast.error(challengeError?.message ?? "MFA failed");
    const { error } = await supabase.auth.mfa.verify({
      factorId: enrolment.id,
      challengeId: challenge.id,
      code: verificationCode,
    });
    if (error) return toast.error(error.message);
    await db.rpc("record_security_event", { p_event_type: "mfa_enrolled" });
    setEnrolment(null);
    setVerificationCode("");
    toast.success("Two-factor protection enabled.");
    await load();
  };

  const removeFactor = async (factorId: string) => {
    if (!window.confirm("Remove this MFA factor?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return toast.error(error.message);
    await db.rpc("record_security_event", { p_event_type: "mfa_removed" });
    await load();
  };

  const signOutOthers = async (sessionId?: string) => {
    const { error } = await supabase.functions.invoke("security-center", {
      body: sessionId ? { action: "revoke_session", sessionId } : { action: "sign_out_others" },
    });
    if (error) return toast.error(error.message);
    toast.success("Other sessions were signed out.");
    await load();
  };

  const submitPrivacyRequest = async () => {
    const { data, error } = await supabase.functions.invoke("privacy-requests", {
      body: { type: requestType, details: requestDetails },
    });
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Request failed");
    setRequestDetails("");
    toast.success("Privacy request submitted.");
    await load();
  };

  const decide = async (id: string, approve: boolean) => {
    const reason = window.prompt("Decision reason");
    if (!reason) return;
    const { error } = await db.rpc("decide_high_risk_action", {
      p_request_id: id,
      p_approve: approve,
      p_reason: reason,
    });
    if (error) return toast.error(error.message);
    await load();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <header>
        <div className="eyebrow">Account & privacy</div>
        <h1 className="mt-1 text-3xl md:text-4xl">{"Security centre"}</h1>
        <p className="mt-2 text-muted-foreground max-w-3xl">
          MFA, active devices, privacy requests and sensitive approvals in one place.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric
          icon={aal === "aal2" ? ShieldCheck : ShieldAlert}
          label={"Assurance level"}
          value={aal.toUpperCase()}
          good={aal === "aal2"}
        />
        <Metric
          icon={KeyRound}
          label={"Verified MFA factors"}
          value={String(factors.filter((factor) => factor.status === "verified").length)}
          good={factors.some((factor) => factor.status === "verified")}
        />
        <Metric
          icon={Laptop}
          label={"Active devices"}
          value={String(sessions.filter((session) => !session.revoked_at).length)}
          good
        />
      </div>

      <section className="surface p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-display">{"Two-factor authentication"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {"Use a TOTP authenticator. Store recovery information securely outside Haccora."}
            </p>
          </div>
          <button className="btn-primary" onClick={startMfa}>
            <KeyRound size={15} /> {"Add factor"}
          </button>
        </div>
        {enrolment && (
          <div className="mt-5 grid md:grid-cols-[180px_1fr] gap-5 rounded-2xl bg-secondary p-5">
            <img
              src={enrolment.qr}
              alt={"Authenticator QR code"}
              className="h-44 w-44 bg-white p-2 rounded-xl"
            />
            <div>
              <div className="font-semibold">{"Scan and verify"}</div>
              <p className="text-xs text-muted-foreground mt-2 break-all">{enrolment.secret}</p>
              <div className="mt-4 flex gap-2">
                <input
                  className="input max-w-40"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                />
                <button className="btn-primary" onClick={verifyMfa}>
                  {"Verify"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="mt-4 space-y-2">
          {factors.map((factor) => (
            <div
              key={factor.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <UserRoundCheck size={18} className="text-success" />
                <div>
                  <div className="text-sm font-semibold">
                    {factor.friendly_name ?? "Authenticator"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {factor.status} · {new Date(factor.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button
                className="btn-ghost text-destructive"
                onClick={() => removeFactor(factor.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="surface p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-display">{"Devices and sessions"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {"Sign out unknown devices immediately."}
            </p>
          </div>
          <button className="btn-outline" onClick={() => signOutOthers()}>
            {"Sign out all others"}
          </button>
        </div>
        <div className="mt-4 divide-y divide-border">
          {sessions.map((session) => (
            <div key={session.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {session.platform === "web" ? <Laptop size={19} /> : <Smartphone size={19} />}
                <div>
                  <div className="text-sm font-semibold">{session.device_label}</div>
                  <div className="text-xs text-muted-foreground">
                    {session.assurance_level.toUpperCase()} · {"Last seen"}{" "}
                    {new Date(session.last_seen_at).toLocaleString()}
                  </div>
                </div>
              </div>
              {!session.revoked_at && (
                <button
                  className="btn-ghost text-destructive"
                  onClick={() => signOutOthers(session.id)}
                >
                  {"Revoke"}
                </button>
              )}
            </div>
          ))}
          {!loading && sessions.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">
              {"This device will appear after the next refresh."}
            </p>
          )}
        </div>
      </section>

      <section className="surface p-5 md:p-7">
        <h2 className="text-xl font-display">Privacy rights</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {
            "Requests are recorded and reviewed before execution. Legal retention duties may restrict deletion."
          }
        </p>
        <div className="mt-4 grid md:grid-cols-[220px_1fr_auto] gap-3">
          <select
            className="input"
            value={requestType}
            onChange={(event) => setRequestType(event.target.value)}
          >
            <option value="export">{"Data export"}</option>
            <option value="access">{"Access"}</option>
            <option value="rectification">{"Rectification"}</option>
            <option value="restriction">{"Restriction"}</option>
            <option value="deletion">{"Account deletion"}</option>
            <option value="objection">{"Objection"}</option>
          </select>
          <input
            className="input"
            maxLength={2000}
            value={requestDetails}
            onChange={(event) => setRequestDetails(event.target.value)}
            placeholder={"Optional details"}
          />
          <button className="btn-primary" onClick={submitPrivacyRequest}>
            {"Submit"}
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-xl bg-secondary p-3 flex flex-wrap justify-between gap-2 text-sm"
            >
              <span className="font-semibold">{request.request_type}</span>
              <span>{request.status}</span>
              <span className="text-muted-foreground">
                {"Due"}: {new Date(request.due_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </section>

      {(user?.role === "owner" || user?.role === "manager") && (
        <section className="surface p-5 md:p-7">
          <div className="flex items-center gap-2">
            <LockKeyhole size={20} />
            <h2 className="text-xl font-display">{"Sensitive approvals"}</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {"The requester cannot approve their own request."}
          </p>
          <div className="mt-4 space-y-3">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className="rounded-xl border border-border p-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="font-semibold">{approval.action.replaceAll("_", " ")}</div>
                  <div className="text-sm text-muted-foreground mt-1">{approval.reason}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {"Expires"}: {new Date(approval.expires_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-outline" onClick={() => decide(approval.id, false)}>
                    {"Reject"}
                  </button>
                  <button className="btn-primary" onClick={() => decide(approval.id, true)}>
                    <CheckCircle2 size={15} />
                    {"Approve"}
                  </button>
                </div>
              </div>
            ))}
            {!loading && approvals.length === 0 && (
              <p className="text-sm text-muted-foreground py-3">{"No pending approvals."}</p>
            )}
          </div>
        </section>
      )}

      <button className="btn-ghost" onClick={load} disabled={loading}>
        <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> {"Refresh"}
      </button>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  good,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <div className="surface p-5 flex items-center gap-4">
      <span
        className={`h-11 w-11 rounded-xl grid place-items-center ${good ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground"}`}
      >
        <Icon size={22} />
      </span>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-display">{value}</div>
      </div>
    </div>
  );
}
