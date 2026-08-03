import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Calendar, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/cleaning")({ component: CleaningPage });

type Task = { areaK: string; freqK: string; chem: string; colorK: string; staffK: string };
const SCHEDULE: Task[] = [
  {
    areaK: "cleaning.area.floor",
    freqK: "cleaning.freq.daily",
    chem: "Sanixyl Alkalisch",
    colorK: "cleaning.color.red",
    staffK: "cleaning.staff.contractor",
  },
  {
    areaK: "cleaning.area.surfaces",
    freqK: "cleaning.freq.thriceDaily",
    chem: "DesInfekt 70",
    colorK: "cleaning.color.blue",
    staffK: "cleaning.staff.contractor",
  },
  {
    areaK: "cleaning.area.fryer",
    freqK: "cleaning.freq.weekly",
    chem: "OilClean Plus",
    colorK: "cleaning.color.yellow",
    staffK: "cleaning.staff.contractor",
  },
  {
    areaK: "cleaning.area.coldRoom",
    freqK: "cleaning.freq.weekly",
    chem: "FrostClean",
    colorK: "cleaning.color.green",
    staffK: "cleaning.staff.contractor",
  },
  {
    areaK: "cleaning.area.wc",
    freqK: "cleaning.freq.twiceDaily",
    chem: "HygieneMax",
    colorK: "cleaning.color.white",
    staffK: "cleaning.staff.contractor",
  },
  {
    areaK: "cleaning.area.hood",
    freqK: "cleaning.freq.monthly",
    chem: "—",
    colorK: "cleaning.color.none",
    staffK: "cleaning.staff.contractor",
  },
];

interface Row {
  id: string;
  title: string;
  status: string;
  completed_at: string | null;
  user_id: string;
}

function CleaningPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("checks")
      .select("*")
      .eq("kind", "cleaning")
      .order("completed_at", { ascending: false })
      .limit(50);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const complete = async (task: Task) => {
    if (!user) return;
    setBusy(task.areaK);
    await supabase.from("checks").insert({
      user_id: user.id,
      kind: "cleaning",
      title: task.areaK,
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    setBusy(null);
    load();
  };

  const lastFor = (areaK: string): string => {
    const r = rows.find((x) => x.title === areaK);
    return r?.completed_at
      ? new Date(r.completed_at).toLocaleString(lang === "de" ? "de-DE" : "en-GB")
      : "—";
  };

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div>
        <div className="eyebrow">{t("cleaning.eyebrow")}</div>
        <h1 className="mt-1 text-3xl md:text-4xl">{t("cleaning.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("cleaning.sub")}</p>
      </div>

      <div className="surface overflow-hidden">
        <div className="hidden md:grid grid-cols-12 text-xs uppercase tracking-widest text-muted-foreground bg-secondary/60 px-5 py-3">
          <div className="col-span-3">{t("cleaning.col.area")}</div>
          <div className="col-span-2">{t("cleaning.col.freq")}</div>
          <div className="col-span-2">{t("cleaning.col.chem")}</div>
          <div className="col-span-1">{t("cleaning.col.color")}</div>
          <div className="col-span-2">{t("cleaning.col.last")}</div>
          <div className="col-span-2 text-right">·</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />…
          </div>
        ) : (
          <div className="divide-y divide-border">
            {SCHEDULE.map((r) => (
              <div
                key={r.areaK}
                className="grid grid-cols-1 md:grid-cols-12 px-5 py-4 items-center gap-3"
              >
                <div className="md:col-span-3 flex items-center gap-3">
                  <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    <Sparkles size={16} />
                  </span>
                  <div className="font-medium text-sm">{t(r.areaK)}</div>
                </div>
                <div className="md:col-span-2 text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar size={12} /> {t(r.freqK)}
                </div>
                <div className="md:col-span-2 text-xs">{r.chem}</div>
                <div className="md:col-span-1 text-xs">{t(r.colorK)}</div>
                <div className="md:col-span-2 text-xs text-muted-foreground">
                  {lastFor(r.areaK)}
                </div>
                <div className="md:col-span-2 md:text-right">
                  <button
                    onClick={() => complete(r)}
                    disabled={busy === r.areaK}
                    className="inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-success text-success-foreground px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
                  >
                    {busy === r.areaK ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    {t("cleaning.done") || (lang === "de" ? "Erledigt" : "Done")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
