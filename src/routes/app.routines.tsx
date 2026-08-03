import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  Circle,
  Sun,
  ChefHat,
  Moon,
  ThermometerSnowflake,
  Sparkles,
  ClipboardCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/app/routines")({ component: RoutinesPage });

type Step = {
  id: string;
  deK: string;
  enK: string;
  type: "check" | "temp" | "clean";
  expect?: string;
};
type Phase = {
  id: "open" | "service" | "close";
  icon: typeof Sun;
  deTitle: string;
  enTitle: string;
  steps: Step[];
};

const PHASES: Phase[] = [
  {
    id: "open",
    icon: Sun,
    deTitle: "Öffnen",
    enTitle: "Opening",
    steps: [
      {
        id: "o1",
        deK: "Kühlraum Temperatur prüfen",
        enK: "Check walk-in fridge temp",
        type: "temp",
        expect: "≤ 4 °C",
      },
      {
        id: "o2",
        deK: "Handwaschstationen bestückt",
        enK: "Handwash stations stocked",
        type: "check",
      },
      { id: "o3", deK: "Oberflächen desinfiziert", enK: "Surfaces sanitised", type: "clean" },
      {
        id: "o4",
        deK: "Gesundheitszustand Team (IfSG §43)",
        enK: "Team health check (IfSG §43)",
        type: "check",
      },
      { id: "o5", deK: "Warenannahme-Bereich frei", enK: "Delivery area clear", type: "check" },
    ],
  },
  {
    id: "service",
    icon: ChefHat,
    deTitle: "Service",
    enTitle: "Service",
    steps: [
      {
        id: "s1",
        deK: "Heißhaltung ≥ 65 °C",
        enK: "Hot hold ≥ 65 °C",
        type: "temp",
        expect: "≥ 65 °C",
      },
      {
        id: "s2",
        deK: "Kaltbuffet ≤ 7 °C",
        enK: "Cold buffet ≤ 7 °C",
        type: "temp",
        expect: "≤ 7 °C",
      },
      { id: "s3", deK: "Allergen-Karte sichtbar", enK: "Allergen menu visible", type: "check" },
      { id: "s4", deK: "Fritteusenöl Sichtprüfung", enK: "Fryer oil visual check", type: "check" },
    ],
  },
  {
    id: "close",
    icon: Moon,
    deTitle: "Schließen",
    enTitle: "Closing",
    steps: [
      {
        id: "c1",
        deK: "Reste kennzeichnen & kühlen",
        enK: "Label & cool leftovers",
        type: "clean",
      },
      {
        id: "c2",
        deK: "Reinigungsplan abgezeichnet",
        enK: "Cleaning schedule signed off",
        type: "clean",
      },
      { id: "c3", deK: "Kühlgeräte Endtemperaturen", enK: "Fridge end-of-day temps", type: "temp" },
      { id: "c4", deK: "Fettabscheider geleert", enK: "Grease trap emptied", type: "check" },
      { id: "c5", deK: "Alarmanlage aktiviert", enK: "Alarm system armed", type: "check" },
    ],
  },
];

function RoutinesPage() {
  const { lang } = useI18n();
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const [activePhase, setActivePhase] = useState<Phase["id"]>("open");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("checks")
      .select("id,title,status,completed_at")
      .eq("kind", "routine")
      .gte("completed_at", startOfDay.toISOString());
    const map: Record<string, boolean> = {};
    (data ?? []).forEach((c: any) => {
      if (c.status === "completed" && c.title?.startsWith("routine:")) {
        const parts = c.title.split(":");
        if (parts[2]) map[parts[2]] = true;
      }
    });
    setDone(map);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (phaseId: string, s: Step) => {
    const isDone = !!done[s.id];
    setDone((d) => ({ ...d, [s.id]: !isDone }));
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const title = `routine:${phaseId}:${s.id}`;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    if (isDone) {
      await supabase
        .from("checks")
        .update({ status: "voided", note: "User reopened this routine step" })
        .eq("title", title)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("completed_at", startOfDay.toISOString());
    } else {
      await supabase.from("checks").insert({
        title,
        kind: "routine",
        status: "completed",
        completed_at: new Date().toISOString(),
        user_id: user.id,
      });
    }
  };

  const phase = PHASES.find((p) => p.id === activePhase)!;
  const totalDone = Object.values(done).filter(Boolean).length;
  const totalSteps = PHASES.reduce((n, p) => n + p.steps.length, 0);
  const pct = totalSteps ? Math.round((totalDone / totalSteps) * 100) : 0;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div>
        <div className="eyebrow">{t("Betrieb", "Operations")}</div>
        <h1 className="mt-1 text-3xl md:text-4xl">
          {t("Öffnen · Service · Schließen", "Open · Service · Close")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t(
            "Ein geführter Ablauf – Temperaturen, Kontrollen und Reinigung in einer Routine.",
            "A guided flow — temperatures, checks and cleaning in one routine.",
          )}
        </p>
      </div>

      <div className="surface p-5 flex items-center gap-5">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="currentColor"
              className="text-secondary"
              strokeWidth="3.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="currentColor"
              className="text-primary"
              strokeWidth="3.5"
              strokeDasharray={`${pct} 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-sm font-bold">{pct}%</div>
        </div>
        <div className="flex-1">
          <div className="font-display text-lg">{t("Heutige Routine", "Today's routine")}</div>
          <div className="text-xs text-muted-foreground">
            {loading ? (
              <>
                <Loader2 size={12} className="inline animate-spin mr-1" />…
              </>
            ) : (
              <>
                {totalDone} / {totalSteps} {t("Schritte abgeschlossen", "steps complete")}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {PHASES.map((p) => {
          const Icon = p.icon;
          const doneCount = p.steps.filter((s) => done[s.id]).length;
          const active = p.id === activePhase;
          return (
            <button
              key={p.id}
              onClick={() => setActivePhase(p.id)}
              className={`text-left rounded-2xl border p-4 transition ${active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-secondary/60"}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-10 w-10 rounded-xl grid place-items-center ${active ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  <Icon size={18} />
                </span>
                <div className="flex-1">
                  <div className="font-display">{t(p.deTitle, p.enTitle)}</div>
                  <div className="text-xs text-muted-foreground">
                    {doneCount}/{p.steps.length}
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="surface overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-secondary/50 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <ClipboardCheck size={14} /> {t(phase.deTitle, phase.enTitle)} · {phase.steps.length}{" "}
          {t("Schritte", "steps")}
        </div>
        <ul className="divide-y divide-border">
          {phase.steps.map((s) => {
            const isDone = !!done[s.id];
            const Icon =
              s.type === "temp"
                ? ThermometerSnowflake
                : s.type === "clean"
                  ? Sparkles
                  : ClipboardCheck;
            return (
              <li key={s.id}>
                <button
                  onClick={() => toggle(phase.id, s)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-secondary/40 transition text-left"
                >
                  {isDone ? (
                    <CheckCircle2 size={20} className="text-success shrink-0" />
                  ) : (
                    <Circle size={20} className="text-muted-foreground shrink-0" />
                  )}
                  <Icon size={16} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}
                    >
                      {t(s.deK, s.enK)}
                    </div>
                    {s.expect && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {t("Grenzwert", "Limit")}: {s.expect}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
