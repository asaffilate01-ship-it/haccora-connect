import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Lightbulb,
  Loader2,
  ShieldCheck,
  Thermometer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/haccora-client";

export const Route = createFileRoute("/app/coach")({ component: ComplianceCoach });

type Action = {
  id: string;
  label: string;
  detail: string;
  to: string;
  priority: number;
  tone: "urgent" | "attention" | "good";
};

type CoachData = {
  openChecks: number;
  completedChecks: string[];
  openActions: Array<{ id: string; description: string; severity: string; due_at: string | null }>;
  excursions: number;
  openIncidents: number;
  adoptedMethods: number;
  expiringTraining: number;
};

const emptyData: CoachData = {
  openChecks: 0,
  completedChecks: [],
  openActions: [],
  excursions: 0,
  openIncidents: 0,
  adoptedMethods: 0,
  expiringTraining: 0,
};

function startOfDay(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(0, 0, 0, 0);
  return date;
}

function ComplianceCoach() {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const today = startOfDay().toISOString();
    const week = startOfDay(6).toISOString();
    const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const nowDate = new Date().toISOString().slice(0, 10);

    const [checks, completed, actions, excursions, incidents, methods, training] =
      await Promise.all([
        supabase
          .from("checks")
          .select("id", { count: "exact", head: true })
          .neq("status", "completed")
          .gte("created_at", today),
        supabase
          .from("checks")
          .select("completed_at")
          .eq("status", "completed")
          .gte("completed_at", week),
        supabase
          .from("corrective_actions")
          .select("id,description,severity,due_at")
          .neq("status", "closed")
          .order("due_at", { ascending: true, nullsFirst: false })
          .limit(6),
        supabase
          .from("temperature_logs")
          .select("id", { count: "exact", head: true })
          .eq("status", "out_of_range")
          .gte("logged_at", week),
        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .neq("status", "closed"),
        supabase
          .from("site_safe_methods")
          .select("id", { count: "exact", head: true })
          .eq("status", "adopted"),
        supabase
          .from("training_records")
          .select("id", { count: "exact", head: true })
          .gte("certificate_valid_to", nowDate)
          .lte("certificate_valid_to", thirtyDays),
      ]);

    const firstError = [checks, completed, actions, excursions, incidents, methods, training].find(
      (result) => result.error,
    )?.error;
    if (firstError) setError(firstError.message);
    setData({
      openChecks: checks.count ?? 0,
      completedChecks: (completed.data ?? [])
        .map((row) => row.completed_at)
        .filter((value): value is string => Boolean(value)),
      openActions: actions.data ?? [],
      excursions: excursions.count ?? 0,
      openIncidents: incidents.count ?? 0,
      adoptedMethods: methods.count ?? 0,
      expiringTraining: training.count ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = startOfDay(6 - index);
        const key = date.toISOString().slice(0, 10);
        return {
          key,
          label: date.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2),
          count: data.completedChecks.filter((stamp) => stamp.slice(0, 10) === key).length,
        };
      }),
    [data.completedChecks],
  );
  const maxDay = Math.max(1, ...week.map((day) => day.count));

  const actions = useMemo(() => {
    const result: Action[] = [];
    for (const action of data.openActions.slice(0, 3)) {
      const overdue = action.due_at ? new Date(action.due_at) < new Date() : false;
      result.push({
        id: action.id,
        label: action.description,
        detail: overdue ? "Corrective action is overdue" : `${action.severity} corrective action`,
        to: "/app/control-centre",
        priority: overdue ? 100 : action.severity === "critical" ? 90 : 70,
        tone: overdue || action.severity === "critical" ? "urgent" : "attention",
      });
    }
    if (data.openChecks)
      result.push({
        id: "checks",
        label: `Complete ${data.openChecks} open check${data.openChecks === 1 ? "" : "s"}`,
        detail: "Finish the records assigned for today's shift",
        to: "/app/checks",
        priority: 80,
        tone: "attention",
      });
    if (data.excursions)
      result.push({
        id: "temperature",
        label: `Review ${data.excursions} temperature exception${data.excursions === 1 ? "" : "s"}`,
        detail: "Confirm product decisions and corrective action",
        to: "/app/temperature",
        priority: 85,
        tone: "urgent",
      });
    if (data.openIncidents)
      result.push({
        id: "incidents",
        label: `Review ${data.openIncidents} open incident${data.openIncidents === 1 ? "" : "s"}`,
        detail: "Close only after follow-up evidence is complete",
        to: "/app/incidents",
        priority: 65,
        tone: "attention",
      });
    if (data.expiringTraining)
      result.push({
        id: "training",
        label: `${data.expiringTraining} training record${data.expiringTraining === 1 ? "" : "s"} expire soon`,
        detail: "Review certificates due within 30 days",
        to: "/app/training",
        priority: 50,
        tone: "attention",
      });
    if (!result.length)
      result.push({
        id: "clear",
        label: "No urgent evidence gaps found",
        detail: "Continue today's checks and complete the closing review",
        to: "/app/today",
        priority: 1,
        tone: "good",
      });
    return result.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }, [data]);

  return (
    <div className="p-5 md:p-8 max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">COMPLIANCE COACH</div>
          <h1 className="mt-1">Know what to do next</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            A live, prioritised view built from your saved site records. No generic score and no
            AI-generated food-safety advice.
          </p>
        </div>
        <button className="btn-secondary px-4 py-2 text-sm" onClick={() => void load()}>
          {loading ? <Loader2 className="animate-spin" size={15} /> : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
          Some evidence could not be loaded: {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,.7fr)]">
        <section className="surface overflow-hidden" aria-labelledby="coach-actions-title">
          <div className="border-b border-border p-5">
            <div className="flex items-center gap-2">
              <Lightbulb size={18} />
              <h2 id="coach-actions-title" className="text-lg">
                Priorities now
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Overdue and higher-risk evidence appears first.
            </p>
          </div>
          <div className="divide-y divide-border">
            {actions.map((action, index) => (
              <Link
                key={action.id}
                to={action.to as never}
                className="flex items-center gap-3 p-4 hover:bg-muted/60"
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${
                    action.tone === "urgent"
                      ? "bg-destructive/10 text-destructive"
                      : action.tone === "good"
                        ? "bg-success/10 text-success"
                        : "bg-warning/15 text-warning-foreground"
                  }`}
                >
                  {action.tone === "good" ? <CheckCircle2 size={16} /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{action.label}</strong>
                  <span className="block truncate text-xs text-muted-foreground">
                    {action.detail}
                  </span>
                </span>
                <ArrowRight size={15} className="shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        <section className="surface p-5" aria-labelledby="momentum-title">
          <h2 id="momentum-title" className="text-lg">
            Seven-day momentum
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Completed checks—not a hygiene rating.
          </p>
          <div className="mt-5 flex h-36 items-end gap-2" aria-label="Completed checks by day">
            {week.map((day) => (
              <div
                key={day.key}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-[10px] font-bold tabular-nums">{day.count}</span>
                <div className="flex h-24 w-full items-end rounded-md bg-muted/70 overflow-hidden">
                  <div
                    className="w-full rounded-md bg-success transition-all"
                    style={{
                      height: `${Math.max(day.count ? 12 : 3, (day.count / maxDay) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{day.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Evidence coverage">
        <Metric
          icon={<ClipboardCheck size={16} />}
          value={data.completedChecks.length}
          label="Checks in 7 days"
        />
        <Metric
          icon={<BookOpenCheck size={16} />}
          value={data.adoptedMethods}
          label="Safe methods adopted"
        />
        <Metric
          icon={<Thermometer size={16} />}
          value={data.excursions}
          label="Temperature exceptions"
          warn={data.excursions > 0}
        />
        <Metric
          icon={<GraduationCap size={16} />}
          value={data.expiringTraining}
          label="Training due in 30 days"
          warn={data.expiringTraining > 0}
        />
      </section>

      <section className="surface p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={17} /> <h2 className="text-base">Quick evidence capture</h2>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink to="/app/checks" label="Complete a check" />
          <QuickLink to="/app/temperature" label="Log temperature" />
          <QuickLink to="/app/incidents" label="Report an incident" />
          <QuickLink to="/app/diary" label="Sign the diary" />
        </div>
      </section>

      <p className="flex gap-2 text-xs text-muted-foreground">
        <AlertTriangle size={14} className="shrink-0" /> This coach organises recorded evidence. It
        does not issue an FHRS/FHIS rating, certify compliance or replace official guidance and
        competent judgement.
      </p>
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
  warn = false,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  warn?: boolean;
}) {
  return (
    <article className={`surface p-4 ${warn ? "border-warning/40" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 text-2xl font-black tabular-nums">{value}</div>
    </article>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to as never}
      className="flex items-center justify-between rounded-lg border border-border px-3 py-3 text-sm font-semibold hover:bg-muted"
    >
      {label} <ArrowRight size={14} />
    </Link>
  );
}
