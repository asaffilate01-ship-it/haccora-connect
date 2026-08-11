import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { LiveMetrics } from "@/components/LiveMetrics";
import { supabase } from "@/integrations/supabase/haccora-client";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  MapPin,
  DollarSign,
  Users,
  ChefHat,
  Thermometer,
  Wheat,
  Gavel,
  BookOpen,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

interface Task {
  id: string;
  title: string;
  kind: string;
  time: string;
  status: "pending" | "overdue" | "done";
  who: string;
}
interface LiveAction {
  id: string;
  title: string;
  source: string;
  severity: "high" | "medium" | "low";
  created_at: string;
}
interface DashCounts {
  alerts: number;
  incidentsHigh: number;
  tempOut: number;
  trainingDue: number;
  recipes: number;
  brigade: number;
  tempOk: number;
  tempTotal: number;
  expiring: number;
  suppliers: number;
  poOpen: number;
  poSpend: number;
}

function Dashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<DashCounts>({
    alerts: 0,
    incidentsHigh: 0,
    tempOut: 0,
    trainingDue: 0,
    recipes: 0,
    brigade: 0,
    tempOk: 0,
    tempTotal: 0,
    expiring: 0,
    suppliers: 0,
    poOpen: 0,
    poSpend: 0,
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString();
    let q = supabase
      .from("checks")
      .select("id, title, kind, status, completed_at, created_at, user_id")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .limit(20);
    if (user.role === "staff") q = q.eq("user_id", user.id);
    const { data } = await q;
    const now = Date.now();
    const userIds = Array.from(new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean)));
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as { id: string; full_name: string | null }[] };
    const nameById = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    const rows: Task[] = (data ?? []).map((r: any) => {
      const created = new Date(r.created_at);
      const status: Task["status"] =
        r.status === "completed"
          ? "done"
          : now - created.getTime() > 6 * 3600_000
            ? "overdue"
            : "pending";
      return {
        id: r.id,
        title: r.title,
        kind: r.kind,
        time: created.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status,
        who: (nameById.get(r.user_id) ?? "").split(" ")[0] || "—",
      };
    });
    setTasks(rows);

    // Live aggregate counts for role dashboards
    const [
      alertsQ,
      incHighQ,
      tempOutQ,
      tempOkQ,
      recipesQ,
      brigadeQ,
      expiringQ,
      supQ,
      poOpenQ,
      trainingDueQ,
      poRecent,
    ] = await Promise.all([
      supabase.from("alerts").select("id", { count: "exact", head: true }).is("read_at", null),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("severity", "high")
        .neq("status", "closed"),
      supabase
        .from("temperature_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "out_of_range")
        .gte("logged_at", since.toISOString()),
      supabase
        .from("temperature_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "in_range")
        .gte("logged_at", since.toISOString()),
      supabase.from("recipes").select("id", { count: "exact", head: true }),
      supabase
        .from("organization_memberships" as any)
        .select("user_id", { count: "exact", head: true })
        .eq("status", "active")
        .in("role", ["chef", "staff"]),
      supabase
        .from("expiry_items")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .lte("expires_on", in7),
      supabase.from("suppliers").select("id", { count: "exact", head: true }),
      supabase
        .from("purchase_orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["draft", "sent"]),
      supabase
        .from("training_records")
        .select("id", { count: "exact", head: true })
        .is("completed_at", null),
      supabase
        .from("purchase_orders")
        .select("total_eur")
        .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    ]);
    const spend = ((poRecent.data ?? []) as Array<{ total_eur: number | null }>).reduce(
      (s, r) => s + Number(r.total_eur ?? 0),
      0,
    );
    const tempOk = tempOkQ.count ?? 0;
    const tempOut = tempOutQ.count ?? 0;
    setCounts({
      alerts: alertsQ.count ?? 0,
      incidentsHigh: incHighQ.count ?? 0,
      tempOut,
      tempOk,
      tempTotal: tempOk + tempOut,
      trainingDue: trainingDueQ.count ?? 0,
      recipes: recipesQ.count ?? 0,
      brigade: brigadeQ.count ?? 0,
      expiring: expiringQ.count ?? 0,
      suppliers: supQ.count ?? 0,
      poOpen: poOpenQ.count ?? 0,
      poSpend: Math.round(spend),
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("dash-checks")
      .on("postgres_changes", { event: "*", schema: "public", table: "checks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "temperature_logs" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const done = async (id: string) => {
    await supabase
      .from("checks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id);
    load();
  };

  if (!user) return null;

  const firstName = user.name.split(" ")[0];
  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const visibleTasks = tasks;
  const pending = visibleTasks.filter((x) => x.status === "pending").length;
  const overdue = visibleTasks.filter((x) => x.status === "overdue").length;

  return (
    <div className="p-4 md:p-8 lg:p-10 space-y-6 md:space-y-8">
      {user.role !== "inspector" && (
        <RoleHero
          role={user.role}
          firstName={firstName}
          dateStr={dateStr}
          location={user.location}
        />
      )}
      <LiveMetrics />

      {loading && (
        <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> {t("common.loading") || "…"}
        </div>
      )}

      {user.role === "owner" && (
        <OwnerView
          pending={pending}
          overdue={overdue}
          tasks={visibleTasks}
          done={done}
          counts={counts}
        />
      )}
      {user.role === "manager" && (
        <ManagerView
          pending={pending}
          overdue={overdue}
          tasks={visibleTasks}
          done={done}
          counts={counts}
        />
      )}
      {user.role === "chef" && (
        <ChefView
          pending={pending}
          overdue={overdue}
          tasks={visibleTasks}
          done={done}
          counts={counts}
        />
      )}
      {user.role === "staff" && <StaffView tasks={visibleTasks} done={done} />}
      {user.role === "inspector" && <InspectorView />}
    </div>
  );
}

/* ---------------- Role hero band ---------------- */
function RoleHero({
  role,
  firstName,
  dateStr,
  location,
}: {
  role: string;
  firstName: string;
  dateStr: string;
  location: string;
}) {
  const { t } = useI18n();
  const theme = {
    owner: {
      bg: "bg-[#0b0f1a] text-white",
      accent: "text-[#f4b544]",
      icon: DollarSign,
      eye: "dash.owner.hero.eye",
      ti: "dash.owner.hero.t",
      bo: "dash.owner.hero.b",
    },
    manager: {
      bg: "bg-[color:var(--color-alert-red)] text-white",
      accent: "text-white",
      icon: ClipboardList,
      eye: "dash.manager.hero.eye",
      ti: "dash.manager.hero.t",
      bo: "dash.manager.hero.b",
    },
    chef: {
      bg: "bg-gradient-to-br from-emerald-700 to-emerald-900 text-white",
      accent: "text-emerald-200",
      icon: ChefHat,
      eye: "dash.chef.hero.eye",
      ti: "dash.chef.hero.t",
      bo: "dash.chef.hero.b",
    },
    staff: {
      bg: "bg-gradient-to-br from-sky-600 to-indigo-700 text-white",
      accent: "text-sky-100",
      icon: BookOpen,
      eye: "dash.staff.hero.eye",
      ti: "dash.staff.hero.t",
      bo: "dash.staff.hero.b",
    },
    inspector: {
      bg: "bg-white border border-border text-foreground",
      accent: "text-[color:var(--color-alert-red)]",
      icon: Gavel,
      eye: "inspector.eyebrow",
      ti: "inspector.title",
      bo: "inspector.body",
    },
  }[role as "owner" | "manager" | "chef" | "staff" | "inspector"];
  const Icon = theme.icon;
  return (
    <div className={`rounded-2xl overflow-hidden ${theme.bg} shadow-lg`}>
      <div className="p-5 md:p-8 flex items-start gap-4 md:gap-6">
        <div className="hidden sm:grid h-12 w-12 md:h-14 md:w-14 place-items-center rounded-2xl bg-white/10 backdrop-blur">
          <Icon size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`text-[10px] md:text-xs font-black uppercase tracking-[0.18em] ${theme.accent}`}
          >
            {t(theme.eye)}
          </div>
          <h1 className="mt-1.5 font-display text-2xl md:text-4xl leading-tight">
            {t("dash.hello.role")}, {firstName}
          </h1>
          <p className="mt-1.5 text-sm md:text-base opacity-85 max-w-2xl">{t(theme.bo)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] md:text-xs uppercase tracking-wider opacity-70">
            <span>{location}</span>
            <span>·</span>
            <span>{dateStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Owner ---------------- */
function OwnerView({
  pending,
  overdue,
  tasks,
  done,
  counts,
}: {
  pending: number;
  overdue: number;
  tasks: Task[];
  done: (id: string) => void;
  counts: DashCounts;
}) {
  const { t } = useI18n();
  const tempScore =
    counts.tempTotal > 0 ? Math.round((counts.tempOk / counts.tempTotal) * 100) : 100;
  const checksScore =
    tasks.length > 0
      ? Math.round((tasks.filter((x) => x.status === "done").length / tasks.length) * 100)
      : 100;
  const complianceScore = Math.round(tempScore * 0.5 + checksScore * 0.5);
  const spendFmt = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(counts.poSpend || 0);

  return (
    <>
      <MetricRow
        items={[
          {
            l: t("dash.metric.score"),
            v: `${complianceScore}%`,
            hint: t("time.trend"),
            icon: ShieldCheck,
          },
          { l: t("owner.locations"), v: 1, icon: MapPin },
          { l: t("dash.metric.actions"), v: counts.alerts, icon: AlertTriangle },
          { l: t("owner.revenue"), v: spendFmt, hint: t("owner.revenue.hint"), icon: DollarSign },
          { l: t("dash.metric.training"), v: counts.trainingDue, icon: Users },
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">{t("owner.byLocation")}</h2>
            <span className="text-xs text-muted-foreground">{t("owner.last30")}</span>
          </div>
          <div className="divide-y divide-border">
            <div className="py-3 flex items-center gap-4">
              <div className="h-9 w-9 rounded-lg bg-secondary grid place-items-center text-primary shrink-0">
                <MapPin size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {t("dash.thisLocation") || "This location"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {counts.suppliers} {t("suppliers.title") || "Suppliers"} · {counts.recipes}{" "}
                  {t("recipes.title") || "Recipes"}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-display text-2xl ${complianceScore >= 95 ? "text-success" : complianceScore >= 90 ? "text-foreground" : "text-warning-foreground"}`}
                >
                  {complianceScore}%
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  {counts.alerts} {t("owner.alerts")}
                </div>
              </div>
            </div>
          </div>
        </div>

        <ReadinessCard />
      </div>

      <TasksAndActions tasks={tasks} done={done} pending={pending} overdue={overdue} />
    </>
  );
}

/* ---------------- Manager ---------------- */
function ManagerView({
  pending,
  overdue,
  tasks,
  done,
  counts,
}: {
  pending: number;
  overdue: number;
  tasks: Task[];
  done: (id: string) => void;
  counts: DashCounts;
}) {
  const { t } = useI18n();
  const tempScore =
    counts.tempTotal > 0 ? Math.round((counts.tempOk / counts.tempTotal) * 100) : 100;
  const checksScore =
    tasks.length > 0
      ? Math.round((tasks.filter((x) => x.status === "done").length / tasks.length) * 100)
      : 100;
  const score = Math.round(tempScore * 0.5 + checksScore * 0.5);
  return (
    <>
      {/* Live shift strip — unique to manager */}
      <div className="rounded-2xl border border-[color:var(--color-alert-red)]/30 bg-[color:var(--color-alert-red)]/5 p-4 md:p-5 flex items-center gap-4">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-alert-red)] opacity-60"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-[color:var(--color-alert-red)]"></span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-alert-red)]">
            {t("dash.manager.shift")}
          </div>
          <div className="text-sm font-semibold truncate">{t("dash.manager.shiftBody")}</div>
        </div>
      </div>
      <MetricRow
        items={[
          { l: t("dash.metric.score"), v: `${score}%`, hint: t("time.trend"), icon: ShieldCheck },
          { l: t("dash.metric.pending"), v: pending, icon: Clock },
          { l: t("dash.metric.overdue"), v: overdue, icon: AlertTriangle },
          { l: t("dash.metric.actions"), v: counts.alerts, icon: AlertTriangle },
          { l: t("dash.metric.failed"), v: counts.tempOut, icon: Thermometer },
          { l: t("dash.metric.training"), v: counts.trainingDue, icon: Users },
        ]}
      />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TasksCard tasks={tasks} done={done} />
        </div>
        <div className="space-y-6">
          <ReadinessCard />
          <ActionsCard />
        </div>
      </div>
    </>
  );
}

/* ---------------- Chef ---------------- */
function ChefView({
  tasks,
  done,
  counts,
}: {
  pending: number;
  overdue: number;
  tasks: Task[];
  done: (id: string) => void;
  counts: DashCounts;
}) {
  const { t } = useI18n();
  const kitchen = [
    {
      l: t("chef.temps"),
      v: `${counts.tempOk}/${counts.tempTotal || 0}`,
      to: "/app/temperature",
      icon: Thermometer,
    },
    {
      l: t("chef.haccp"),
      v: counts.tempOut === 0 ? t("chef.approved") : `${counts.tempOut} ⚠`,
      to: "/app/haccp",
      icon: ShieldCheck,
    },
    { l: t("chef.recipes"), v: String(counts.recipes), to: "/app/recipes", icon: Wheat },
    { l: t("chef.brigade"), v: String(counts.brigade), to: "/app/training", icon: ChefHat },
  ];
  return (
    <>
      {/* Kitchen line status */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-4 md:p-5 flex items-center gap-4">
        <span className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600 text-white grid place-items-center">
          <Thermometer size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
            {t("dash.chef.line")}
          </div>
          <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
            {t("dash.chef.lineBody")}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kitchen.map((k) => (
          <Link
            key={k.l}
            to={k.to as never}
            className="surface p-4 md:p-5 hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between">
              <span className="h-10 w-10 rounded-xl bg-emerald-600/10 text-emerald-700 grid place-items-center">
                <k.icon size={18} />
              </span>
              <ArrowRight
                size={14}
                className="text-muted-foreground opacity-0 group-hover:opacity-100 transition"
              />
            </div>
            <div className="mt-3 text-xs text-muted-foreground">{k.l}</div>
            <div className="font-display text-2xl md:text-3xl">{k.v}</div>
          </Link>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TasksCard tasks={tasks} done={done} />
        </div>
        <ActionsCard />
      </div>
    </>
  );
}

/* ---------------- Staff (focus view) ---------------- */
function StaffView({ tasks, done }: { tasks: Task[]; done: (id: string) => void }) {
  const { t } = useI18n();
  const total = tasks.length;
  const completed = tasks.filter((x) => x.status === "done").length;
  const pending = total - completed;
  const overdue = tasks.filter((x) => x.status === "overdue").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <>
      {/* Big progress card — staff feels different from manager/owner */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 text-white p-5 md:p-7">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-xs font-black uppercase tracking-widest text-sky-100">
            {t("dash.staff.progress")}
          </div>
          <div className="font-display text-4xl md:text-5xl">{pct}%</div>
        </div>
        <div className="mt-3 h-2.5 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs md:text-sm text-sky-50">
          <span>
            {completed}/{total} {t("dash.completed").toLowerCase()}
          </span>
          {pending > 0 && (
            <span>
              · {pending} {t("dash.pending").toLowerCase()}
            </span>
          )}
          {overdue > 0 && (
            <span className="font-bold">
              · {overdue} {t("dash.overdue").toLowerCase()}
            </span>
          )}
        </div>
      </div>
      {total === completed ? (
        <div className="surface p-6 md:p-8 text-center">
          <CheckCircle2 size={40} className="mx-auto text-success" />
          <div className="mt-3 font-display text-xl">{t("dash.staff.allDone")}</div>
        </div>
      ) : (
        <TasksCard tasks={tasks} done={done} big />
      )}
      <Link
        to="/app/training"
        className="surface p-5 md:p-6 flex items-center gap-4 hover:shadow-md transition"
      >
        <span className="h-11 w-11 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0">
          <BookOpen size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg truncate">{t("staff.training.t")}</div>
          <div className="text-sm text-muted-foreground truncate">{t("staff.training.b")}</div>
        </div>
        <ArrowRight size={18} className="text-muted-foreground shrink-0" />
      </Link>
    </>
  );
}

/* ---------------- Inspector ---------------- */
function InspectorView() {
  const { t } = useI18n();
  return (
    <div className="surface p-8 md:p-10 max-w-2xl">
      <div className="flex items-start gap-4">
        <span className="h-12 w-12 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0">
          <Gavel size={22} />
        </span>
        <div>
          <h2 className="font-display text-2xl">{t("inspector.title")}</h2>
          <p className="text-muted-foreground mt-2">{t("inspector.body")}</p>
          <Link
            to="/app/inspection"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold hover:brightness-110 transition"
          >
            {t("dash.readiness.cta")} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Shared building blocks ---------------- */

function MetricRow({
  items,
}: {
  items: Array<{ l: string; v: string | number; hint?: string; icon: typeof ShieldCheck }>;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((m) => (
        <div key={m.l} className="surface p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">{m.l}</div>
            <m.icon size={14} className="text-muted-foreground/60" />
          </div>
          <div className="mt-2 font-display text-3xl">{m.v}</div>
          {m.hint && (
            <div className="text-[10px] mt-1 text-success flex items-center gap-1">
              <TrendingUp size={10} /> {m.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TasksAndActions({
  tasks,
  done,
  pending,
  overdue,
}: {
  tasks: Task[];
  done: (id: string) => void;
  pending: number;
  overdue: number;
}) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <TasksCard tasks={tasks} done={done} />
      </div>
      <ActionsCard />
    </div>
  );
}

function TasksCard({
  tasks,
  done,
  big,
}: {
  tasks: Task[];
  done: (id: string) => void;
  big?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">{t("dash.today")}</h2>
        <Link to="/app/checks" className="text-xs text-primary hover:underline">
          {t("dash.allTasks")} →
        </Link>
      </div>
      <div className="mt-4 divide-y divide-border">
        {tasks.map((task) => (
          <div key={task.id} className={`${big ? "py-4" : "py-3"} flex items-center gap-3`}>
            <StatusPill status={task.status} />
            <div className="flex-1 min-w-0">
              <div
                className={`${big ? "text-base" : "text-sm"} font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}
              >
                {task.title}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {task.kind} · {task.who} · {task.time}
              </div>
            </div>
            {task.status !== "done" ? (
              <button
                onClick={() => done(task.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:brightness-110"
              >
                {t("dash.complete")}
              </button>
            ) : (
              <span className="text-xs text-success inline-flex items-center gap-1">
                <CheckCircle2 size={14} /> {t("dash.completed")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionsCard() {
  const { t } = useI18n();
  const [items, setItems] = useState<LiveAction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("alerts")
      .select("id, title, kind, severity, created_at")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(5);
    setItems(
      (data ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        source: r.kind || "system",
        severity: (["high", "medium", "low"].includes(r.severity)
          ? r.severity
          : "medium") as LiveAction["severity"],
        created_at: r.created_at,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("dash-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const rel = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <div className="surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">{t("dash.actions")}</h2>
        <Link to="/app/alerts" className="text-xs text-primary hover:underline">
          {t("dash.allTasks")} →
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {loading && <div className="text-xs text-muted-foreground">…</div>}
        {!loading && items.length === 0 && (
          <div className="text-xs text-muted-foreground py-6 text-center inline-flex items-center gap-2 w-full justify-center">
            <CheckCircle2 size={14} className="text-success" />
            {"No open alerts"}
          </div>
        )}
        {items.map((a) => (
          <Link
            key={a.id}
            to="/app/alerts"
            className="flex items-start gap-3 p-3 rounded-lg bg-secondary/60 hover:bg-secondary transition"
          >
            <SeverityBadge sev={a.severity} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{a.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {a.source} · {rel(a.created_at)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ReadinessCard() {
  const { t } = useI18n();
  return (
    <div className="surface p-6 bg-primary text-primary-foreground border-primary">
      <div className="flex items-start gap-3">
        <ShieldCheck size={20} className="mt-0.5" />
        <div>
          <h3 className="font-display text-lg">{t("dash.readiness")}</h3>
          <p className="text-sm opacity-85 mt-1">{t("dash.readiness.body")}</p>
          <Link
            to="/app/inspection"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium bg-accent text-accent-foreground rounded-full px-3.5 py-1.5"
          >
            {t("dash.readiness.cta")} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Task["status"] }) {
  if (status === "done")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <CheckCircle2 size={14} />
      </span>
    );
  if (status === "overdue")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <AlertTriangle size={14} />
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Clock size={14} />
    </span>
  );
}

function SeverityBadge({ sev }: { sev: "high" | "medium" | "low" }) {
  const { t } = useI18n();
  const map = {
    high: { c: "bg-destructive/10 text-destructive", l: t("dash.severity.high") },
    medium: {
      c: "bg-warning/15 text-warning-foreground border border-warning/40",
      l: t("dash.severity.medium"),
    },
    low: { c: "bg-secondary text-foreground", l: t("dash.severity.low") },
  } as const;
  const { c, l } = map[sev];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c}`}
    >
      {l}
    </span>
  );
}
