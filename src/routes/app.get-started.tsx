import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Circle, Clock3, Rocket, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/get-started")({ component: GetStarted });

type SetupSnapshot = {
  profile: number;
  team: number;
  methods: number;
  assets: number;
  suppliers: number;
  recipes: number;
  checks: number;
  training: number;
  trialEndsAt: string | null;
};

const EMPTY: SetupSnapshot = {
  profile: 0,
  team: 0,
  methods: 0,
  assets: 0,
  suppliers: 0,
  recipes: 0,
  checks: 0,
  training: 0,
  trialEndsAt: null,
};

type SetupStep = {
  title: string;
  description: string;
  to: string;
  complete: boolean;
  time: string;
};

function GetStarted() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    setError("");
    const count = { count: "exact" as const, head: true };
    const [profile, team, methods, assets, suppliers, recipes, checks, training, subscription] =
      await Promise.all([
        supabase
          .from("site_compliance_profiles")
          .select("id", count)
          .eq("organization_id", user.organizationId),
        supabase
          .from("organization_memberships")
          .select("id", count)
          .eq("organization_id", user.organizationId)
          .eq("status", "active"),
        supabase.from("site_safe_methods").select("id", count).eq("status", "active"),
        supabase.from("assets").select("id", count),
        supabase.from("suppliers").select("id", count),
        supabase.from("recipes").select("id", count),
        supabase.from("checks").select("id", count),
        supabase.from("training_records").select("id", count),
        supabase
          .from("subscriptions")
          .select("trial_ends_at")
          .eq("organization_id", user.organizationId)
          .maybeSingle(),
      ]);
    const results = [
      profile,
      team,
      methods,
      assets,
      suppliers,
      recipes,
      checks,
      training,
      subscription,
    ];
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) setError(firstError.message);
    setSnapshot({
      profile: profile.count ?? 0,
      team: team.count ?? 0,
      methods: methods.count ?? 0,
      assets: assets.count ?? 0,
      suppliers: suppliers.count ?? 0,
      recipes: recipes.count ?? 0,
      checks: checks.count ?? 0,
      training: training.count ?? 0,
      trialEndsAt: subscription.data?.trial_ends_at ?? null,
    });
    setLoading(false);
  }, [user?.organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const steps = useMemo<SetupStep[]>(
    () => [
      {
        title: "Confirm your UK compliance profile",
        description: "Choose the correct UK nation, business type, PPDS use and customer risks.",
        to: "/app/uk-compliance",
        complete: snapshot.profile > 0,
        time: "2 min",
      },
      {
        title: "Invite your team",
        description: "Give each person the minimum role they need and avoid shared accounts.",
        to: "/app/settings",
        complete: snapshot.team > 1,
        time: "3 min",
      },
      {
        title: "Adopt your safe methods",
        description: "Adapt the FSA/FSS-linked controls to how this site actually operates.",
        to: "/app/safe-methods",
        complete: snapshot.methods >= 4,
        time: "15 min",
      },
      {
        title: "Add fridges, freezers and probes",
        description: "Set up the equipment that needs checks, calibration and expiry reminders.",
        to: "/app/assets",
        complete: snapshot.assets > 0,
        time: "5 min",
      },
      {
        title: "Add suppliers and recipes",
        description: "Connect traceability, current ingredient data and the UK allergen workflow.",
        to: "/app/suppliers",
        complete: snapshot.suppliers > 0 && snapshot.recipes > 0,
        time: "10 min",
      },
      {
        title: "Run the first daily checks",
        description: "Complete a real opening, temperature, cleaning or closing record.",
        to: "/app/routines",
        complete: snapshot.checks > 0,
        time: "5 min",
      },
      {
        title: "Record staff training",
        description: "Assign required learning and retain verification and renewal evidence.",
        to: "/app/training",
        complete: snapshot.training > 0,
        time: "5 min",
      },
    ],
    [snapshot],
  );

  const completed = steps.filter((step) => step.complete).length;
  const progress = Math.round((completed / steps.length) * 100);
  const trialDays = snapshot.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(snapshot.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <main className="p-5 md:p-8 max-w-6xl space-y-5">
      <header>
        <div className="eyebrow">GUIDED SETUP</div>
        <h1 className="mt-1">Get Haccora working in your kitchen</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          A short first-week setup based on your real records. Complete the essentials first; add
          advanced modules only when the core routine is working reliably.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
          Some setup data could not be loaded: {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-[17rem_1fr]">
        <aside className="surface p-5 h-fit">
          <Rocket size={22} />
          <div className="mt-4 text-4xl font-black tabular-nums">
            {loading ? "—" : `${progress}%`}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-success transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {completed} of {steps.length} setup steps complete
          </p>
          {trialDays !== null && (
            <div className="mt-4 rounded-xl bg-secondary p-3 text-xs">
              <Clock3 size={14} className="mr-1 inline" /> {trialDays} trial day
              {trialDays === 1 ? "" : "s"} remaining
            </div>
          )}
          <Link to="/app/readiness" className="btn-ghost-dark mt-4 w-full text-xs">
            <ShieldCheck size={14} /> View UK readiness
          </Link>
        </aside>

        <div className="surface divide-y overflow-hidden">
          {steps.map((step, index) => (
            <Link
              to={step.to}
              key={step.title}
              className="flex items-center gap-3 p-4 hover:bg-secondary/50 transition"
            >
              {step.complete ? (
                <CheckCircle2 size={19} className="shrink-0 text-success" />
              ) : (
                <Circle size={19} className="shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-muted-foreground">{index + 1}</span>
                  <span className="text-sm font-bold">{step.title}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">
                    {step.time}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
              </div>
              <ArrowRight size={15} className="shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Haccora records and organises evidence. Your business remains responsible for choosing,
        implementing and reviewing controls appropriate to its operation and UK nation.
      </p>
    </main>
  );
}
