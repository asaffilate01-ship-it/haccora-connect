import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertOctagon,
  PlusCircle,
  ShieldAlert,
  User,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/app/incidents")({
  component: IncidentsPage,
});

type Severity = "low" | "medium" | "high";
type Status = "open" | "investigating" | "closed";
type Kind = "injury" | "illness" | "contamination" | "pest" | "equipment" | "customer";

interface Row {
  id: string;
  kind: Kind;
  severity: Severity;
  status: Status;
  title: string;
  description: string | null;
  root_cause: string | null;
  occurred_at: string;
  closed_at: string | null;
  user_id: string;
}

const CAT_META: Record<Kind, { deL: string; enL: string }> = {
  injury: { deL: "Verletzung", enL: "Injury" },
  illness: { deL: "Erkrankung", enL: "Illness" },
  contamination: { deL: "Kontamination", enL: "Contamination" },
  pest: { deL: "Schädlingsbefall", enL: "Pest sighting" },
  equipment: { deL: "Geräteausfall", enL: "Equipment failure" },
  customer: { deL: "Gastbeschwerde", enL: "Customer complaint" },
};

function IncidentsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const canReport = user ? can(user.role, "incidents.report") : false;
  const canClose = user ? can(user.role, "incidents.close") : false;

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("injury");
  const [sev, setSev] = useState<Severity>("medium");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .order("occurred_at", { ascending: false });
    if (error) setErr(error.message);
    else setItems((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user || !title.trim()) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("incidents").insert({
      user_id: user.id,
      kind,
      severity: sev,
      status: "open",
      title: title.trim(),
      description: desc.trim() || null,
      occurred_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setTitle("");
    setDesc("");
    setOpen(false);
    load();
  };

  const close = async (id: string) => {
    const { error } = await supabase
      .from("incidents")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) setErr(error.message);
    else load();
  };

  const kpis = {
    open: items.filter((i) => i.status !== "closed").length,
    high: items.filter((i) => i.severity === "high").length,
    mtd: items.length,
  };

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{t("Sicherheit & Meldungen", "Safety & reporting")}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">
            {t("Vorfälle & Unfälle", "Incidents & accidents")}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            {t(
              "Meldepflichtige Ereignisse gemäß ArbSchG §16 und IfSG §42 – live gespeichert mit Ursachenanalyse.",
              "Reportable events under ArbSchG §16 and IfSG §42 — stored live with root-cause analysis.",
            )}
          </p>
        </div>
        {canReport && (
          <button onClick={() => setOpen((o) => !o)} className="btn-alert-solid text-sm">
            <PlusCircle size={16} className="inline mr-1.5" />
            {t("Neuer Vorfall", "New incident")}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Kpi label={t("Offen", "Open")} value={kpis.open} tone="warn" />
        <Kpi label={t("Hohe Priorität", "High severity")} value={kpis.high} tone="danger" />
        <Kpi label={t("Gesamt", "Total")} value={kpis.mtd} tone="neutral" />
      </div>

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      {open && canReport && (
        <div className="surface p-5 grid md:grid-cols-4 gap-3">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {(Object.keys(CAT_META) as Kind[]).map((c) => (
              <option key={c} value={c}>
                {lang === "de" ? CAT_META[c].deL : CAT_META[c].enL}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("Was ist passiert?", "What happened?")}
            className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <select
            value={sev}
            onChange={(e) => setSev(e.target.value as Severity)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="low">{t("Niedrig", "Low")}</option>
            <option value="medium">{t("Mittel", "Medium")}</option>
            <option value="high">{t("Hoch", "High")}</option>
          </select>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={t("Beschreibung (optional)", "Description (optional)")}
            className="md:col-span-4 rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-[70px]"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="btn-alert-solid text-sm md:col-span-4 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {t("Melden", "Report")}
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
            {t("Keine Vorfälle. ", "No incidents yet. ")}
            {canReport && t("Melden Sie den ersten oben.", "Report the first one above.")}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="p-5 flex items-start gap-4">
                <span
                  className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${
                    i.severity === "high"
                      ? "bg-[color:var(--color-alert-red)]/15 text-[color:var(--color-alert-red)]"
                      : i.severity === "medium"
                        ? "bg-amber-500/15 text-amber-700"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i.severity === "high" ? <ShieldAlert size={18} /> : <AlertOctagon size={18} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      {lang === "de" ? CAT_META[i.kind].deL : CAT_META[i.kind].enL}
                    </span>
                    <StatusChip status={i.status} lang={lang} />
                  </div>
                  <div className="font-display text-lg mt-0.5">{i.title}</div>
                  {i.description && (
                    <div className="text-sm text-muted-foreground mt-1">{i.description}</div>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <User size={11} />
                      {i.user_id === user?.id ? user?.name.split(" ")[0] : "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(i.occurred_at).toLocaleString(lang === "de" ? "de-DE" : "en-GB")}
                    </span>
                  </div>
                  {i.root_cause && (
                    <div className="mt-2 text-xs bg-secondary/60 rounded-lg px-3 py-2">
                      <span className="font-bold">{t("Ursache", "Root cause")}: </span>
                      {i.root_cause}
                    </div>
                  )}
                </div>
                {i.status !== "closed" && canClose && (
                  <button
                    onClick={() => close(i.id)}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-success text-success-foreground hover:brightness-110"
                  >
                    <CheckCircle2 size={12} className="inline mr-1" />
                    {t("Abschließen", "Close")}
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
  tone: "warn" | "danger" | "neutral";
}) {
  const cls =
    tone === "danger"
      ? "text-[color:var(--color-alert-red)]"
      : tone === "warn"
        ? "text-amber-600"
        : "text-foreground";
  return (
    <div className="surface p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-4xl mt-2 ${cls}`}>{value}</div>
    </div>
  );
}

function StatusChip({ status, lang }: { status: Status; lang: "de" | "en" }) {
  const map = {
    open: {
      de: "Offen",
      en: "Open",
      cls: "bg-[color:var(--color-alert-red)]/15 text-[color:var(--color-alert-red)]",
    },
    investigating: {
      de: "In Bearbeitung",
      en: "Investigating",
      cls: "bg-amber-100 text-amber-800",
    },
    closed: { de: "Abgeschlossen", en: "Closed", cls: "bg-success/15 text-success" },
  } as const;
  const m = map[status];
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${m.cls}`}>
      {lang === "de" ? m.de : m.en}
    </span>
  );
}
