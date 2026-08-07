import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Truck, PlusCircle, Loader2, CheckCircle2, XCircle, PackageCheck } from "lucide-react";

export const Route = createFileRoute("/app/goodsin")({ component: GoodsInPage });

interface Row {
  id: string;
  supplier: string;
  product: string;
  batch_lot: string | null;
  quantity: number | null;
  unit: string | null;
  delivery_temp_c: number | null;
  temp_ok: boolean | null;
  packaging_ok: boolean | null;
  condition_ok: boolean | null;
  allergen_label_ok: boolean | null;
  best_before: string | null;
  use_by: string | null;
  delivery_reference: string | null;
  corrective_action: string | null;
  status: "accepted" | "rejected" | "partial";
  notes: string | null;
  received_at: string;
}

function GoodsInPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (_legacy: string, english: string) => english;
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    supplier: "",
    product: "",
    batch_lot: "",
    quantity: "",
    unit: "kg",
    delivery_temp_c: "",
    best_before: "",
    use_by: "",
    delivery_reference: "",
    packaging_ok: true,
    condition_ok: true,
    allergen_label_ok: true,
    corrective_action: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("goods_in_logs")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(100);
    if (error) setErr(error.message);
    else setItems((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async (status: Row["status"]) => {
    if (!user || !f.supplier.trim() || !f.product.trim()) return;
    setBusy(true);
    setErr(null);
    const tempC = f.delivery_temp_c ? parseFloat(f.delivery_temp_c) : null;
    const tempOk = tempC == null ? null : tempC <= 8;
    const failed = !f.packaging_ok || !f.condition_ok || !f.allergen_label_ok || tempOk === false;
    if (status === "accepted" && failed) {
      setErr("A delivery with a failed check cannot be accepted.");
      return;
    }
    if (status !== "accepted" && f.corrective_action.trim().length < 3) {
      setErr("Record the corrective action for rejected or partially accepted goods.");
      return;
    }
    const { error } = await supabase.from("goods_in_logs").insert({
      user_id: user.id,
      supplier: f.supplier.trim(),
      product: f.product.trim(),
      batch_lot: f.batch_lot.trim() || null,
      quantity: f.quantity ? parseFloat(f.quantity) : null,
      unit: f.unit || null,
      delivery_temp_c: tempC,
      temp_ok: tempOk,
      packaging_ok: f.packaging_ok,
      condition_ok: f.condition_ok,
      allergen_label_ok: f.allergen_label_ok,
      best_before: f.best_before || null,
      use_by: f.use_by || null,
      delivery_reference: f.delivery_reference.trim() || null,
      corrective_action: status === "accepted" ? null : f.corrective_action.trim(),
      status,
      notes: f.notes.trim() || null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setF({
      supplier: "",
      product: "",
      batch_lot: "",
      quantity: "",
      unit: "kg",
      delivery_temp_c: "",
      best_before: "",
      use_by: "",
      delivery_reference: "",
      packaging_ok: true,
      condition_ok: true,
      allergen_label_ok: true,
      corrective_action: "",
      notes: "",
    });
    setOpen(false);
    load();
  };

  const accepted = items.filter((i) => i.status === "accepted").length;
  const rejected = items.filter((i) => i.status === "rejected").length;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">Traceability</div>
          <h1 className="mt-1 text-3xl md:text-4xl">Goods-in inspection</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Record supplier, batch, condition, date and corrective-action evidence at the point of
            delivery.
          </p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="btn-alert-solid text-sm">
          <PlusCircle size={16} className="inline mr-1.5" />
          {"Log delivery"}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Kpi label={"Accepted"} value={accepted} tone="ok" />
        <Kpi label={"Rejected"} value={rejected} tone="danger" />
        <Kpi label={"Total logged"} value={items.length} tone="neutral" />
      </div>

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      {open && (
        <div className="surface p-5 grid md:grid-cols-4 gap-3">
          <input
            value={f.delivery_reference}
            onChange={(e) => setF({ ...f, delivery_reference: e.target.value })}
            placeholder="Delivery note reference"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.supplier}
            onChange={(e) => setF({ ...f, supplier: e.target.value })}
            placeholder={"Supplier"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.product}
            onChange={(e) => setF({ ...f, product: e.target.value })}
            placeholder={"Product"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.batch_lot}
            onChange={(e) => setF({ ...f, batch_lot: e.target.value })}
            placeholder={"Batch / Lot"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.best_before}
            onChange={(e) => setF({ ...f, best_before: e.target.value })}
            type="date"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.use_by}
            onChange={(e) => setF({ ...f, use_by: e.target.value })}
            type="date"
            aria-label="Use-by date"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.quantity}
            onChange={(e) => setF({ ...f, quantity: e.target.value })}
            placeholder={"Qty"}
            type="number"
            step="0.01"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <div className="md:col-span-4 grid gap-2 sm:grid-cols-3">
            {(
              [
                ["packaging_ok", "Packaging intact"],
                ["condition_ok", "Condition acceptable"],
                ["allergen_label_ok", "Allergen information present"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
              >
                <input
                  type="checkbox"
                  checked={f[key]}
                  onChange={(e) => setF({ ...f, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
          <input
            value={f.corrective_action}
            onChange={(e) => setF({ ...f, corrective_action: e.target.value })}
            placeholder="Corrective action for rejected goods"
            className="md:col-span-4 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.unit}
            onChange={(e) => setF({ ...f, unit: e.target.value })}
            placeholder={"Unit"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.delivery_temp_c}
            onChange={(e) => setF({ ...f, delivery_temp_c: e.target.value })}
            placeholder={"Delivery temp °C"}
            type="number"
            step="0.1"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder={"Note"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <div className="md:col-span-4 flex gap-2">
            <button
              onClick={() => submit("accepted")}
              disabled={busy}
              className="btn-alert-solid text-sm inline-flex items-center gap-2"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              <CheckCircle2 size={14} />
              {"Accept"}
            </button>
            <button
              onClick={() => submit("rejected")}
              disabled={busy}
              className="text-sm rounded-full border border-destructive text-destructive px-4 py-2 inline-flex items-center gap-2 hover:bg-destructive/10"
            >
              <XCircle size={14} />
              {"Reject"}
            </button>
          </div>
        </div>
      )}

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            {"Loading…"}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {"No deliveries logged yet."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="p-5 flex items-start gap-4">
                <span
                  className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${i.status === "accepted" ? "bg-success/15 text-success" : i.status === "rejected" ? "bg-[color:var(--color-alert-red)]/15 text-[color:var(--color-alert-red)]" : "bg-amber-500/15 text-amber-700"}`}
                >
                  {i.status === "accepted" ? (
                    <PackageCheck size={18} />
                  ) : i.status === "rejected" ? (
                    <XCircle size={18} />
                  ) : (
                    <Truck size={18} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg">
                    {i.product}{" "}
                    <span className="text-muted-foreground text-sm">· {i.supplier}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {i.batch_lot && (
                      <span>
                        Lot: <b className="text-foreground">{i.batch_lot}</b>
                      </span>
                    )}
                    {i.quantity != null && (
                      <span>
                        {i.quantity} {i.unit ?? ""}
                      </span>
                    )}
                    {i.delivery_temp_c != null && (
                      <span
                        className={
                          i.temp_ok === false
                            ? "text-[color:var(--color-alert-red)] font-semibold"
                            : ""
                        }
                      >
                        {i.delivery_temp_c} °C
                      </span>
                    )}
                    {i.best_before && <span>MHD: {i.best_before}</span>}
                    <span>{new Date(i.received_at).toLocaleString("en-GB")}</span>
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
  tone: "ok" | "danger" | "neutral";
}) {
  const cls =
    tone === "danger"
      ? "text-[color:var(--color-alert-red)]"
      : tone === "ok"
        ? "text-success"
        : "text-foreground";
  return (
    <div className="surface p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-4xl mt-2 ${cls}`}>{value}</div>
    </div>
  );
}
