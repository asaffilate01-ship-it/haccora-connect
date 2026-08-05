import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2, Sun, Sunset } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/today")({ component: Today });

type ShiftCounts = {
  checksDone: number;
  checksOpen: number;
  temperatures: number;
  exceptions: number;
  actionsOpen: number;
  incidentsOpen: number;
};

const emptyCounts: ShiftCounts = {
  checksDone: 0,
  checksOpen: 0,
  temperatures: 0,
  exceptions: 0,
  actionsOpen: 0,
  incidentsOpen: 0,
};

function Today() {
  const [counts, setCounts] = useState(emptyCounts);
  const [loading, setLoading] = useState(true);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const since = start.toISOString();

  const load = useCallback(async () => {
    setLoading(true);
    const [checksDone, checksOpen, temperatures, exceptions, actionsOpen, incidentsOpen] =
      await Promise.all([
        supabase
          .from("checks")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("completed_at", since),
        supabase
          .from("checks")
          .select("id", { count: "exact", head: true })
          .neq("status", "completed")
          .gte("created_at", since),
        supabase
          .from("temperature_logs")
          .select("id", { count: "exact", head: true })
          .gte("logged_at", since),
        supabase
          .from("temperature_logs")
          .select("id", { count: "exact", head: true })
          .eq("status", "out_of_range")
          .gte("logged_at", since),
        supabase
          .from("corrective_actions")
          .select("id", { count: "exact", head: true })
          .neq("status", "closed"),
        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .neq("status", "closed"),
      ]);
    setCounts({
      checksDone: checksDone.count ?? 0,
      checksOpen: checksOpen.count ?? 0,
      temperatures: temperatures.count ?? 0,
      exceptions: exceptions.count ?? 0,
      actionsOpen: actionsOpen.count ?? 0,
      incidentsOpen: incidentsOpen.count ?? 0,
    });
    setLoading(false);
  }, [since]);

  useEffect(() => {
    void load();
  }, [load]);

  const needsAttention = counts.exceptions + counts.actionsOpen + counts.incidentsOpen;
  const totalChecks = counts.checksDone + counts.checksOpen;
  const completion = totalChecks ? Math.round((counts.checksDone / totalChecks) * 100) : 0;
  const nextAction = counts.checksOpen
    ? { label: "Complete the next due check", to: "/app/checks" }
    : counts.exceptions
      ? { label: "Resolve temperature exceptions", to: "/app/temperature" }
      : counts.actionsOpen
        ? { label: "Review corrective actions", to: "/app/control-centre" }
        : counts.incidentsOpen
          ? { label: "Review open incidents", to: "/app/incidents" }
          : { label: "Review closing routines", to: "/app/routines" };
  return (
    <div className="p-5 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">TODAY'S SHIFT</div>
          <h1 className="text-3xl mt-1">Open, monitor and close</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            A focused view for kitchen teams. Complete the work in each linked record so the
            evidence remains traceable and inspection-ready.
          </p>
        </div>
        {loading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <div
            className={`surface px-4 py-3 text-sm font-semibold ${needsAttention ? "text-warning-foreground" : "text-success"}`}
          >
            {needsAttention ? `${needsAttention} item(s) need attention` : "No open exceptions"}
          </div>
        )}
      </div>

      <section className="surface p-5 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Next required action
          </div>
          <h2 className="mt-1 text-xl font-bold">{nextAction.label}</h2>
          <div className="mt-4 flex items-center gap-3">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-label="Today's check completion"
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
          <p className="mt-2 text-xs text-muted-foreground">
            {counts.checksDone} completed and {counts.checksOpen} open today. Records are saved to
            your site workspace.
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
