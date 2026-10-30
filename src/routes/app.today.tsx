import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sun,
  Sunset,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/haccora-client";

import { useAuth } from "@/lib/auth";
import { operationalDay } from "@/lib/operational-day";

export const Route = createFileRoute("/app/today")({ component: Today });

type ShiftCounts = {
  checksDone: number;
  checksOpen: number;
  checksBacklog: number;
  temperatures: number;
  exceptions: number;
  actionsOpen: number;
  incidentsOpen: number;
};

const emptyCounts: ShiftCounts = {
  checksDone: 0,
  checksOpen: 0,
  checksBacklog: 0,
  temperatures: 0,
  exceptions: 0,
  actionsOpen: 0,
  incidentsOpen: 0,
};

function Today() {
  const [counts, setCounts] = useState(emptyCounts);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const locationId = user?.locationId;
  const identity = `${user?.id ?? ""}:${organizationId ?? ""}:${locationId ?? ""}`;
  const activeIdentity = useRef(identity);
  activeIdentity.current = identity;
  const generation = useRef(0);
  const [loadedIdentity, setLoadedIdentity] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const load = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    setLoadError("");
    setLoadedIdentity("");
    if (!organizationId) {
      setLoadError("Select an approved workspace to load the summary.");
      setLoading(false);
      return;
    }
    try {
      const day = operationalDay(new Date(), "Europe/London");
      const query = (table: "checks" | "temperature_logs" | "corrective_actions" | "incidents") => {
        const q = supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId);
        return locationId ? q.eq("location_id", locationId) : q;
      };
      const results = await Promise.all([
        query("checks")
          .eq("status", "completed")
          .gte("created_at", day.start)
          .lt("created_at", day.end),
        query("checks")
          .neq("status", "completed")
          .gte("created_at", day.start)
          .lt("created_at", day.end),
        query("temperature_logs").gte("logged_at", day.start).lt("logged_at", day.end),
        query("temperature_logs")
          .in("status", ["out_of_range", "alert"])
          .gte("logged_at", day.start)
          .lt("logged_at", day.end),
        query("corrective_actions").neq("status", "closed"),
        query("incidents").neq("status", "closed"),
        query("checks").neq("status", "completed").lt("created_at", day.start),
      ]);
      if (generation.current !== version || activeIdentity.current !== identity) return;
      if (
        results.some(
          (result) => result.error || !Number.isInteger(result.count) || result.count! < 0,
        )
      )
        throw Error("Unconfirmed summary");
      const [
        checksDone,
        checksOpen,
        temperatures,
        exceptions,
        actionsOpen,
        incidentsOpen,
        checksBacklog,
      ] = results.map((result) => result.count!);
      setCounts({
        checksDone,
        checksOpen,
        temperatures,
        exceptions,
        actionsOpen,
        incidentsOpen,
        checksBacklog,
      });
      setLoadedIdentity(identity);
      setUpdatedAt(new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }));
    } catch {
      if (generation.current === version && activeIdentity.current === identity)
        setLoadError(
          "Some compliance records could not be loaded. Refresh before making safety decisions.",
        );
    } finally {
      if (generation.current === version && activeIdentity.current === identity) setLoading(false);
    }
  }, [identity, organizationId, locationId]);

  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
    };
  }, [load]);

  const ready = !loading && !loadError && loadedIdentity === identity;
  const needsAttention =
    counts.exceptions +
    counts.actionsOpen +
    counts.incidentsOpen +
    counts.checksOpen +
    counts.checksBacklog;
  const totalChecks = counts.checksDone + counts.checksOpen;
  const completion = totalChecks ? Math.round((counts.checksDone / totalChecks) * 100) : 0;
  const nextAction = counts.exceptions
    ? { label: "Review temperature exceptions", to: "/app/temperature" }
    : counts.actionsOpen
      ? { label: "Review corrective actions", to: "/app/control-centre" }
      : counts.incidentsOpen
        ? { label: "Review open incidents", to: "/app/incidents" }
        : counts.checksOpen + counts.checksBacklog
          ? { label: "Review unfinished checks", to: "/app/checks" }
          : { label: "Review closing routines", to: "/app/routines" };
  const attention = [
    {
      label: "Temperature exceptions recorded today",
      count: counts.exceptions,
      to: "/app/temperature",
    },
    {
      label: "Corrective actions awaiting closure",
      count: counts.actionsOpen,
      to: "/app/control-centre",
    },
    { label: "Open incidents", count: counts.incidentsOpen, to: "/app/incidents" },
    { label: "Unfinished checks created today", count: counts.checksOpen, to: "/app/checks" },
    {
      label: "Unfinished checks from earlier days",
      count: counts.checksBacklog,
      to: "/app/checks",
    },
  ];
  return (
    <div className="p-5 md:p-8 space-y-6">
      {loadError && (
        <div
          role="alert"
          className="surface border border-destructive/40 p-4 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">TODAY'S SHIFT</div>
          <h1 className="text-3xl mt-1">Open, monitor and close</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            A focused view for kitchen teams. Open each linked register to review and complete the
            work.
            {locationId ? " Current site" : " Current organisation"} · records visible to your
            account · Europe/London day.
          </p>
        </div>
        {loading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              aria-label="Refresh today summary"
              className="rounded-lg border border-border p-2"
            >
              <RefreshCw size={17} />
            </button>
            <div
              className={`surface px-4 py-3 text-sm font-semibold ${
                !ready
                  ? "text-destructive"
                  : needsAttention
                    ? "text-warning-foreground"
                    : "text-success"
              }`}
            >
              {!ready
                ? "Summary unavailable"
                : needsAttention
                  ? `${needsAttention} attention signals`
                  : "No attention signals in loaded records"}
            </div>
          </div>
        )}
      </div>

      {!ready && !loadError && <p role="status">Loading the current workspace summary…</p>}
      {ready && (
        <>
          <section className="surface p-5" aria-label="Needs attention">
            <h2 className="text-xl font-bold">Needs attention</h2>
            <p className="text-xs text-muted-foreground mt-2">
              Updated {updatedAt} (London). Signals can refer to the same event; this is not a count
              of unique incidents. Refresh after recording new work.
            </p>
            <ul className="mt-4 divide-y divide-border">
              {attention.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to as never}
                    className="flex items-center justify-between gap-3 py-3 min-h-12"
                  >
                    <span>{item.label}</span>
                    <span className="font-bold tabular-nums">{item.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="surface p-5 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Next required action to review
              </div>
              <h2 className="mt-1 text-xl font-bold">{nextAction.label}</h2>
              {totalChecks > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"
                    role="progressbar"
                    aria-label="Completion of checks created today"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={completion}
                  >
                    <div
                      className="h-full bg-success transition-all"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums">{completion}%</span>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {counts.checksDone} completed and {counts.checksOpen} unfinished checks created
                today. {counts.checksBacklog} unfinished from earlier days. Records are saved to
                your site workspace. No completion percentage is shown when no checks were created
                today.
              </p>
            </div>
            <Link
              to={nextAction.to as never}
              className="btn-primary px-5 py-3 inline-flex items-center justify-center gap-2 text-sm"
            >
              Start now <ChevronRight size={16} />
            </Link>
          </section>

          <div className="grid lg:grid-cols-3 gap-4">
            <ShiftCard
              icon={<Sun size={18} />}
              title="1. Open"
              body="Complete opening checks and confirm the premises are ready for service."
              metric={`${counts.checksDone} completed · ${counts.checksOpen} open`}
              to="/app/checks"
              action="Opening checks"
            />
            <ShiftCard
              icon={<AlertTriangle size={18} />}
              title="2. Monitor service"
              body="Record temperatures and deal with deviations when they occur."
              metric={`${counts.temperatures} readings · ${counts.exceptions} exception(s)`}
              to="/app/temperature"
              action="Temperature records"
              warning={counts.exceptions > 0}
            />
            <ShiftCard
              icon={<Sunset size={18} />}
              title="3. Close"
              body="Resolve open actions, record unusual events and complete closing routines."
              metric={`${counts.actionsOpen} actions · ${counts.incidentsOpen} incidents open`}
              to="/app/routines"
              action="Closing routines"
              warning={counts.actionsOpen + counts.incidentsOpen > 0}
            />
          </div>
        </>
      )}
      <section className="surface p-5">
        <div className="flex items-center gap-2 font-bold">
          <CheckCircle2 size={17} /> End-of-shift review
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <QuickLink to="/app/diary" label="Daily diary" />
          <QuickLink to="/app/control-centre" label="Corrective actions" />
          <QuickLink to="/app/incidents" label="Incidents" />
          <QuickLink to="/app/inspection" label="Evidence pack" />
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        This operational summary is not an official Food Hygiene Rating or a guarantee of legal
        compliance.
      </p>
    </div>
  );
}

function ShiftCard({
  icon,
  title,
  body,
  metric,
  to,
  action,
  warning = false,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  metric: string;
  to: string;
  action: string;
  warning?: boolean;
}) {
  return (
    <article className="surface p-5 flex flex-col min-h-64">
      <div
        className={`h-9 w-9 rounded-lg grid place-items-center ${warning ? "bg-warning/15 text-warning-foreground" : "bg-primary/10 text-primary"}`}
      >
        {icon}
      </div>
      <h2 className="text-lg font-bold mt-4">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2 flex-1">{body}</p>
      <p className="text-xs font-semibold mt-4">{metric}</p>
      <Link
        to={to as never}
        className="btn-primary px-4 py-2 mt-3 inline-flex justify-between items-center text-sm"
      >
        {action}
        <ChevronRight size={15} />
      </Link>
    </article>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to as never}
      className="rounded-lg border border-border px-3 py-3 text-sm font-semibold flex items-center justify-between hover:bg-muted"
    >
      {label}
      <ChevronRight size={14} />
    </Link>
  );
}
