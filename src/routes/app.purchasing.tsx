import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Truck, PlusCircle, Loader2, X, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/purchasing")({ component: PurchasingPage });

type POStatus = "draft" | "sent" | "partial" | "received" | "rejected";
interface Row {
  id: string;
  po_number: string;
  supplier: string;
  status: POStatus;
  total_eur: number;
  expected_date: string | null;
  line_count: number;
}

function PurchasingPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const role = user?.role ?? "staff";
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const canManage = can(role, "purchasing.approvePO") || can(role, "purchasing.receive");

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("purchase_orders")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const advance = async (r: Row) => {
    const next: POStatus =
      r.status === "draft"
        ? "sent"
        : r.status === "sent"
          ? "partial"
          : r.status === "partial"
            ? "received"
            : r.status;
    if (next === r.status) return;
    await supabase.from("purchase_orders").update({ status: next }).eq("id", r.id);
    load();
  };
  const reject = async (r: Row) => {
    await supabase.from("purchase_orders").update({ status: "rejected" }).eq("id", r.id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm(t("Bestellung löschen?", "Delete PO?"))) return;
    await supabase.from("purchase_orders").delete().eq("id", id);
    load();
  };

  const open = rows.filter(
    (r) => r.status === "sent" || r.status === "partial" || r.status === "draft",
  ).length;
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = rows.filter((r) => r.expected_date === today).length;
  const spend = rows.reduce((s, r) => s + Number(r.total_eur), 0);
  const received = rows.filter((r) => r.status === "received").length;
  const total = rows.length || 1;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{t("Beschaffung", "Procurement")}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">
            {t("Einkauf & Wareneingang", "Purchasing & receiving")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t(
              "Bestellungen erstellen, Lieferungen prüfen und Chargen nachvollziehbar erfassen.",
              "Raise purchase orders, verify deliveries and record batches traceably.",
            )}
          </p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="btn-alert-solid text-sm">
            <PlusCircle size={16} className="inline mr-1.5" />
            {t("Neue Bestellung", "New PO")}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Kpi label={t("Offen", "Open")} value={String(open)} tone="warning" />
        <Kpi
          label={t("Heute Anlieferung", "Deliveries today")}
          value={String(dueToday)}
          tone="info"
        />
        <Kpi label={t("Ausgaben", "Spend")} value={`£${spend.toFixed(0)}`} />
        <Kpi
          label={t("Annahmequote", "Acceptance rate")}
          value={`${Math.round((received / total) * 100)}%`}
          tone="success"
        />
      </div>

      <section>
        <div className="text-sm font-display mb-3">
          {t("Aktive Bestellungen", "Active purchase orders")}
        </div>
        <div className="surface overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Loader2 size={16} className="inline animate-spin mr-2" />…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <ShoppingCart size={20} className="inline opacity-40 mr-2" />
              {t("Keine Bestellungen.", "No purchase orders yet.")}
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-12 text-xs uppercase tracking-widest text-muted-foreground bg-secondary/60 px-5 py-3">
                <div className="col-span-2">{t("Bestellung", "PO")}</div>
                <div className="col-span-3">{t("Lieferant", "Supplier")}</div>
                <div className="col-span-2">ETA</div>
                <div className="col-span-1 text-right">{t("Zeilen", "Lines")}</div>
                <div className="col-span-2 text-right">{t("Summe", "Total")}</div>
                <div className="col-span-2 text-right">{t("Status", "Status")}</div>
              </div>
              <ul className="divide-y divide-border">
                {rows.map((po) => (
                  <li
                    key={po.id}
                    className="grid grid-cols-1 md:grid-cols-12 items-center px-5 py-3 text-sm gap-2"
                  >
                    <div className="md:col-span-2 flex items-center gap-2 font-mono text-xs">
                      <ShoppingCart size={14} className="text-primary" />
                      {po.po_number}
                    </div>
                    <div className="md:col-span-3 flex items-center gap-2">
                      <Truck size={14} className="text-muted-foreground" />
                      {po.supplier}
                    </div>
                    <div className="md:col-span-2 text-xs text-muted-foreground font-mono">
                      {po.expected_date ?? "—"}
                    </div>
                    <div className="md:col-span-1 text-right text-xs font-mono">
                      {po.line_count}
                    </div>
                    <div className="md:col-span-2 text-right font-mono text-xs">
                      £{Number(po.total_eur).toFixed(2)}
                    </div>
                    <div className="md:col-span-2 text-right flex items-center justify-end gap-2">
                      <StatusBadge status={po.status} t={t} />
                      {canManage && po.status !== "received" && po.status !== "rejected" && (
                        <button
                          onClick={() => advance(po)}
                          className="text-[11px] font-semibold text-primary"
                        >
                          →
                        </button>
                      )}
                      {canManage && (po.status === "sent" || po.status === "partial") && (
                        <button
                          onClick={() => reject(po)}
                          className="text-[11px] font-semibold text-destructive"
                        >
                          ✕
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={() => remove(po.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {showForm && canManage && (
        <POForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          t={t}
        />
      )}
    </div>
  );
}

function POForm({
  onClose,
  onSaved,
  t,
}: {
  onClose: () => void;
  onSaved: () => void;
  t: (de: string, en: string) => string;
}) {
  const [supplier, setSupplier] = useState("");
  const [total, setTotal] = useState("");
  const [lines, setLines] = useState("");
  const [eta, setEta] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const po_number = `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`;
    await supabase.from("purchase_orders").insert({
      po_number,
      supplier,
      total_eur: Number(total) || 0,
      line_count: Number(lines) || 0,
      expected_date: eta || null,
      status: "draft",
      created_by: user?.id,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4">
      <form onSubmit={save} className="surface w-full max-w-md p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">{t("Neue Bestellung", "New PO")}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <Field label={t("Lieferant", "Supplier")}>
          <input
            required
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Summe £", "Total £")}>
            <input
              type="number"
              step="0.01"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </Field>
          <Field label={t("Zeilen", "Lines")}>
            <input
              type="number"
              value={lines}
              onChange={(e) => setLines(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <Field label="ETA">
          <input
            type="date"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-full border border-border"
          >
            {t("Abbrechen", "Cancel")}
          </button>
          <button type="submit" disabled={saving} className="btn-alert-solid text-sm">
            {saving ? <Loader2 size={14} className="inline animate-spin mr-1" /> : null}
            {t("Speichern", "Save")}
          </button>
        </div>
      </form>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning-foreground"
        : tone === "info"
          ? "text-primary"
          : "";
  return (
    <div className="surface p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-3xl mt-2 ${toneClass}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: POStatus; t: (a: string, b: string) => string }) {
  const map: Record<POStatus, { cls: string; deL: string; enL: string }> = {
    draft: { cls: "bg-secondary text-muted-foreground", deL: "Entwurf", enL: "Draft" },
    sent: { cls: "bg-primary/10 text-primary", deL: "Gesendet", enL: "Sent" },
    partial: { cls: "bg-warning/20 text-warning-foreground", deL: "Teilweise", enL: "Partial" },
    received: { cls: "bg-success/15 text-success", deL: "Erhalten", enL: "Received" },
    rejected: { cls: "bg-destructive/15 text-destructive", deL: "Abgelehnt", enL: "Rejected" },
  };
  const m = map[status];
  return (
    <span className={`inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded ${m.cls}`}>
      {t(m.deL, m.enL)}
    </span>
  );
}
