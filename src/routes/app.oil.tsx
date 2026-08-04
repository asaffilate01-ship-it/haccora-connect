import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Flame, PlusCircle, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/app/oil")({ component: OilPage });

type Status = "ok" | "change_soon" | "changed" | "rejected";
interface Row {
  id: string;
  fryer: string;
  tpm_percent: number | null;
  temperature_c: number | null;
  status: Status;
  changed: boolean;
  notes: string | null;
  tested_at: string;
}

function OilPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ fryer: "", tpm_percent: "", temperature_c: "175", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("oil_tests")
      .select("*")
      .order("tested_at", { ascending: false })
      .limit(100);
    if (error) setErr(error.message);
    else setItems((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const statusFromTpm = (tpm: number): Status =>
    tpm >= 24 ? "rejected" : tpm >= 20 ? "change_soon" : "ok";

  const submit = async () => {
    if (!user || !f.fryer.trim()) return;
    setBusy(true);
    setErr(null);
    const tpm = f.tpm_percent ? parseFloat(f.tpm_percent) : 0;
    const { error } = await supabase.from("oil_tests").insert({
      user_id: user.id,
      fryer: f.fryer.trim(),
      tpm_percent: tpm,
      temperature_c: f.temperature_c ? parseFloat(f.temperature_c) : null,
      status: statusFromTpm(tpm),
      notes: f.notes.trim() || null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setF({ fryer: "", tpm_percent: "", temperature_c: "175", notes: "" });
    setOpen(false);
    load();
  };

  const rejected = items.filter((i) => i.status === "rejected").length;
  const changeSoon = items.filter((i) => i.status === "change_soon").length;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{t("Küche & Qualität", "Kitchen & quality")}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">
            {t("Frittier-Ölqualität (TPM)", "Frying oil quality (TPM)")}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            {t(
              "Regelmäßige TPM-Messungen. Grenzwert: 24 % polare Anteile (§ 2 food hygiene, DGF-Empfehlung).",
              "Regular TPM checks. Legal limit: 24 % total polar material (§ 2 food hygiene, DGF guidance).",
            )}
          </p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="btn-alert-solid text-sm">
          <PlusCircle size={16} className="inline mr-1.5" />
          {t("Messung erfassen", "Log test")}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Kpi label={t("Wechsel bald nötig", "Change soon")} value={changeSoon} tone="warn" />
        <Kpi label={t("Über Grenzwert", "Over limit")} value={rejected} tone="danger" />
        <Kpi label={t("Messungen gesamt", "Total tests")} value={items.length} tone="neutral" />
      </div>

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      {open && (
        <div className="surface p-5 grid md:grid-cols-4 gap-3">
          <input
            value={f.fryer}
            onChange={(e) => setF({ ...f, fryer: e.target.value })}
            placeholder={t("Fritteuse", "Fryer")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={f.tpm_percent}
            onChange={(e) => setF({ ...f, tpm_percent: e.target.value })}
            type="number"
            step="0.1"
            placeholder="TPM %"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.temperature_c}
            onChange={(e) => setF({ ...f, temperature_c: e.target.value })}
            type="number"
            step="1"
            placeholder="°C"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
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
            {t("Noch keine Messungen.", "No tests yet.")}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="p-5 flex items-start gap-4">
                <span
                  className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${i.status === "rejected" ? "bg-[color:var(--color-alert-red)]/15 text-[color:var(--color-alert-red)]" : i.status === "change_soon" ? "bg-amber-500/15 text-amber-700" : "bg-success/15 text-success"}`}
                >
                  {i.status === "rejected" ? (
                    <AlertTriangle size={18} />
                  ) : i.status === "ok" ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Flame size={18} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg">{i.fryer}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {i.tpm_percent != null && (
                      <span>
                        TPM:{" "}
                        <b
                          className={
                            i.status === "rejected"
                              ? "text-[color:var(--color-alert-red)]"
                              : "text-foreground"
                          }
                        >
                          {i.tpm_percent}%
                        </b>
                      </span>
                    )}
                    {i.temperature_c != null && <span>{i.temperature_c} °C</span>}
                    <span>
                      {new Date(i.tested_at).toLocaleString(lang === "de" ? "de-DE" : "en-GB")}
                    </span>
                  </div>
                  {i.notes && <div className="text-xs text-muted-foreground mt-1">{i.notes}</div>}
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
