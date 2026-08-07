import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { homeFor, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "Platform operations — Haccora" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformOperations,
});

type PlatformOverview = {
  generated_at: string;
  organizations_total: number;
  locations_active: number;
  memberships_active: number;
  subscriptions_active: number;
  trials_active: number;
  subscriptions_by_status: Record<string, number>;
};

type PlatformCustomer = {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  active_locations: number;
  active_memberships: number;
  plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

type PlatformAuditEvent = {
  id: string;
  event_type: string;
  occurred_at: string;
};

function PlatformOperations() {
  const { user, hydrated, signOut } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [customers, setCustomers] = useState<PlatformCustomer[]>([]);
  const [auditEvents, setAuditEvents] = useState<PlatformAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/platform" } as never, replace: true });
      return;
    }
    if (!user.platformRole) {
      navigate({ to: homeFor(user.role) as never, replace: true });
    }
  }, [hydrated, navigate, user]);

  const load = useCallback(async () => {
    if (!user?.platformRole) return;
    setLoading(true);
    setError(null);
    const [overviewResult, customerResult] = await Promise.all([
      (supabase as any).rpc("get_platform_overview"),
      (supabase as any).rpc("get_platform_customers"),
    ]);
    const auditResult = await (supabase as any)
      .from("platform_audit_events")
      .select("id,event_type,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(8);
    if (overviewResult.error || customerResult.error || auditResult.error) {
      setError("The audited platform overview could not be loaded.");
    } else {
      setOverview(overviewResult.data as PlatformOverview);
      setCustomers((customerResult.data ?? []) as PlatformCustomer[]);
      setAuditEvents((auditResult.data ?? []) as PlatformAuditEvent[]);
    }
    setLoading(false);
  }, [user?.platformRole]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!hydrated || !user?.platformRole) {
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/40">
        <Loader2 className="animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  const roleLabel = user.platformRole.replace("platform_", "").replace("_", " ");

  return (
    <div className="min-h-screen bg-secondary/35 text-foreground">
      <header className="border-b border-border bg-black text-white">
        <div className="mx-auto flex min-h-16 max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-8">
          <BrandLogo imgClassName="h-10 w-auto" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold">{user.name}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                SaaS {roleLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void signOut().then(() => navigate({ to: "/login" }))}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-bold hover:bg-white/10"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 md:px-8 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Haccora service operations</div>
            <h1 className="mt-1 text-3xl md:text-4xl">Platform overview</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
              Audited service-level totals for running Haccora. Customer food-safety records remain
              behind tenant RLS and are not available from this console.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <section aria-label="Platform totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            icon={Building2}
            label="Customer workspaces"
            value={overview?.organizations_total}
          />
          <Metric icon={MapPin} label="Active premises" value={overview?.locations_active} />
          <Metric icon={Users} label="Active tenant users" value={overview?.memberships_active} />
          <Metric
            icon={CreditCard}
            label="Active subscriptions"
            value={overview?.subscriptions_active}
          />
          <Metric icon={Activity} label="Active trials" value={overview?.trials_active} />
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="surface p-5 md:p-7">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-success" size={22} />
              <div>
                <h2 className="font-display text-xl">Protected operator boundary</h2>
                <p className="text-sm text-muted-foreground">Designed for UK SaaS operations</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                "Platform access is assigned out of band; public sign-up and tenant admins cannot grant it.",
                "Opening this overview creates a server-timestamped platform audit event.",
                "Platform status does not bypass tenant RLS or provide hidden impersonation.",
                "Customer support access needs a separate approved, time-limited workflow before launch.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={16} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface p-5 md:p-7">
            <h2 className="font-display text-xl">Subscription status</h2>
            <div className="mt-4 space-y-2">
              {Object.entries(overview?.subscriptions_by_status ?? {}).length ? (
                Object.entries(overview?.subscriptions_by_status ?? {}).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                  >
                    <span className="text-sm font-semibold capitalize">
                      {status.replace("_", " ")}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-black">
                      {count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No subscription records yet.</p>
              )}
            </div>
            {overview?.generated_at && (
              <p className="mt-4 text-xs text-muted-foreground">
                Generated {new Date(overview.generated_at).toLocaleString("en-GB")}
              </p>
            )}
          </section>
        </div>

        <section className="surface overflow-hidden">
          <div className="border-b border-border p-5 md:px-7">
            <h2 className="font-display text-xl">Customer accounts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Business, site and subscription metadata only. No food-safety evidence or staff PII.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-secondary/60 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 md:px-7">Customer</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Premises</th>
                  <th className="px-5 py-3">Users</th>
                  <th className="px-5 py-3">Trial / period end</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((customer) => (
                  <tr key={customer.organization_id}>
                    <td className="px-5 py-4 md:px-7">
                      <div className="font-semibold">{customer.organization_name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {customer.organization_slug}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold capitalize">{customer.plan}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold capitalize">
                        {customer.subscription_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">{customer.active_locations}</td>
                    <td className="px-5 py-4">{customer.active_memberships}</td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {customer.trial_ends_at || customer.current_period_end
                        ? new Date(
                            customer.trial_ends_at ?? customer.current_period_end!,
                          ).toLocaleDateString("en-GB")
                        : "Not set"}
                    </td>
                  </tr>
                ))}
                {!customers.length && !loading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                      No customer accounts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface p-5 md:p-7">
          <h2 className="font-display text-xl">Recent platform access</h2>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {auditEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <span className="text-sm font-semibold">
                  {event.event_type.replaceAll("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.occurred_at).toLocaleString("en-GB")}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number | undefined;
}) {
  return (
    <div className="surface p-4 md:p-5">
      <Icon size={18} className="text-primary" />
      <div className="mt-3 font-display text-3xl">{value ?? "—"}</div>
      <div className="mt-1 text-xs font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}
