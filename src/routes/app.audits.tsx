import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Award,
  TrendingUp,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/app/audits")({ component: AuditsPage });

interface Audit {
  id: string;
  title: string;
  audit_type: string;
  score: number | null;
  status: string;
  notes: string | null;
  performed_at: string;
  performed_by: string | null;
}

function AuditsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const role = user?.role;
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const canEdit = role === "owner" || role === "manager" || role === "chef";

  const [rows, setRows] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", audit_type: "internal", score: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audits")
      .select("*")
      .order("performed_at", { ascending: false })
      .limit(50);
    if (error) setErr(error.message);
    else setRows((data ?? []) as Audit[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form.title.trim()) {
      setErr(t("Titel ist Pflicht.", "Title is required."));
      return;
    }
    setBusy(true);
    setErr(null);
    const score = form.score ? parseInt(form.score, 10) : null;
    const { error } = await supabase.from("audits").insert({
      title: form.title,
      audit_type: form.audit_type,
      score,
      notes: form.notes || null,
      status: score !== null ? "completed" : "in_progress",
      performed_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setForm({ title: "", audit_type: "internal", score: "", notes: "" });
    setOpen(false);
    load();
  };

  const completed = rows.filter((r) => r.status === "completed" && r.score !== null);
  const avg = completed.length
    ? Math.round(completed.reduce((s, r) => s + (r.score ?? 0), 0) / completed.length)
    : 0;
  const critical = completed.filter((r) => (r.score ?? 100) < 70).length;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">{t("Interne Kontrolle", "Internal control")}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{t("Interne Audits", "Internal audits")}</h1>
          <p className="text-muted-foreground mt-1">
            {t(
              "Selbstkontrollen erfassen, Findings dokumentieren, Score verfolgen.",
              "Log self-checks, capture findings, track score over time.",
            )}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setOpen((o) => !o)} className="btn-alert-solid text-sm">
            <PlusCircle size={14} className="inline mr-1.5" />
            {t("Audit erfassen", "Log audit")}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Kpi
          label={t("Ø Score", "Avg score")}
          value={completed.length ? `${avg}%` : "–"}
          tone="success"
          icon={Award}
        />
        <Kpi
          label={t("Audits gesamt", "Total audits")}
          value={String(rows.length)}
          icon={ClipboardList}
        />
        <Kpi
          label={t("Kritisch (<70)", "Critical (<70)")}
          value={String(critical)}
          tone={critical > 0 ? "destructive" : undefined}
          icon={AlertTriangle}
        />
        <Kpi
          label={t("Abgeschlossen", "Completed")}
          value={String(completed.length)}
          tone="success"
          icon={TrendingUp}
        />
      </div>

      {open && canEdit && (
        <div className="surface p-5 grid md:grid-cols-4 gap-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={t("Titel (z. B. Küchenrundgang)", "Title (e.g. Kitchen walkthrough)")}
            className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <select
            value={form.audit_type}
            onChange={(e) => setForm({ ...form, audit_type: e.target.value })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="internal">{t("Intern", "Internal")}</option>
            <option value="lmhv">LMHV</option>
            <option value="ifs">IFS Food v8</option>
            <option value="din">DIN 10514</option>
            <option value="allergen">{t("Allergene", "Allergen")}</option>
          </select>
          <input
            type="number"
            min="0"
            max="100"
            value={form.score}
            onChange={(e) => setForm({ ...form, score: e.target.value })}
            placeholder={t("Score %", "Score %")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder={t("Notizen (optional)", "Notes (optional)")}
            className="md:col-span-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <button onClick={submit} disabled={busy} className="btn-alert-solid text-sm">
            {busy ? (
              <Loader2 size={14} className="inline animate-spin mr-1" />
            ) : (
              <PlusCircle size={14} className="inline mr-1" />
            )}
            {t("Speichern", "Save")}
          </button>
        </div>
      )}

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      <div className="surface overflow-hidden">
        <div className="hidden md:grid grid-cols-12 text-xs uppercase tracking-widest text-muted-foreground bg-secondary/60 px-5 py-3">
          <div className="col-span-4">{t("Titel", "Title")}</div>
          <div className="col-span-2">{t("Typ", "Type")}</div>
          <div className="col-span-3">{t("Datum", "Date")}</div>
          <div className="col-span-1 text-right">{t("Status", "Status")}</div>
          <div className="col-span-2 text-right">{t("Score", "Score")}</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            {t("Lade…", "Loading…")}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {t("Noch keine Audits erfasst.", "No audits recorded yet.")}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-1 md:grid-cols-12 items-center px-5 py-3 text-sm gap-2"
              >
                <div className="md:col-span-4">
                  <div className="font-medium">{a.title}</div>
                  {a.notes && <div className="text-xs text-muted-foreground mt-0.5">{a.notes}</div>}
                </div>
                <div className="md:col-span-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {a.audit_type}
                </div>
                <div className="md:col-span-3 text-xs text-muted-foreground">
                  {new Date(a.performed_at).toLocaleString(lang === "de" ? "de-DE" : "en-GB")}
                </div>
                <div className="md:col-span-1 text-right">
                  <span
                    className={`inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded ${a.status === "completed" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"}`}
                  >
                    {a.status === "completed" ? t("Fertig", "Done") : t("Läuft", "In progress")}
                  </span>
                </div>
                <div className="md:col-span-2 text-right">
                  {a.score !== null ? (
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full ${a.score >= 90 ? "bg-success" : a.score >= 80 ? "bg-warning" : "bg-destructive"}`}
                          style={{ width: `${a.score}%` }}
                        />
                      </div>
                      <span
                        className={`font-mono text-xs font-bold ${a.score >= 90 ? "text-success" : a.score >= 80 ? "text-warning-foreground" : "text-destructive"}`}
                      >
                        {a.score}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">–</span>
                  )}
                </div>
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
  icon: Icon,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "destructive";
  icon: typeof ClipboardList;
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning-foreground"
        : tone === "destructive"
          ? "text-destructive"
          : "";
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <Icon size={14} className={`opacity-60 ${toneClass}`} />
      </div>
      <div className={`font-display text-3xl mt-2 ${toneClass}`}>{value}</div>
    </div>
  );
}
