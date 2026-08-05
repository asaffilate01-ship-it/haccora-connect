import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UK_PRODUCT_DISCLAIMER } from "@/lib/uk-compliance";

export const Route = createFileRoute("/app/readiness")({ component: Readiness });

type ReadinessItem = {
  label: string;
  detail: string;
  to: string;
  complete: boolean;
  critical?: boolean;
};

type Snapshot = {
  profile: number;
  safeMethods: number;
  diary: number;
  temperatures: number;
  checks: number;
  training: number;
  labels: number;
  openActions: number;
};

const EMPTY: Snapshot = {
  profile: 0,
  safeMethods: 0,
  diary: 0,
  temperatures: 0,
  checks: 0,
  training: 0,
  labels: 0,
  openActions: 0,
};

function Readiness() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user?.organizationId || !user.locationId) return;
    setLoading(true);
    setError("");
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString().slice(0, 10);
    const count = { count: "exact" as const, head: true };
    const results = await Promise.all([
      supabase
        .from("site_compliance_profiles")
        .select("id", count)
        .eq("organization_id", user.organizationId)
        .eq("location_id", user.locationId),
      supabase
        .from("site_safe_methods")
        .select("id", count)
        .eq("organization_id", user.organizationId)
        .eq("location_id", user.locationId)
        .eq("status", "active"),
      supabase
        .from("daily_diary_entries")
        .select("id", count)
        .eq("organization_id", user.organizationId)
        .eq("location_id", user.locationId)
        .eq("diary_date", today),
      supabase.from("temperature_logs").select("id", count).gte("recorded_at", since),
      supabase.from("checks").select("id", count).eq("status", "done").gte("completed_at", since),
      supabase.from("training_records").select("id", count).not("verified_at", "is", null),
      supabase.from("ppds_label_versions").select("id", count),
      supabase
        .from("corrective_actions")
        .select("id", count)
        .not("status", "in", '("verified","closed")'),
    ]);
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) setError(firstError.message);
    setSnapshot({
      profile: results[0].count ?? 0,
      safeMethods: results[1].count ?? 0,
      diary: results[2].count ?? 0,
      temperatures: results[3].count ?? 0,
      checks: results[4].count ?? 0,
      training: results[5].count ?? 0,
      labels: results[6].count ?? 0,
      openActions: results[7].count ?? 0,
    });
    setLoading(false);
  }, [user?.organizationId, user?.locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<ReadinessItem[]>(
    () => [
      {
        label: "UK compliance profile",
        detail: "Nation, business type and higher-risk service profile reviewed",
        to: "/app/uk-compliance",
        complete: snapshot.profile > 0,
        critical: true,
      },
      {
        label: "Safe methods adopted",
        detail: `${snapshot.safeMethods} adopted method${snapshot.safeMethods === 1 ? "" : "s"}`,
        to: "/app/safe-methods",
        complete: snapshot.safeMethods >= 4,
        critical: true,
      },
      {
        label: "Today's diary signed",
        detail: snapshot.diary ? "A diary record exists for today" : "No diary record for today",
        to: "/app/diary",
        complete: snapshot.diary > 0,
        critical: true,
      },
      {
        label: "Routine evidence",
        detail: `${snapshot.temperatures} temperatures and ${snapshot.checks} completed checks in 7 days`,
        to: "/app/checks",
        complete: snapshot.temperatures > 0 && snapshot.checks > 0,
      },
      {
        label: "Verified staff training",
        detail: `${snapshot.training} verified training record${snapshot.training === 1 ? "" : "s"}`,
        to: "/app/training",
        complete: snapshot.training > 0,
      },
      {
        label: "PPDS label control",
        detail: `${snapshot.labels} controlled label version${snapshot.labels === 1 ? "" : "s"}`,
        to: "/app/ppds",
        complete: snapshot.labels > 0,
      },
      {
        label: "Corrective actions controlled",
        detail: snapshot.openActions
          ? `${snapshot.openActions} action${snapshot.openActions === 1 ? "" : "s"} still open`
          : "No open corrective actions",
        to: "/app/control-centre",
        complete: snapshot.openActions === 0,
        critical: true,
      },
    ],
    [snapshot],
  );
  const score = Math.round((items.filter((item) => item.complete).length / items.length) * 100);
  const blockers = items.filter((item) => item.critical && !item.complete).length;

  return (
    <main className="p-5 md:p-8 max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">UK INSPECTION READINESS</div>
          <h1 className="mt-1">Readiness overview</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            A plain-English operational view of whether this site is keeping its configured food
            safety system active. It is evidence support, not an official food hygiene rating.
          </p>
        </div>
        <button className="btn-ghost-dark text-sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
          Some readiness data could not be loaded: {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-[15rem_1fr]">
        <div className="surface p-5 flex flex-col justify-center">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Evidence coverage
          </div>
          <div className="mt-2 text-5xl font-black tabular-nums">{loading ? "—" : `${score}%`}</div>
          <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-success transition-all" style={{ width: `${score}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {blockers
              ? `${blockers} critical gap${blockers === 1 ? "" : "s"} to address`
              : "No critical gaps detected"}
          </p>
        </div>

        <div className="surface divide-y overflow-hidden">
          {items.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="flex items-center gap-3 p-4 hover:bg-secondary/50 transition"
            >
              {loading ? (
                <CircleDashed className="text-muted-foreground" size={19} />
              ) : item.complete ? (
                <CheckCircle2 className="text-success" size={19} />
              ) : (
                <AlertTriangle
                  className={item.critical ? "text-destructive" : "text-warning"}
                  size={19}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.detail}</div>
              </div>
              <ArrowRight size={15} className="text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      <aside className="rounded-xl border bg-white p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Scope:</strong> {UK_PRODUCT_DISCLAIMER} Readiness rules
        should be validated by a UK food-safety specialist before launch and configured for the
        relevant nation and business type.
      </aside>
    </main>
  );
}
