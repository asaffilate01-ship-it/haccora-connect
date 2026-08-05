import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { HeartPulse, PlusCircle, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/app/health")({ component: HealthPage });

type Kind = "fitness_briefing" | "refresher" | "sick_leave" | "fit_note" | "exclusion";
type Status = "active" | "expired" | "cleared" | "excluded";
interface Row {
  id: string;
  staff_name: string;
  kind: Kind;
  status: Status;
  issued_on: string | null;
  expires_on: string | null;
  symptoms: string | null;
  fitness_cleared_on: string | null;
  notes: string | null;
  created_at: string;
}

const KIND: Record<Kind, [string, string]> = {
  fitness_briefing: ["Fitness-to-work briefing", "Fitness-to-work briefing"],
  refresher: ["Auffrischung (jährlich)", "Annual refresher"],
  sick_leave: ["Krankmeldung", "Sick leave"],
  fit_note: ["Gesundheitszeugnis", "Fit-to-work note"],
  exclusion: ["Tätigkeitsverbot", "Work exclusion"],
};

function HealthPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    staff_name: "",
    kind: "fitness_briefing" as Kind,
    issued_on: "",
    expires_on: "",
    symptoms: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("health_register")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setErr(error.message);
    else setItems((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user || !f.staff_name.trim()) return;
    setBusy(true);
    setErr(null);
    const status: Status =
      f.kind === "sick_leave" || f.kind === "exclusion"
        ? "excluded"
        : f.expires_on && new Date(f.expires_on) < new Date()
          ? "expired"
          : "active";
    const { error } = await supabase.from("health_register").insert({
      user_id: user.id,
      staff_name: f.staff_name.trim(),
      kind: f.kind,
      status,
      issued_on: f.issued_on || null,
      expires_on: f.expires_on || null,
      symptoms: f.symptoms.trim() || null,
      notes: f.notes.trim() || null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setF({
      staff_name: "",
      kind: "fitness_briefing",
      issued_on: "",
      expires_on: "",
      symptoms: "",
      notes: "",
    });
    setOpen(false);
    load();
  };

  const clearReturn = async (id: string) => {
    const { error } = await supabase
      .from("health_register")
      .update({ status: "cleared", fitness_cleared_on: new Date().toISOString().slice(0, 10) })
      .eq("id", id);
    if (error) setErr(error.message);
    else load();
  };

  const active = items.filter(
    (i) => i.status === "active" && (i.kind === "fitness_briefing" || i.kind === "refresher"),
  ).length;
  const excluded = items.filter((i) => i.status === "excluded").length;
  const expiringSoon = items.filter(
    (i) =>
      i.expires_on &&
      new Date(i.expires_on) < new Date(Date.now() + 60 * 864e5) &&
      i.status === "active",
  ).length;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{t("Personalgesundheit", "Staff health")}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">
            {t(
              "Food-handler fitness-to-work & Ausschluss-Register",
              "Food-handler fitness-to-work & exclusion register",
            )}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            {t(
              "Erst- und Folgebelehrungen nach § 43 Food-handler health sowie Tätigkeitsverbote bei Erkrankung dokumentieren.",
              "Track Food-handler fitness-to-work briefings, annual refreshers, sick leave and work-exclusion orders per § 42/43 Food-handler health.",
            )}
          </p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="btn-alert-solid text-sm">
          <PlusCircle size={16} className="inline mr-1.5" />
          {t("Eintrag erfassen", "New entry")}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Kpi label={t("Belehrungen aktiv", "Active briefings")} value={active} tone="ok" />
        <Kpi label={t("Läuft ≤ 60 T ab", "Expiring ≤ 60 d")} value={expiringSoon} tone="warn" />
        <Kpi
          label={t("Aktuell ausgeschlossen", "Currently excluded")}
          value={excluded}
          tone="danger"
        />
      </div>

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      {open && (
        <div className="surface p-5 grid md:grid-cols-4 gap-3">
          <input
            value={f.staff_name}
            onChange={(e) => setF({ ...f, staff_name: e.target.value })}
            placeholder={t("Mitarbeiter:in", "Staff name")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2"
          />
          <select
            value={f.kind}
            onChange={(e) => setF({ ...f, kind: e.target.value as Kind })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2"
          >
            {(Object.keys(KIND) as Kind[]).map((k) => (
              <option key={k} value={k}>
                {KIND[k][lang === "de" ? 0 : 1]}
              </option>
            ))}
          </select>
          <input
            value={f.issued_on}
            onChange={(e) => setF({ ...f, issued_on: e.target.value })}
            type="date"
            placeholder={t("Ausgestellt am", "Issued on")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.expires_on}
            onChange={(e) => setF({ ...f, expires_on: e.target.value })}
            type="date"
            placeholder={t("Läuft ab am", "Expires on")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          {(f.kind === "sick_leave" || f.kind === "exclusion") && (
            <input
              value={f.symptoms}
              onChange={(e) => setF({ ...f, symptoms: e.target.value })}
              placeholder={t("Symptome / Grund", "Symptoms / reason")}
              className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          )}
          <input
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder={t("Notiz", "Note")}
            className="md:col-span-4 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="btn-alert-solid text-sm md:col-span-4 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {t("Speichern", "Save")}
          </button>
        </div>
      )}

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            {t("Lade…", "Loading…")}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {t("Noch keine Einträge.", "No entries yet.")}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="p-5 flex items-start gap-4">
                <span
                  className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${i.status === "excluded" ? "bg-[color:var(--color-alert-red)]/15 text-[color:var(--color-alert-red)]" : i.status === "expired" ? "bg-amber-500/15 text-amber-700" : "bg-success/15 text-success"}`}
                >
                  {i.status === "excluded" ? (
                    <AlertTriangle size={18} />
                  ) : i.status === "expired" ? (
                    <HeartPulse size={18} />
                  ) : (
                    <ShieldCheck size={18} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg">{i.staff_name}</div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-0.5">
                    {KIND[i.kind][lang === "de" ? 0 : 1]}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {i.issued_on && (
                      <span>
                        {t("Ausg.", "Issued")}: <b className="text-foreground">{i.issued_on}</b>
                      </span>
                    )}
                    {i.expires_on && (
                      <span>
                        {t("Bis", "Until")}: <b className="text-foreground">{i.expires_on}</b>
                      </span>
                    )}
                    {i.symptoms && (
                      <span>
                        {t("Symptome", "Symptoms")}: {i.symptoms}
                      </span>
                    )}
                    {i.fitness_cleared_on && (
                      <span>
                        {t("Freigegeben", "Cleared")}: {i.fitness_cleared_on}
                      </span>
                    )}
                  </div>
                  {i.notes && <div className="text-xs text-muted-foreground mt-1">{i.notes}</div>}
                </div>
                {i.status === "excluded" && (
                  <button
                    onClick={() => clearReturn(i.id)}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-success text-success-foreground hover:brightness-110"
                  >
                    {t("Freigeben", "Clear to return")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "text-[color:var(--color-alert-red)]"
      : tone === "warn"
        ? "text-amber-600"
        : "text-success";
  return (
    <div className="surface p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-4xl mt-2 ${cls}`}>{value}</div>
    </div>
  );
}
