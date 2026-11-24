import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";
import { operationalDate } from "@/lib/operational-day";
import { UK_PRODUCT_DISCLAIMER } from "@/lib/uk-compliance";

export const Route = createFileRoute("/app/readiness")({ component: Readiness });

type ReadinessItem = {
  label: string;
  detail: string;
  to: string;
  complete: boolean;
  applicable?: boolean;
  critical?: boolean;
};

type Snapshot = {
  profile: number;
  servesPpds: boolean | null;
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
  servesPpds: null,
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
  if (!user?.organizationId || !user.locationId) {
    return (
      <p className="p-5 text-sm">Select a business location to review its inspection readiness.</p>
    );
  }
  return (
    <SiteReadiness
      key={`${user.id}:${user.organizationId}:${user.locationId}`}
      organizationId={user.organizationId}
      locationId={user.locationId}
    />
  );
}

function SiteReadiness({
  organizationId,
  locationId,
}: {
  organizationId: string;
  locationId: string;
}) {
  const [snapshot, setSnapshot] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestId = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError("");
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const today = operationalDate(new Date(), "Europe/London");
    const count = { count: "exact" as const, head: true };
    try {
      const [profile, safeMethods, diary, temperatures, checks, training, labels, openActions] =
        await Promise.all([
          supabase
            .from("site_compliance_profiles")
            .select("reviewed_at,serves_ppds")
            .eq("organization_id", organizationId)
            .eq("location_id", locationId)
            .maybeSingle(),
          supabase
            .from("site_safe_methods")
            .select("id", count)
            .eq("organization_id", organizationId)
            .eq("location_id", locationId)
            .eq("status", "active"),
          supabase
            .from("daily_diary_entries")
            .select("id", count)
            .eq("organization_id", organizationId)
            .eq("location_id", locationId)
            .eq("diary_date", today)
            .not("signed_off_at", "is", null)
            .not("signed_off_by", "is", null),
          supabase
            .from("temperature_logs")
            .select("id", count)
            .eq("organization_id", organizationId)
            .eq("location_id", locationId)
            .gte("logged_at", since),
          supabase
            .from("checks")
            .select("id", count)
            .eq("organization_id", organizationId)
            .eq("location_id", locationId)
            .eq("status", "completed")
            .gte("completed_at", since),
          supabase
            .from("training_records")
            .select("id", count)
            .eq("organization_id", organizationId)
            .eq("location_id", locationId)
            .not("verified_at", "is", null),
          supabase
            .from("ppds_label_versions")
            .select("id", count)
            .eq("organization_id", organizationId)
            .eq("location_id", locationId),
          supabase
            .from("corrective_actions")
            .select("id", count)
            .eq("organization_id", organizationId)
            .eq("location_id", locationId)
            .not("status", "in", '("verified","closed")'),
        ]);
      if (request !== requestId.current) return;
      if (profile.error) throw profile.error;
      const counts = [safeMethods, diary, temperatures, checks, training, labels, openActions];
      if (counts.some((result) => result.error || result.count === null)) {
        throw new Error("Incomplete readiness evidence");
      }
      setSnapshot({
        profile: profile.data?.reviewed_at ? 1 : 0,
        servesPpds: profile.data?.reviewed_at ? profile.data.serves_ppds : null,
        safeMethods: safeMethods.count ?? 0,
        diary: diary.count ?? 0,
        temperatures: temperatures.count ?? 0,
        checks: checks.count ?? 0,
        training: training.count ?? 0,
        labels: labels.count ?? 0,
        openActions: openActions.count ?? 0,
      });
    } catch {
      if (request !== requestId.current) return;
      setSnapshot(EMPTY);
      setError("Readiness evidence could not be verified. Refresh to try again.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [organizationId, locationId]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
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
        detail: snapshot.diary ? "Signed diary evidence exists today" : "No signed diary today",
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
        detail:
          snapshot.servesPpds === false
            ? "Not applicable to the reviewed site profile"
            : `${snapshot.labels} controlled label version${snapshot.labels === 1 ? "" : "s"}`,
        to: "/app/ppds",
        complete: snapshot.labels > 0,
        applicable: snapshot.servesPpds !== false,
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
  const applicable = items.filter((item) => item.applicable !== false);
  const score = Math.round(
    (applicable.filter((item) => item.complete).length / applicable.length) * 100,
  );
  const unavailable = loading || !!error;
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
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-[15rem_1fr]">
        <div className="surface p-5 flex flex-col justify-center">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Evidence coverage
          </div>
          <div className="mt-2 text-5xl font-black tabular-nums">
            {unavailable ? "—" : `${score}%`}
          </div>
          <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${unavailable ? 0 : score}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {unavailable
              ? "Evidence coverage unavailable"
              : blockers
                ? `${blockers} critical gap${blockers === 1 ? "" : "s"} to address`
                : "No critical gaps detected by these checks"}
          </p>
        </div>

        <div className="surface divide-y overflow-hidden">
          {items.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="flex items-center gap-3 p-4 hover:bg-secondary/50 transition"
            >
              {unavailable || item.applicable === false ? (
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
                <div className="text-xs text-muted-foreground">
                  {unavailable ? "Evidence unavailable" : item.detail}
                </div>
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
