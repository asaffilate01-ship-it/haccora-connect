import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  Database,
  Snowflake,
  Gauge,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  MapPin,
  RefreshCw,
  Save,
  ShieldCheck,
  ServerCog,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { homeFor, useAuth } from "@/lib/auth";
import { PUBLIC_LAUNCH_READINESS } from "@/lib/public-config";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "SaaS owner control plane — Haccora" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformOperations,
});

type Dashboard = {
  generated_at: string;
  financial_access: boolean;
  tenants_total: number;
  tenants_active: number;
  tenants_frozen: number;
  tenants_closed: number;
  locations_active: number;
  members_active: number;
  subscriptions_active: number;
  trials_active: number;
  subscriptions_past_due: number;
  mrr_pence: number;
  arr_pence: number;
  past_due_mrr_pence: number;
  assets_active: number;
  asset_events_30d: number;
  asset_scans_30d: number;
  temperature_logs_30d: number;
  checks_30d: number;
  subscriptions_by_status: Record<string, number>;
  subscriptions_by_plan: Record<string, number>;
};

type Customer = {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  service_status: string;
  service_status_reason: string | null;
  created_at: string;
  active_locations: number;
  active_memberships: number;
  active_assets: number;
  events_30d: number;
  plan: string;
  subscription_status: string;
  seats: number;
  location_limit: number;
  mrr_pence: number | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

type Plan = {
  code: string;
  name: string;
  monthly_price_pence: number | null;
  included_seats: number;
  max_locations: number;
  custom_roles_limit: number;
  active: boolean;
};

type Operator = {
  user_id: string;
  display_name: string;
  email: string;
  role: "platform_owner" | "platform_support" | "platform_auditor";
  status: string;
  created_at: string;
};

type AuditEvent = { id: string; event_type: string; occurred_at: string };

type ReadinessJob = {
  jobName: string;
  lastStatus: string;
  lastSucceededAt: string | null;
  lastFailedAt: string | null;
  lastDurationMs: number | null;
  maximumAgeMinutes: number;
  ageMinutes: number | null;
  overdue: boolean;
};

type PlatformReadiness = {
  status: "configured" | "action_required";
  checkedAt: string;
  operations: {
    status: "healthy" | "degraded";
    jobs: ReadinessJob[];
    queues: {
      notificationDeadLetters: number;
      fileScanDeadLetters: number;
      webhookDeadLetters: number;
    };
  };
  configuration: {
    configuredCount: number;
    totalCount: number;
    items: Array<{ key: string; label: string; configured: boolean }>;
  };
  caveat: string;
};

type MfaFactor = { id: string; status: string };

function PlatformOperations() {
  const { user, hydrated, signOut } = useAuth();
  const canAuditPlatform = user?.platformRole !== "platform_support";
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [readiness, setReadiness] = useState<PlatformReadiness | null>(null);
  const [readinessError, setReadinessError] = useState("");
  const [mfaLevel, setMfaLevel] = useState("aal1");
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([]);
  const [mfaEnrolment, setMfaEnrolment] = useState<{
    id: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantOwnerEmail, setTenantOwnerEmail] = useState("");
  const [tenantLocation, setTenantLocation] = useState("");
  const [tenantPlan, setTenantPlan] = useState("trial");
  const [operatorName, setOperatorName] = useState("");
  const [operatorEmail, setOperatorEmail] = useState("");
  const [operatorRole, setOperatorRole] = useState<Operator["role"]>("platform_support");

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/platform" } as never, replace: true });
    } else if (!user.platformRole) navigate({ to: homeFor(user.role) as never, replace: true });
  }, [hydrated, navigate, user]);

  const load = useCallback(async () => {
    if (!user?.platformRole) return;
    setLoading(true);
    setError("");
    const [
      dashboardResult,
      customersResult,
      plansResult,
      operatorsResult,
      auditResult,
      readinessResult,
      assuranceResult,
      factorsResult,
    ] = await Promise.all([
      (supabase as any).rpc("get_platform_dashboard"),
      (supabase as any).rpc("get_platform_customers_v2"),
      (supabase as any).rpc("get_platform_plans"),
      canAuditPlatform
        ? (supabase as any).rpc("get_platform_operators")
        : Promise.resolve({ data: [], error: null }),
      canAuditPlatform
        ? (supabase as any)
            .from("platform_audit_events")
            .select("id,event_type,occurred_at")
            .order("occurred_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null }),
      canAuditPlatform
        ? supabase.functions.invoke("platform-readiness", { body: {} })
        : Promise.resolve({ data: null, error: null }),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    const failure =
      dashboardResult.error ||
      customersResult.error ||
      plansResult.error ||
      operatorsResult.error ||
      auditResult.error;
    if (failure)
      setError(failure.message ?? "The audited platform control plane could not be loaded.");
    else {
      setDashboard(dashboardResult.data as Dashboard);
      setCustomers((customersResult.data ?? []) as Customer[]);
      setPlans((plansResult.data ?? []) as Plan[]);
      setOperators((operatorsResult.data ?? []) as Operator[]);
      setAuditEvents((auditResult.data ?? []) as AuditEvent[]);
    }
    if (readinessResult.error) {
      setReadiness(null);
      setReadinessError(
        "Launch telemetry is unavailable until the platform-readiness function is deployed.",
      );
    } else {
      setReadiness((readinessResult.data ?? null) as PlatformReadiness | null);
      setReadinessError("");
    }
    setMfaLevel(assuranceResult.data?.currentLevel ?? "aal1");
    setMfaFactors((factorsResult.data?.totp ?? []) as MfaFactor[]);
    setLoading(false);
  }, [canAuditPlatform, user?.platformRole]);

  useEffect(() => {
    void load();
  }, [load]);

  const owner = user?.platformRole === "platform_owner";
  const financialAccess = dashboard?.financial_access === true;
  const totalEvidence = useMemo(
    () =>
      (dashboard?.asset_events_30d ?? 0) +
      (dashboard?.temperature_logs_30d ?? 0) +
      (dashboard?.checks_30d ?? 0),
    [dashboard],
  );
  const publicSignals = useMemo(
    () => [
      {
        label: "Statutory company identity",
        ready: PUBLIC_LAUNCH_READINESS.legalIdentityComplete,
      },
      { label: "UK legal content approved", ready: PUBLIC_LAUNCH_READINESS.legalPublishReady },
      { label: "Customer support service", ready: PUBLIC_LAUNCH_READINESS.supportConfigured },
      { label: "Public status service", ready: PUBLIC_LAUNCH_READINESS.statusConfigured },
      { label: "Browser push public key", ready: PUBLIC_LAUNCH_READINESS.browserPushConfigured },
    ],
    [],
  );
  const publicReadyCount = publicSignals.filter((signal) => signal.ready).length;
  const deadLetterCount = readiness
    ? Object.values(readiness.operations.queues).reduce((sum, count) => sum + count, 0)
    : 0;
  const launchConfigurationReady =
    readiness?.status === "configured" &&
    publicReadyCount === publicSignals.length &&
    mfaLevel === "aal2";

  const startMfa = async () => {
    setBusy("mfa-enrol");
    setError("");
    const { data, error: enrolError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Haccora platform ${new Date().toLocaleDateString("en-GB")}`,
    });
    setBusy("");
    if (enrolError || !data.totp) {
      setError(enrolError?.message ?? "MFA enrolment could not be started.");
      return;
    }
    setMfaEnrolment({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verifyMfa = async () => {
    if (!/^\d{6}$/.test(mfaCode)) {
      setError("Enter the six-digit code from your authenticator app.");
      return;
    }
    const factorId =
      mfaEnrolment?.id ?? mfaFactors.find((factor) => factor.status === "verified")?.id;
    if (!factorId) {
      setError("Enrol an authenticator before attempting MFA verification.");
      return;
    }
    setBusy("mfa-verify");
    setError("");
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError || !challenge) {
      setBusy("");
      setError(challengeError?.message ?? "MFA challenge could not be created.");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: mfaCode,
    });
    setBusy("");
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    setMfaCode("");
    setMfaEnrolment(null);
    setNotice("MFA step-up completed. Governed SaaS-owner actions are now enabled.");
    await load();
  };

  const requireMfa = () => {
    if (mfaLevel === "aal2") return true;
    setError("MFA step-up is required before changing tenants, subscriptions or SaaS staff.");
    return false;
  };

  const createTenant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requireMfa()) return;
    setBusy("tenant-create");
    setError("");
    const { error: createError } = await supabase.functions.invoke("platform-admin", {
      body: {
        action: "create_tenant",
        businessName: tenantName.trim(),
        ownerEmail: tenantOwnerEmail.trim(),
        locationName: tenantLocation.trim(),
        plan: tenantPlan,
      },
    });
    setBusy("");
    if (createError) setError(createError.message);
    else {
      setTenantName("");
      setTenantOwnerEmail("");
      setTenantLocation("");
      setNotice("Tenant created and its owner received a secure authentication invitation.");
      await load();
    }
  };

  const inviteOperator = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requireMfa()) return;
    setBusy("operator-create");
    setError("");
    const { error: inviteError } = await supabase.functions.invoke("platform-admin", {
      body: {
        action: "invite_operator",
        email: operatorEmail.trim(),
        displayName: operatorName.trim(),
        role: operatorRole,
      },
    });
    setBusy("");
    if (inviteError) setError(inviteError.message);
    else {
      setOperatorName("");
      setOperatorEmail("");
      setNotice("Platform staff invitation sent and the operator assignment was audit logged.");
      await load();
    }
  };

  const manageTenant = async (
    customer: Customer,
    action: "freeze" | "unfreeze" | "close" | "subscription",
    subscription?: { plan: string; seats: number; locations: number; mrr: number; status: string },
  ) => {
    if (!requireMfa()) return;
    const reason = window.prompt(
      `Reason for ${action.replace("subscription", "subscription change")}:`,
    );
    if (!reason || reason.trim().length < 4) return;
    if (
      action === "close" &&
      !window.confirm("Close this tenant? Data is retained, but all tenant access is blocked.")
    )
      return;
    setBusy(customer.organization_id);
    setError("");
    const { error: actionError } = await (supabase as any).rpc("platform_manage_tenant", {
      p_organization_id: customer.organization_id,
      p_action: action,
      p_reason: reason.trim(),
      p_plan: subscription?.plan ?? null,
      p_seats: subscription?.seats ?? null,
      p_location_limit: subscription?.locations ?? null,
      p_contract_mrr_pence: subscription?.mrr ?? null,
      p_subscription_status: subscription?.status ?? null,
    });
    setBusy("");
    if (actionError) setError(actionError.message);
    else {
      setNotice(
        `${customer.organization_name}: ${action} completed with an immutable platform audit event.`,
      );
      await load();
    }
  };

  const manageOperator = async (operator: Operator, status: string) => {
    if (!requireMfa()) return;
    const reason = window.prompt(`Reason for changing ${operator.display_name} to ${status}:`);
    if (!reason || reason.trim().length < 4) return;
    setBusy(operator.user_id);
    const { error: operatorError } = await (supabase as any).rpc("platform_manage_operator", {
      p_user_id: operator.user_id,
      p_role: operator.role,
      p_status: status,
      p_reason: reason.trim(),
    });
    setBusy("");
    if (operatorError) setError(operatorError.message);
    else await load();
  };

  if (!hydrated || !user?.platformRole)
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-secondary/35 text-foreground">
      <header className="border-b border-white/10 bg-black text-white">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-4 px-4 py-3 md:px-8">
          <BrandLogo imgClassName="h-10 w-auto" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold">{user.name}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                {user.platformRole.replace("platform_", "SaaS ")}
              </div>
            </div>
            <button
              onClick={() => void signOut().then(() => navigate({ to: "/login" }))}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-bold"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 md:px-8 md:py-9">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Haccora service operations</div>
            <h1 className="mt-1 text-2xl md:text-3xl">SaaS owner control plane</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Financial, subscription, tenant lifecycle and usage oversight. Tenant food-safety
              evidence remains isolated behind tenant RLS.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="btn-alert-solid min-h-11 text-sm"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </header>

        {error && (
          <div role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl bg-success/10 p-4 text-sm text-success"
          >
            <CheckCircle2 size={16} /> {notice}
          </div>
        )}

        {canAuditPlatform && (
          <section className="surface overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5 md:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <ServerCog size={20} />
                  <h2 className="font-display text-xl">Launch centre</h2>
                </div>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  Protected environment, scheduler, queue, legal-channel and operator-security
                  signals. Configuration is not proof that a provider or accountable review has
                  passed.
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                  launchConfigurationReady
                    ? "bg-success/10 text-success"
                    : "bg-warning/15 text-warning-foreground"
                }`}
              >
                {launchConfigurationReady ? "Configured for evidence" : "Action required"}
              </span>
            </div>

            {readinessError && (
              <div className="m-5 rounded-xl bg-warning/15 p-4 text-sm text-warning-foreground">
                {readinessError}
              </div>
            )}

            <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4 md:p-6">
              <ReadinessMetric
                label="Scheduled operations"
                value={
                  readiness
                    ? `${readiness.operations.jobs.filter((job) => !job.overdue).length}/4`
                    : "—"
                }
                detail={`${deadLetterCount} dead letters`}
                ready={readiness?.operations.status === "healthy"}
              />
              <ReadinessMetric
                label="Server configuration"
                value={
                  readiness
                    ? `${readiness.configuration.configuredCount}/${readiness.configuration.totalCount}`
                    : "—"
                }
                detail="Presence only · verification required"
                ready={readiness?.status === "configured"}
              />
              <ReadinessMetric
                label="Public and legal"
                value={`${publicReadyCount}/${publicSignals.length}`}
                detail="Identity, approval and service channels"
                ready={publicReadyCount === publicSignals.length}
              />
              <ReadinessMetric
                label="Operator assurance"
                value={mfaLevel.toUpperCase()}
                detail="AAL2 required for governed changes"
                ready={mfaLevel === "aal2"}
              />
            </div>

            <div className="grid border-t border-border xl:grid-cols-3">
              <div className="p-5 md:p-6 xl:border-r xl:border-border">
                <h3 className="text-sm font-black">Scheduler and queue evidence</h3>
                <div className="mt-3 space-y-2">
                  {readiness?.operations.jobs.map((job) => (
                    <SignalRow
                      key={job.jobName}
                      label={job.jobName.replaceAll("-", " ")}
                      ready={!job.overdue}
                      detail={
                        job.ageMinutes === null
                          ? "No successful run"
                          : `${job.ageMinutes} min ago · limit ${job.maximumAgeMinutes}`
                      }
                    />
                  ))}
                  {!readiness && <EmptySignal />}
                </div>
              </div>
              <div className="border-t border-border p-5 md:p-6 xl:border-r xl:border-t-0">
                <h3 className="text-sm font-black">Production configuration</h3>
                <div className="mt-3 space-y-2">
                  {readiness?.configuration.items.map((item) => (
                    <SignalRow
                      key={item.key}
                      label={item.label}
                      ready={item.configured}
                      detail={item.configured ? "Configured · test evidence due" : "Not configured"}
                    />
                  ))}
                  {!readiness && <EmptySignal />}
                </div>
              </div>
              <div className="border-t border-border p-5 md:p-6 xl:border-t-0">
                <h3 className="text-sm font-black">Public launch controls</h3>
                <div className="mt-3 space-y-2">
                  {publicSignals.map((signal) => (
                    <SignalRow
                      key={signal.label}
                      label={signal.label}
                      ready={signal.ready}
                      detail={signal.ready ? "Configured" : "Required before publication"}
                    />
                  ))}
                </div>
              </div>
            </div>

            {owner && mfaLevel !== "aal2" && (
              <div className="border-t border-border bg-secondary/35 p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-black">
                      <KeyRound size={17} /> Secure SaaS-owner actions
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Tenant lifecycle, subscription and SaaS staff changes fail closed until this
                      session reaches AAL2 with a TOTP authenticator.
                    </p>
                  </div>
                  {mfaFactors.every((factor) => factor.status !== "verified") && !mfaEnrolment && (
                    <button
                      onClick={() => void startMfa()}
                      disabled={busy === "mfa-enrol"}
                      className="btn-secondary min-h-11 text-sm"
                    >
                      {busy === "mfa-enrol" ? (
                        <Loader2 className="animate-spin" size={15} />
                      ) : (
                        <KeyRound size={15} />
                      )}{" "}
                      Enrol authenticator
                    </button>
                  )}
                </div>
                {mfaEnrolment && (
                  <div className="mt-4 grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[150px_1fr]">
                    <img
                      src={mfaEnrolment.qr}
                      alt="Authenticator enrolment QR code"
                      className="h-36 w-36 rounded-lg bg-white p-2"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold">Scan with your authenticator app</div>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        Manual key: {mfaEnrolment.secret}
                      </p>
                    </div>
                  </div>
                )}
                {(mfaEnrolment || mfaFactors.some((factor) => factor.status === "verified")) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <input
                      aria-label="Six-digit authenticator code"
                      className="field max-w-48"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(event) =>
                        setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="Six-digit code"
                    />
                    <button
                      onClick={() => void verifyMfa()}
                      disabled={busy === "mfa-verify" || mfaCode.length !== 6}
                      className="btn-alert-solid min-h-11 text-sm"
                    >
                      {busy === "mfa-verify" ? (
                        <Loader2 className="animate-spin" size={15} />
                      ) : (
                        <ShieldCheck size={15} />
                      )}{" "}
                      Verify and unlock
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section
          aria-label="Commercial metrics"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        >
          {financialAccess ? (
            <Metric
              icon={Banknote}
              label="MRR"
              value={money(dashboard?.mrr_pence)}
              detail={`${money(dashboard?.arr_pence)} ARR`}
            />
          ) : (
            <Metric
              icon={Building2}
              label="All tenants"
              value={dashboard?.tenants_total}
              detail="Support view"
            />
          )}
          <Metric
            icon={CreditCard}
            label="Paid subscriptions"
            value={dashboard?.subscriptions_active}
            detail={`${dashboard?.trials_active ?? 0} trials`}
          />
          <Metric
            icon={Building2}
            label="Active tenants"
            value={dashboard?.tenants_active}
            detail={`${dashboard?.tenants_frozen ?? 0} frozen`}
          />
          <Metric
            icon={MapPin}
            label="Premises"
            value={dashboard?.locations_active}
            detail="Active UK sites"
          />
          <Metric
            icon={Users}
            label="Tenant users"
            value={dashboard?.members_active}
            detail="Active memberships"
          />
          <Metric
            icon={Activity}
            label="Evidence volume"
            value={totalEvidence}
            detail="Last 30 days"
          />
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="surface p-5">
            <div className="flex items-center gap-2">
              <Gauge size={20} />
              <h2 className="font-display text-xl">Product volume</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SmallMetric label="Active assets" value={dashboard?.assets_active} />
              <SmallMetric label="QR scans · 30d" value={dashboard?.asset_scans_30d} />
              <SmallMetric label="Asset records · 30d" value={dashboard?.asset_events_30d} />
              <SmallMetric
                label="Compliance logs · 30d"
                value={(dashboard?.temperature_logs_30d ?? 0) + (dashboard?.checks_30d ?? 0)}
              />
            </div>
          </section>
          <section className="surface p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole size={20} />
              <h2 className="font-display text-xl">
                {financialAccess ? "Revenue risk" : "Support access"}
              </h2>
            </div>
            {financialAccess ? (
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-2xl font-black">{money(dashboard?.past_due_mrr_pence)}</div>
                  <div className="text-xs text-muted-foreground">Past-due monthly value</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black">
                    {dashboard?.subscriptions_past_due ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Past-due accounts</div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Revenue and operator audit data are restricted to SaaS owners and auditors.
              </p>
            )}
          </section>
        </div>

        {owner && (
          <section className="surface p-5">
            <div className="flex items-center gap-2">
              <UserPlus size={19} />
              <h2 className="font-display text-xl">Add tenant</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Creates a UK workspace, first premises, subscription limits and secure owner
              invitation as one governed operation.
            </p>
            <form
              onSubmit={createTenant}
              className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1.2fr_1fr_10rem_auto]"
            >
              <input
                required
                minLength={2}
                className="field"
                value={tenantName}
                onChange={(event) => setTenantName(event.target.value)}
                placeholder="Business name"
              />
              <input
                required
                type="email"
                className="field"
                value={tenantOwnerEmail}
                onChange={(event) => setTenantOwnerEmail(event.target.value)}
                placeholder="owner@business.co.uk"
              />
              <input
                required
                minLength={2}
                className="field"
                value={tenantLocation}
                onChange={(event) => setTenantLocation(event.target.value)}
                placeholder="First premises"
              />
              <select
                className="field"
                value={tenantPlan}
                onChange={(event) => setTenantPlan(event.target.value)}
              >
                {plans
                  .filter((plan) => plan.active)
                  .map((plan) => (
                    <option value={plan.code} key={plan.code}>
                      {plan.name}
                    </option>
                  ))}
              </select>
              <button
                disabled={busy === "tenant-create"}
                className="btn-alert-solid min-h-11 text-sm"
              >
                {busy === "tenant-create" ? (
                  <Loader2 className="animate-spin" size={15} />
                ) : (
                  <Building2 size={15} />
                )}{" "}
                Create tenant
              </button>
            </form>
          </section>
        )}

        <section className="surface overflow-hidden">
          <div className="border-b border-border p-5">
            <h2 className="font-display text-xl">Tenants & subscriptions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Freeze is immediate and fail-closed. Close is a retained soft closure, not destructive
              deletion.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-xs">
              <thead className="bg-secondary/60 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Tenant</th>
                  <th className="px-3 py-3">Lifecycle</th>
                  <th className="px-3 py-3">Subscription</th>
                  <th className="px-3 py-3">MRR</th>
                  <th className="px-3 py-3">Volume</th>
                  <th className="px-3 py-3">Limits</th>
                  <th className="px-5 py-3">Governed actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((customer) => (
                  <CustomerRow
                    key={customer.organization_id}
                    customer={customer}
                    plans={plans}
                    owner={owner}
                    financialAccess={financialAccess}
                    busy={busy === customer.organization_id}
                    onAction={manageTenant}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {canAuditPlatform && (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <section className="surface p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={19} />
                <h2 className="font-display text-xl">SaaS staff</h2>
              </div>
              <div className="mt-4 space-y-2">
                {operators.map((operator) => (
                  <div
                    key={operator.user_id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{operator.display_name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {operator.email} · {operator.role.replace("platform_", "")}
                      </div>
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs font-bold capitalize">
                      {operator.status}
                    </span>
                    {owner && operator.user_id !== user.id && (
                      <button
                        disabled={busy === operator.user_id}
                        onClick={() =>
                          void manageOperator(
                            operator,
                            operator.status === "active" ? "suspended" : "active",
                          )
                        }
                        className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
                      >
                        {operator.status === "active" ? "Suspend" : "Activate"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {owner && (
                <form
                  onSubmit={inviteOperator}
                  className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_11rem_auto]"
                >
                  <input
                    required
                    className="field"
                    minLength={2}
                    value={operatorName}
                    onChange={(event) => setOperatorName(event.target.value)}
                    placeholder="Full name"
                  />
                  <input
                    required
                    className="field"
                    type="email"
                    value={operatorEmail}
                    onChange={(event) => setOperatorEmail(event.target.value)}
                    placeholder="staff@haccora.co.uk"
                  />
                  <select
                    className="field"
                    value={operatorRole}
                    onChange={(event) => setOperatorRole(event.target.value as Operator["role"])}
                  >
                    <option value="platform_support">Support</option>
                    <option value="platform_auditor">Auditor</option>
                    <option value="platform_owner">Owner</option>
                  </select>
                  <button
                    disabled={busy === "operator-create"}
                    className="btn-secondary min-h-11 text-sm"
                  >
                    <UserPlus size={14} /> Invite
                  </button>
                </form>
              )}
            </section>
            <section className="surface p-5">
              <div className="flex items-center gap-2">
                <Database size={19} />
                <h2 className="font-display text-xl">Recent platform audit</h2>
              </div>
              <div className="mt-4 space-y-2">
                {auditEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-xs"
                  >
                    <span className="font-semibold capitalize">
                      {event.event_type.replaceAll("_", " ")}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(event.occurred_at).toLocaleString("en-GB")}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function CustomerRow({
  customer,
  plans,
  owner,
  financialAccess,
  busy,
  onAction,
}: {
  customer: Customer;
  plans: Plan[];
  owner: boolean;
  financialAccess: boolean;
  busy: boolean;
  onAction: (
    customer: Customer,
    action: "freeze" | "unfreeze" | "close" | "subscription",
    subscription?: { plan: string; seats: number; locations: number; mrr: number; status: string },
  ) => Promise<void>;
}) {
  const [plan, setPlan] = useState(customer.plan);
  const [seats, setSeats] = useState(String(customer.seats));
  const [locations, setLocations] = useState(String(customer.location_limit));
  const [mrr, setMrr] = useState(
    financialAccess ? ((customer.mrr_pence ?? 0) / 100).toFixed(2) : "",
  );
  const [status, setStatus] = useState(customer.subscription_status);
  return (
    <tr>
      <td className="px-5 py-4">
        <div className="font-semibold text-sm">{customer.organization_name}</div>
        <div className="mt-0.5 text-muted-foreground">{customer.organization_slug}</div>
      </td>
      <td className="px-3 py-4">
        <span
          className={`rounded-full px-2.5 py-1 font-bold capitalize ${customer.service_status === "active" ? "bg-success/10 text-success" : customer.service_status === "frozen" ? "bg-warning/15 text-warning-foreground" : "bg-destructive/10 text-destructive"}`}
        >
          {customer.service_status}
        </span>
        {customer.service_status_reason && (
          <div className="mt-2 max-w-44 text-[10px] text-muted-foreground">
            {customer.service_status_reason}
          </div>
        )}
      </td>
      <td className="px-3 py-4">
        <div className="grid gap-1">
          <select
            disabled={!owner}
            className="rounded border border-border bg-card px-2 py-1.5"
            value={plan}
            onChange={(event) => {
              const next = event.target.value;
              setPlan(next);
              const selected = plans.find((item) => item.code === next);
              if (selected) {
                setSeats(String(selected.included_seats));
                setLocations(String(selected.max_locations));
                setMrr(((selected.monthly_price_pence ?? 0) / 100).toFixed(2));
              }
            }}
          >
            {plans.map((item) => (
              <option value={item.code} key={item.code}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            disabled={!owner}
            className="rounded border border-border bg-card px-2 py-1.5"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {["trialing", "active", "past_due", "canceled", "unpaid", "paused"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-3 py-4">
        {financialAccess ? (
          <div className="flex items-center">
            <span>£</span>
            <input
              disabled={!owner}
              className="w-20 rounded border border-border bg-card px-2 py-1.5"
              inputMode="decimal"
              value={mrr}
              onChange={(event) => setMrr(event.target.value)}
            />
          </div>
        ) : (
          <span className="text-muted-foreground">Restricted</span>
        )}
      </td>
      <td className="px-3 py-4">
        <div>{customer.active_memberships} users</div>
        <div>{customer.active_locations} sites</div>
        <div>{customer.active_assets} assets</div>
        <div>{customer.events_30d} records · 30d</div>
      </td>
      <td className="px-3 py-4">
        <div className="space-y-1">
          <label className="flex items-center gap-1">
            Seats{" "}
            <input
              disabled={!owner}
              className="w-16 rounded border border-border bg-card px-2 py-1"
              value={seats}
              onChange={(event) => setSeats(event.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="flex items-center gap-1">
            Sites{" "}
            <input
              disabled={!owner}
              className="w-16 rounded border border-border bg-card px-2 py-1"
              value={locations}
              onChange={(event) => setLocations(event.target.value)}
              inputMode="numeric"
            />
          </label>
        </div>
      </td>
      <td className="px-5 py-4">
        {owner ? (
          <div className="flex flex-wrap gap-1.5">
            <button
              disabled={busy}
              onClick={() =>
                void onAction(customer, "subscription", {
                  plan,
                  seats: Number(seats),
                  locations: Number(locations),
                  mrr: Math.round(Number(mrr) * 100),
                  status,
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 font-bold"
            >
              <Save size={12} /> Save plan
            </button>
            {customer.service_status === "active" ? (
              <button
                disabled={busy}
                onClick={() => void onAction(customer, "freeze")}
                className="inline-flex items-center gap-1 rounded-lg bg-warning/15 px-2.5 py-2 font-bold"
              >
                <Snowflake size={12} /> Freeze
              </button>
            ) : customer.service_status === "frozen" ? (
              <button
                disabled={busy}
                onClick={() => void onAction(customer, "unfreeze")}
                className="inline-flex items-center gap-1 rounded-lg bg-success/10 px-2.5 py-2 font-bold text-success"
              >
                <CheckCircle2 size={12} /> Unfreeze
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => void onAction(customer, "unfreeze")}
                className="inline-flex items-center gap-1 rounded-lg bg-success/10 px-2.5 py-2 font-bold text-success"
              >
                <CheckCircle2 size={12} /> Restore
              </button>
            )}
            <button
              disabled={busy || customer.service_status === "closed"}
              onClick={() => void onAction(customer, "close")}
              className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-2 font-bold text-destructive"
            >
              <XCircle size={12} /> Close
            </button>
          </div>
        ) : (
          <span className="text-muted-foreground">Read only</span>
        )}
      </td>
    </tr>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Building2;
  label: string;
  value?: string | number;
  detail: string;
}) {
  return (
    <div className="surface p-4">
      <Icon size={18} className="text-primary" />
      <div className="mt-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-black">{value ?? "—"}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}
function SmallMetric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-black">{value ?? "—"}</div>
    </div>
  );
}

function ReadinessMetric({
  label,
  value,
  detail,
  ready,
}: {
  label: string;
  value: string;
  detail: string;
  ready: boolean;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {ready ? (
          <CheckCircle2 size={16} className="shrink-0 text-success" />
        ) : (
          <AlertTriangle size={16} className="shrink-0 text-warning" />
        )}
      </div>
      <div className="mt-2 text-xl font-black">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function SignalRow({ label, detail, ready }: { label: string; detail: string; ready: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-secondary/50 p-2.5">
      {ready ? (
        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" />
      ) : (
        <XCircle size={15} className="mt-0.5 shrink-0 text-destructive" />
      )}
      <div className="min-w-0">
        <div className="text-xs font-bold capitalize">{label}</div>
        <div className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

function EmptySignal() {
  return (
    <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
      Deploy the protected readiness function to load this evidence.
    </div>
  );
}

function money(pence?: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format((pence ?? 0) / 100);
}
