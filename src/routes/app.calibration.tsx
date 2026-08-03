import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Thermometer, PlusCircle, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/app/calibration")({ component: CalibrationPage });

type Method = "ice_bath" | "boiling" | "reference" | "service";
interface Row {
  id: string;
  device: string;
  serial_no: string | null;
  method: Method;
  reference_c: number | null;
  measured_c: number | null;
  deviation_c: number | null;
  passed: boolean;
  next_due: string | null;
  performed_by: string | null;
  performed_at: string;
  notes: string | null;
}

const METHOD: Record<Method, [string, string]> = {
  ice_bath: ["Eiswasser (0 °C)", "Ice bath (0 °C)"],
  boiling: ["Siedeprüfung (100 °C)", "Boiling (100 °C)"],
  reference: ["Referenzthermometer", "Reference thermometer"],
  service: ["Wartungsservice", "Service calibration"],
};

function CalibrationPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    device: "",
    serial_no: "",
    method: "ice_bath" as Method,
    reference_c: "0",
    measured_c: "",
    next_due: "",
    performed_by: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("calibration_logs")
      .select("*")
      .order("performed_at", { ascending: false })
      .limit(100);
    if (error) setErr(error.message);
    else setItems((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user || !f.device.trim()) return;
    setBusy(true);
    setErr(null);
    const ref = parseFloat(f.reference_c || "0");
    const meas = parseFloat(f.measured_c || "0");
    const dev = meas - ref;
    const { error } = await supabase.from("calibration_logs").insert({
      user_id: user.id,
      device: f.device.trim(),
      serial_no: f.serial_no.trim() || null,
      method: f.method,
      reference_c: ref,
      measured_c: meas,
      deviation_c: dev,
      passed: Math.abs(dev) <= 1,
      next_due: f.next_due || null,
      performed_by: f.performed_by.trim() || null,
      notes: f.notes.trim() || null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setF({
      device: "",
      serial_no: "",
      method: "ice_bath",
      reference_c: "0",
      measured_c: "",
      next_due: "",
      performed_by: "",
      notes: "",
    });
    setOpen(false);
    load();
  };

  const dueSoon = items.filter(
    (i) => i.next_due && new Date(i.next_due) < new Date(Date.now() + 30 * 864e5),
  ).length;
  const failed = items.filter((i) => !i.passed).length;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{t("Messmittel & Prüfung", "Instruments & verification")}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">
            {t("Thermometer-Kalibrierung", "Thermometer calibration")}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            {t(
              "Prüfungen Ihrer Kern-, Kühl- und Handmessgeräte nachvollziehbar dokumentieren.",
              "Keep a traceable record of core, cold-store and handheld probe checks.",
            )}
          </p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="btn-alert-solid text-sm">
          <PlusCircle size={16} className="inline mr-1.5" />
          {t("Prüfung erfassen", "Log calibration")}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Kpi label={t("Fällig ≤ 30 T", "Due ≤ 30 d")} value={dueSoon} tone="warn" />
        <Kpi label={t("Fehlgeschlagen", "Failed")} value={failed} tone="danger" />
        <Kpi label={t("Prüfungen gesamt", "Total tests")} value={items.length} tone="neutral" />
      </div>

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      {open && (
        <div className="surface p-5 grid md:grid-cols-4 gap-3">
          <input
            value={f.device}
            onChange={(e) => setF({ ...f, device: e.target.value })}
            placeholder={t("Gerät (z. B. Kernthermometer #1)", "Device (e.g. probe #1)")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={f.serial_no}
            onChange={(e) => setF({ ...f, serial_no: e.target.value })}
            placeholder={t("Seriennr.", "Serial no.")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <select
            value={f.method}
            onChange={(e) => setF({ ...f, method: e.target.value as Method })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {(Object.keys(METHOD) as Method[]).map((k) => (
              <option key={k} value={k}>
                {METHOD[k][lang === "de" ? 0 : 1]}
              </option>
            ))}
          </select>
          <input
            value={f.reference_c}
            onChange={(e) => setF({ ...f, reference_c: e.target.value })}
            type="number"
            step="0.1"
            placeholder={t("Referenz °C", "Ref °C")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.measured_c}
            onChange={(e) => setF({ ...f, measured_c: e.target.value })}
            type="number"
            step="0.1"
            placeholder={t("Gemessen °C", "Measured °C")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.next_due}
            onChange={(e) => setF({ ...f, next_due: e.target.value })}
            type="date"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.performed_by}
            onChange={(e) => setF({ ...f, performed_by: e.target.value })}
            placeholder={t("Durch", "Performed by")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder={t("Notiz", "Note")}
            className="md:col-span-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
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
            {t("Noch keine Kalibrierungen erfasst.", "No calibrations logged yet.")}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="p-5 flex items-start gap-4">
                <span
                  className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${i.passed ? "bg-success/15 text-success" : "bg-[color:var(--color-alert-red)]/15 text-[color:var(--color-alert-red)]"}`}
                >
                  {i.passed ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg">
                    {i.device}{" "}
                    {i.serial_no && (
                      <span className="text-muted-foreground text-sm">· {i.serial_no}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>{METHOD[i.method][lang === "de" ? 0 : 1]}</span>
                    {i.reference_c != null && i.measured_c != null && (
                      <span>
                        {i.reference_c} → <b className="text-foreground">{i.measured_c} °C</b> (Δ{" "}
                        {i.deviation_c?.toFixed(1)})
                      </span>
                    )}
                    {i.next_due && (
                      <span>
                        {t("Nächste Prüfung", "Next due")}:{" "}
                        <b className="text-foreground">{i.next_due}</b>
                      </span>
                    )}
                    <span>
                      {new Date(i.performed_at).toLocaleDateString(
                        lang === "de" ? "de-DE" : "en-GB",
                      )}
                    </span>
                  </div>
                  {i.notes && <div className="text-xs text-muted-foreground mt-1">{i.notes}</div>}
                </div>
                <Thermometer size={18} className="text-muted-foreground/50 shrink-0" />
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
