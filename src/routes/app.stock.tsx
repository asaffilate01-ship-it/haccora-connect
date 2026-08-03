import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Boxes, ClipboardList, Loader2, Plus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/app/stock")({ component: StockPage });

interface Item {
  id: string;
  name: string;
  category: string | null;
  qty: number;
  unit: string;
  par: number;
  supplier: string | null;
}

function StockPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const role = user?.role ?? "staff";
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const canEdit = role === "owner" || role === "manager" || role === "chef";

  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("stock_items").select("*").order("name");
    setRows((data ?? []) as Item[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    if (!confirm(t("Artikel löschen?", "Delete item?"))) return;
    await supabase.from("stock_items").delete().eq("id", id);
    load();
  };

  const lowCount = rows.filter((r) => Number(r.qty) < Number(r.par) * 0.5).length;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{t("Bestand", "Inventory")}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">
            {t("Bestand & Inventur", "Stock & stock-take")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t(
              "Bestände live, Par-Level-Warnungen und Inventurabgleich.",
              "Live stock, par-level alerts and stock-take reconciliation.",
            )}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-alert-solid text-sm">
            <Plus size={16} className="inline mr-1.5" />
            {t("Artikel hinzufügen", "Add item")}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Kpi label={t("Artikel", "Items")} value={String(rows.length)} />
        <Kpi
          label={t("Niedrig", "Low stock")}
          value={String(lowCount)}
          tone={lowCount > 0 ? "warning" : "success"}
        />
        <Kpi
          label={t("Kategorien", "Categories")}
          value={String(new Set(rows.map((r) => r.category || "")).size)}
        />
      </div>

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <ClipboardList size={20} className="inline opacity-40 mr-2" />
            {t("Noch keine Artikel.", "No stock items yet.")}
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-12 text-xs uppercase tracking-widest text-muted-foreground bg-secondary/60 px-5 py-3">
              <div className="col-span-4">{t("Artikel", "Item")}</div>
              <div className="col-span-2">{t("Kategorie", "Category")}</div>
              <div className="col-span-2">{t("Bestand", "On hand")}</div>
              <div className="col-span-2">{t("Par", "Par")}</div>
              <div className="col-span-2">{t("Lieferant", "Supplier")}</div>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((s) => {
                const low = Number(s.qty) < Number(s.par) * 0.5;
                return (
                  <li
                    key={s.id}
                    className="grid grid-cols-1 md:grid-cols-12 items-center gap-2 px-5 py-3 text-sm"
                  >
                    <div className="md:col-span-4 flex items-center gap-2">
                      <Boxes size={14} className="text-muted-foreground" />
                      <span className="font-medium">{s.name}</span>
                    </div>
                    <div className="md:col-span-2 text-xs text-muted-foreground">
                      {s.category ?? "—"}
                    </div>
                    <div className="md:col-span-2">
                      <span
                        className={`font-mono text-sm ${low ? "text-destructive font-bold" : ""}`}
                      >
                        {s.qty} {s.unit}
                      </span>
                      {low && (
                        <span className="ml-2 text-[10px] font-bold uppercase text-destructive">
                          {t("Niedrig", "Low")}
                        </span>
                      )}
                    </div>
                    <div className="md:col-span-2 font-mono text-xs text-muted-foreground">
                      {s.par} {s.unit}
                    </div>
                    <div className="md:col-span-2 text-xs flex items-center justify-between">
                      <span>{s.supplier ?? "—"}</span>
                      {canEdit && (
                        <button
                          onClick={() => remove(s.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {showForm && canEdit && (
        <StockForm
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

function StockForm({
  onClose,
  onSaved,
  t,
}: {
  onClose: () => void;
  onSaved: () => void;
  t: (de: string, en: string) => string;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("kg");
  const [par, setPar] = useState("");
  const [supplier, setSupplier] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("stock_items").insert({
      name,
      category: category || null,
      qty: Number(qty) || 0,
      unit,
      par: Number(par) || 0,
      supplier: supplier || null,
      created_by: user?.id,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4">
      <form onSubmit={save} className="surface w-full max-w-md p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">{t("Neuer Artikel", "New item")}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <F label={t("Name", "Name")}>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label={t("Kategorie", "Category")}>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </F>
          <F label={t("Lieferant", "Supplier")}>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </F>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <F label={t("Menge", "Qty")}>
            <input
              type="number"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </F>
          <F label={t("Einheit", "Unit")}>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </F>
          <F label="Par">
            <input
              type="number"
              step="0.01"
              value={par}
              onChange={(e) => setPar(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </F>
        </div>
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
function F({ label, children }: { label: string; children: React.ReactNode }) {
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
  tone?: "success" | "warning";
}) {
  const cls =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning-foreground" : "";
  return (
    <div className="surface p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-3xl mt-2 ${cls}`}>{value}</div>
    </div>
  );
}
