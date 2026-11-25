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
import { operationalDate, operationalDay } from "@/lib/operational-day";

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
  const { user } = useAuth();
  if (!user?.organizationId || !user.locationId) {
    return <p className="p-5 text-sm">Select a business location to see today’s shift.</p>;
  }
  return (
    <SiteToday
      key={`${user.id}:${user.organizationId}:${user.locationId}:${user.role}`}
      organizationId={user.organizationId}
      locationId={user.locationId}
    />
  );
}

function SiteToday({ organizationId, locationId }: { organizationId: string; locationId: string }) {
  const [counts, setCounts] = useState(emptyCounts);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [day, setDay] = useState(() => operationalDate(new Date(), "Europe/London"));
  const [loadedDay, setLoadedDay] = useState("");
  const requestId = useRef(0);
  const available = !loading && !loadError && loadedDay === day;

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setLoadError("");
    const period = operationalDay(new Date(day + "T12:00:00Z"), "Europe/London");
    const count = { count: "exact" as const, head: true };
    try {
      const results = await Promise.all([
        supabase
          .from("checks")
          .select("id", count)
          .eq("organization_id", organizationId)
          .eq("location_id", locationId)
          .eq("status", "completed")
          .gte("created_at", period.start)
          .lt("created_at", period.end),
        supabase
          .from("checks")
          .select("id", count)
          .eq("organization_id", organizationId)
          .eq("location_id", locationId)
          .neq("status", "completed")
          .gte("created_at", period.start)
          .lt("created_at", period.end),
        supabase
          .from("temperature_logs")
          .select("id", count)
          .eq("organization_id", organizationId)
          .eq("location_id", locationId)
          .gte("logged_at", period.start)
          .lt("logged_at", period.end),
        supabase
          .from("temperature_logs")
          .select("id", count)
          .eq("organization_id", organizationId)
          .eq("location_id", locationId)
          .in("status", ["out_of_range", "alert"])
          .gte("logged_at", period.start)
          .lt("logged_at", period.end),
        supabase
          .from("corrective_actions")
          .select("id", count)
          .eq("organization_id", organizationId)
          .eq("location_id", locationId)
          .neq("status", "closed"),
        supabase
          .from("incidents")
          .select("id", count)
          .eq("organization_id", organizationId)
          .eq("location_id", locationId)
          .neq("status", "closed"),
      ]);
      if (request !== requestId.current) return;
      if (results.some((result) => result.error || result.count === null)) {
        throw new Error("Incomplete shift evidence");
      }
      const [checksDone, checksOpen, temperatures, exceptions, actionsOpen, incidentsOpen] =
        results;
      setCounts({
        checksDone: checksDone.count ?? 0,
        checksOpen: checksOpen.count ?? 0,
        temperatures: temperatures.count ?? 0,
        exceptions: exceptions.count ?? 0,
        actionsOpen: actionsOpen.count ?? 0,
        incidentsOpen: incidentsOpen.count ?? 0,
      });
      setLoadedDay(day);
    } catch {
      if (request !== requestId.current) return;
      setCounts(emptyCounts);
      setLoadedDay("");
      setLoadError(
        "Some compliance records could not be loaded. Refresh before making safety decisions.",
      );
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [day, organizationId, locationId]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  useEffect(() => {
    const checkDay = () => setDay(operationalDate(new Date(), "Europe/London"));
    const timer = window.setInterval(checkDay, 60_000);
    window.addEventListener("focus", checkDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkDay);
    };
  }, []);

  const needsAttention = counts.exceptions + counts.actionsOpen + counts.incidentsOpen;
  const totalChecks = counts.checksDone + counts.checksOpen;
  const completion = totalChecks ? Math.round((counts.checksDone / totalChecks) * 100) : null;
  const nextAction = counts.exceptions
    ? { label: "Review temperature exceptions", to: "/app/temperature" }
    : counts.actionsOpen
      ? { label: "Review corrective actions", to: "/app/control-centre" }
      : counts.incidentsOpen
        ? { label: "Review open incidents", to: "/app/incidents" }
        : counts.checksOpen
          ? { label: "Complete the next due check", to: "/app/checks" }
          : { label: "Review closing routines", to: "/app/routines" };
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
            A focused view of records visible at the selected site, using UK calendar days.
            Complete the work in each linked record so the evidence remains traceable.
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
                !available
                  ? "text-destructive"
                  : needsAttention
                    ? "text-warning-foreground"
                    : "text-success"
              }`}
            >
              {!available
                ? "Summary unavailable"
                : needsAttention
                  ? `${needsAttention} records need attention`
                  : "No visible exceptions in this summary"}
            </div>
          </div>
        )}
      </div>

      <section className="surface p-5 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Next required action
          </div>
          <h2 className="mt-1 text-xl font-bold">
            {available ? nextAction.label : "Refresh evidence before reviewing priorities"}
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-label="Today's check completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={available ? (completion ?? undefined) : undefined}
            >
              <div
                className="h-full bg-success transition-all"
                style={{ width: `${available ? (completion ?? 0) : 0}%` }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums">
              {available && completion !== null ? `${completion}%` : "—"}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {available
              ? `${counts.checksDone} completed and ${counts.checksOpen} open, among checks created today.`
              : "Check completion is unavailable until the evidence has loaded."}
          </p>
        </div>
        {available && (
          <Link
            to={nextAction.to as never}
            className="btn-primary px-5 py-3 inline-flex items-center justify-center gap-2 text-sm"
          >
            Start now <ChevronRight size={16} />
          </Link>
        )}
      </section>

      <div className="grid lg:grid-cols-3 gap-4">
        <ShiftCard
          icon={<Sun size={18} />}
          title="1. Open"
          body="Complete opening checks and confirm the premises are ready for service."
          metric={
            available
              ? `${counts.checksDone} completed · ${counts.checksOpen} open`
              : "Evidence unavailable"
          }
          to="/app/checks"
          action="Opening checks"
        />
        <ShiftCard
          icon={<AlertTriangle size={18} />}
          title="2. Monitor service"
          body="Record temperatures and deal with deviations when they occur."
          metric={
            available
              ? `${counts.temperatures} readings · ${counts.exceptions} exception(s)`
              : "Evidence unavailable"
          }
          to="/app/temperature"
          action="Temperature records"
          warning={available && counts.exceptions > 0}
        />
        <ShiftCard
          icon={<Sunset size={18} />}
          title="3. Close"
          body="Resolve open actions, record unusual events and complete closing routines."
          metric={
            available
              ? `${counts.actionsOpen} actions · ${counts.incidentsOpen} incidents open`
              : "Evidence unavailable"
          }
          to="/app/routines"
          action="Closing routines"
          warning={available && counts.actionsOpen + counts.incidentsOpen > 0}
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
