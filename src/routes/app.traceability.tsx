import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, Loader2, PackageCheck, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";

export const Route = createFileRoute("/app/traceability")({ component: TraceabilityPage });

type Ingredient = { id: string; name: string };
type Receipt = {
  id: string;
  supplier: string;
  product: string;
  batch_lot: string | null;
  received_at: string;
  delivery_reference: string | null;
  quantity: number | null;
  unit: string | null;
  use_by: string | null;
};
type Batch = {
  id: string;
  ingredient_id: string;
  supplier_name: string;
  product_name: string;
  batch_code: string;
  delivery_reference: string;
  received_at: string;
  use_by: string | null;
  status: "available" | "quarantined";
};
type Allocation = {
  id: string;
  batch_id: string;
  order_source: string;
  order_reference: string;
  item_name: string;
  portions: number;
  attribution: "manual";
  evidence_note: string;
  occurred_at: string;
};
type BatchEvent = {
  id: string;
  batch_id: string;
  event_type: "quarantined" | "released";
  reason: string;
  recorded_at: string;
};
type Recall = {
  id: string;
  product: string;
  status: string;
  batch: string | null;
};

function TraceabilityPage() {
  const { user } = useAuth();
  const canManage = user?.role === "owner" || user?.role === "manager";
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [events, setEvents] = useState<BatchEvent[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [ingredientId, setIngredientId] = useState("");
  const [lot, setLot] = useState("");
  const [product, setProduct] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [deliveryRef, setDeliveryRef] = useState("");
  const [orderSource, setOrderSource] = useState("dishbee");
  const [orderRef, setOrderRef] = useState("");
  const [orderItem, setOrderItem] = useState("");
  const [portions, setPortions] = useState("1");
  const [orderNote, setOrderNote] = useState("");
  const [orderOccurredAt, setOrderOccurredAt] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [recallId, setRecallId] = useState("");

  const load = useCallback(async () => {
    if (!user?.organizationId || !user.locationId || !canManage) {
      setLoading(false);
      setError("Manager access to an active premises is required.");
      return;
    }
    setLoading(true);
    setDataReady(false);
    const [i, g, b, a, r, e] = await Promise.all([
      supabase.from("ingredients").select("id,name").eq("organization_id", user.organizationId),
      supabase
        .from("goods_in_logs")
        .select("id,supplier,product,batch_lot,received_at,delivery_reference,quantity,unit,use_by")
        .eq("organization_id", user.organizationId)
        .eq("location_id", user.locationId)
        .eq("status", "accepted")
        .not("batch_lot", "is", null)
        .order("received_at", { ascending: false })
        .limit(200),
      (supabase as any)
        .from("traceability_batches")
        .select(
          "id,ingredient_id,supplier_name,product_name,batch_code,delivery_reference,received_at,use_by,status",
        )
        .eq("organization_id", user.organizationId)
        .eq("location_id", user.locationId)
        .order("received_at", { ascending: false })
        .limit(200),
      (supabase as any)
        .from("traceability_sale_allocations")
        .select(
          "id,batch_id,order_source,order_reference,item_name,portions,attribution,evidence_note,occurred_at",
        )
        .eq("organization_id", user.organizationId)
        .eq("location_id", user.locationId)
        .order("occurred_at", { ascending: false })
        .limit(500),
      supabase
        .from("recalls")
        .select("id,product,status,batch")
        .eq("organization_id", user.organizationId)
        .or(`location_id.eq.${user.locationId},location_id.is.null`)
        .order("initiated_at", { ascending: false })
        .limit(100),
      (supabase as any)
        .from("traceability_batch_events")
        .select("id,batch_id,event_type,reason,recorded_at")
        .eq("organization_id", user.organizationId)
        .eq("location_id", user.locationId)
        .order("recorded_at", { ascending: false })
        .limit(500),
    ]);
    setLoading(false);
    if (i.error || g.error || b.error || a.error || r.error || e.error) {
      setError(
        "Traceability evidence is incomplete or unavailable. Do not rely on this screen for a release decision.",
      );
      setIngredients([]);
      setReceipts([]);
      setBatches([]);
      setAllocations([]);
      setRecalls([]);
      setEvents([]);
      return;
    }
    setError("");
    setDataReady(true);
    setIngredients((i.data ?? []) as Ingredient[]);
    setReceipts((g.data ?? []) as Receipt[]);
    setBatches((b.data ?? []) as Batch[]);
    setAllocations((a.data ?? []) as Allocation[]);
    setRecalls((r.data ?? []) as Recall[]);
    setEvents((e.data ?? []) as BatchEvent[]);
  }, [user?.organizationId, user?.locationId, canManage]);

  useEffect(() => {
    setSelectedBatch("");
    setMessage("");
    void load();
  }, [load]);

  const batch = batches.find((item) => item.id === selectedBatch) ?? null;
  const matched = useMemo(
    () => allocations.filter((item) => item.batch_id === selectedBatch),
    [allocations, selectedBatch],
  );
  const affectedOrders = useMemo(
    () => new Set(matched.map((item) => `${item.order_source}:${item.order_reference}`)).size,
    [matched],
  );

  const setReceipt = (id: string) => {
    setReceiptId(id);
    const receipt = receipts.find((item) => item.id === id);
    if (receipt) {
      setLot(receipt.batch_lot ?? "");
      setSupplierName(receipt.supplier);
      setProduct(receipt.product);
      setDeliveryRef(receipt.delivery_reference ?? receipt.id);
    } else {
      setLot("");
      setSupplierName("");
      setProduct("");
      setDeliveryRef("");
    }
  };

  const addBatch = async () => {
    if (
      !canManage ||
      saving ||
      loading ||
      !dataReady ||
      !user?.organizationId ||
      !user.locationId
    ) {
      return;
    }
    const receipt = receipts.find((item) => item.id === receiptId);
    if (
      !ingredientId ||
      !lot.trim() ||
      supplierName.trim().length < 2 ||
      product.trim().length < 2 ||
      deliveryRef.trim().length < 4
    ) {
      setError(
        "Choose an ingredient and enter a supplier, product, batch lot and delivery reference.",
      );
      return;
    }
    if (!receipt) {
      setError("Select an accepted batch-labelled goods-in receipt before registering a lot.");
      return;
    }
    setSaving(true);
    const { error: writeError } = await (supabase as any).from("traceability_batches").insert({
      organization_id: user.organizationId,
      location_id: user.locationId,
      ingredient_id: ingredientId,
      goods_in_id: receipt.id,
      supplier_name: supplierName.trim(),
      product_name: product.trim(),
      batch_code: lot.trim(),
      delivery_reference: deliveryRef.trim(),
      received_at: receipt.received_at,
      use_by: receipt.use_by,
      quantity: receipt.quantity && receipt.quantity > 0 ? receipt.quantity : null,
      unit: receipt.unit,
      captured_by: user.id,
    });
    setSaving(false);
    if (writeError) {
      setError("Lot was not recorded. Verify the receipt, lot number and duplicate status.");
      return;
    }
    setMessage("Accepted delivery lot linked to its supplier and ingredient.");
    setReceipt("");
    setIngredientId("");
    await load();
  };

  const addOrder = async () => {
    if (
      !canManage ||
      saving ||
      loading ||
      !dataReady ||
      !user?.organizationId ||
      !user.locationId
    ) {
      return;
    }
    if (
      !batch ||
      batch.status !== "available" ||
      orderRef.trim().length < 3 ||
      orderItem.trim().length < 2 ||
      orderNote.trim().length < 12 ||
      !Number.isSafeInteger(Number(portions)) ||
      Number(portions) < 1 ||
      !orderOccurredAt ||
      !Number.isFinite(new Date(orderOccurredAt).getTime())
    ) {
      setError(
        "Choose an available batch and provide an order reference, food item, portions and allocation evidence.",
      );
      return;
    }
    setSaving(true);
    const { error: writeError } = await (supabase as any)
      .from("traceability_sale_allocations")
      .insert({
        organization_id: user.organizationId,
        location_id: user.locationId,
        batch_id: batch.id,
        order_source: orderSource,
        order_reference: orderRef.trim(),
        item_name: orderItem.trim(),
        portions: Number(portions),
        evidence_note: orderNote.trim(),
        attribution: "manual",
        occurred_at: new Date(orderOccurredAt).toISOString(),
        captured_by: user.id,
      });
    setSaving(false);
    if (writeError) {
      setError("Order allocation could not be saved. Check the batch status and order reference.");
      return;
    }
    setMessage(
      "Manual lot-to-order evidence recorded. This is not a verified Dishbee order import.",
    );
    setOrderRef("");
    setOrderItem("");
    setOrderNote("");
    setPortions("1");
    setOrderOccurredAt("");
    await load();
  };

  const decideHold = async (quarantine: boolean) => {
    if (!canManage || saving || loading || !dataReady || !batch || holdReason.trim().length < 12) {
      setError("A manager and a reason of at least 12 characters are required.");
      return;
    }
    if (
      !window.confirm(
        quarantine
          ? "Quarantine this lot? New allocations will be blocked until an authorised release."
          : "Release this lot? Check linked recalls, physical stock and competent food-safety approval first.",
      )
    ) {
      return;
    }
    setSaving(true);
    const { error: holdError } = await (supabase as any).rpc("set_traceability_batch_hold", {
      p_batch_id: batch.id,
      p_quarantine: quarantine,
      p_reason: holdReason.trim(),
      p_recall_id: recallId || null,
    });
    setSaving(false);
    if (holdError) {
      setError("Quarantine decision failed. Review case status and permissions before retrying.");
      return;
    }
    setMessage(
      quarantine
        ? "Lot is quarantined in Haccora; confirm physical segregation and any external order suspension."
        : "Manager release recorded. Confirm physical stock status and food-safety authorization.",
    );
    setHoldReason("");
    setRecallId("");
    await load();
  };

  if (!canManage) {
    return (
      <main className="p-5 md:p-8">
        <h1>Batch traceability</h1>
        <p className="text-sm text-muted-foreground">Manager access is required.</p>
      </main>
    );
  }

  return (
    <main className="p-5 md:p-8 max-w-7xl space-y-5">
      <header>
        <div className="eyebrow">HACCORA · LOT TRACEABILITY</div>
        <h1 className="text-3xl mt-1">Batch-to-sale recall evidence</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          Connect a received ingredient lot with manually evidenced orders. Inspect affected order
          references and quarantine stock without claiming a complete customer or marketplace
          history.
        </p>
      </header>

      <div role="note" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
        <AlertTriangle size={16} className="inline mr-2" />
        Manual evidence only. Missing allocations, unrecorded sales, shared kitchens and orders from
        Dishbee or delivery partners may not appear. An empty impact list does not prove that no
        customers were affected. Review all source records during a recall.
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="surface p-3 text-sm">
          {message}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Recorded batches" value={batches.length} />
        <Metric
          label="Quarantined lots"
          value={batches.filter((item) => item.status === "quarantined").length}
        />
        <Metric label="Manual order allocations" value={allocations.length} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="surface p-5 space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <PackageCheck size={19} /> 1. Register accepted delivery lot
          </h2>
          <p className="text-xs text-muted-foreground">
            Link a real, accepted goods-in receipt to one ingredient. Rejected and unlabelled
            deliveries cannot be registered.
          </p>
          <label className="block text-sm">
            Goods-in batch receipt
            <select
              className="input w-full mt-1"
              value={receiptId}
              onChange={(e) => setReceipt(e.target.value)}
            >
              <option value="">Choose accepted goods-in receipt</option>
              {receipts.map((receipt) => (
                <option key={receipt.id} value={receipt.id}>
                  {receipt.supplier} · {receipt.product} · {receipt.batch_lot}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Ingredient
            <select
              className="input w-full mt-1"
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
            >
              <option value="">Select ingredient</option>
              {ingredients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Supplier" value={supplierName} onChange={setSupplierName} />
            <Field label="Product" value={product} onChange={setProduct} />
            <Field label="Lot / batch" value={lot} onChange={setLot} />
            <Field label="Delivery reference" value={deliveryRef} onChange={setDeliveryRef} />
          </div>
          <button
            className="btn-primary px-4 py-2 text-sm"
            type="button"
            disabled={saving || loading || !dataReady || !receiptId}
            onClick={() => void addBatch()}
          >
            {saving ? "Saving…" : "Record lot"}
          </button>
          <Link to="/app/goodsin" className="text-xs underline ml-3">
            Open goods-in records
          </Link>
        </div>

        <div className="surface p-5 space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ClipboardList size={19} /> 2. Attribute lot to an order
          </h2>
          <p className="text-xs text-muted-foreground">
            This is a manual staff assertion, including when the reference was originally issued by
            Dishbee. It must not be presented as automatic POS synchronization.
          </p>
          <label className="block text-sm">
            Ingredient lot
            <select
              className="input w-full mt-1"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              <option value="">Select recorded lot</option>
              {batches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.batch_code} · {item.product_name} · {item.status}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Order reference origin
            <select
              className="input w-full mt-1"
              value={orderSource}
              onChange={(e) => setOrderSource(e.target.value)}
            >
              <option value="dishbee">Dishbee reference (manually entered)</option>
              <option value="manual">Till / manual order</option>
              <option value="other">Other partner reference</option>
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Order reference" value={orderRef} onChange={setOrderRef} />
            <Field label="Food item" value={orderItem} onChange={setOrderItem} />
            <Field label="Portions" type="number" value={portions} onChange={setPortions} />
            <Field
              label="Order date/time (local)"
              type="datetime-local"
              value={orderOccurredAt}
              onChange={setOrderOccurredAt}
            />
          </div>
          <label className="block text-sm">
            Why does this lot belong to this order?
            <textarea
              className="input mt-1 w-full min-h-20"
              maxLength={1000}
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Kitchen batch record, prep sheet or verified stock movement"
            />
          </label>
          <button
            className="btn-primary px-4 py-2 text-sm"
            type="button"
            disabled={saving || loading || !dataReady || !batch || batch.status !== "available"}
            onClick={() => void addOrder()}
          >
            Record manual allocation
          </button>
        </div>
      </section>

      <section className="surface p-5 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ShieldAlert size={19} /> 3. Investigate exposure and hold a lot
        </h2>
        <p className="text-sm text-muted-foreground">
          {batch
            ? `${batch.product_name} · lot ${batch.batch_code} · ${batch.status}`
            : "Choose a batch from the allocation panel to inspect exposure."}
        </p>
        {batch && (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              <Metric label="Distinct recorded orders" value={affectedOrders} />
              <Metric label="Allocation records" value={matched.length} />
              <Metric
                label="Recorded portions"
                value={matched.reduce((sum, item) => sum + item.portions, 0)}
              />
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/60 text-xs">
                  <tr>
                    <th className="p-3">Order source</th>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Item</th>
                    <th className="p-3">Portions</th>
                    <th className="p-3">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {matched.map((entry) => (
                    <tr key={entry.id}>
                      <td className="p-3">{entry.order_source} (manual evidence)</td>
                      <td className="p-3 font-mono">{entry.order_reference}</td>
                      <td className="p-3">{entry.item_name}</td>
                      <td className="p-3">{entry.portions}</td>
                      <td className="p-3">{entry.evidence_note}</td>
                    </tr>
                  ))}
                  {matched.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-sm">
                        No linked manual allocations were found. Exposure is unknown, not zero.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border p-3 space-y-2">
              <h3 className="font-bold text-sm">Lot hold/release history</h3>
              {events
                .filter((entry) => entry.batch_id === batch.id)
                .map((entry) => (
                  <p className="text-xs" key={entry.id}>
                    <strong>{entry.event_type}</strong> ·{" "}
                    {new Date(entry.recorded_at).toLocaleString("en-GB")} · {entry.reason}
                  </p>
                ))}
              {!events.some((entry) => entry.batch_id === batch.id) && (
                <p className="text-xs text-muted-foreground">No recorded decisions for this lot.</p>
              )}
            </div>
            <label className="block text-sm">
              Link to an existing recall (optional)
              <select
                className="input block w-full mt-1"
                value={recallId}
                onChange={(e) => setRecallId(e.target.value)}
              >
                <option value="">No linked case selected</option>
                {recalls.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.product} · {item.status} · {item.batch ?? "no lot"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Manager's reason and physical-stock action
              <textarea
                className="input w-full mt-1 min-h-20"
                maxLength={2000}
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="Record segregation, affected inventory and why this action is necessary"
              />
            </label>
            <div className="flex gap-3 flex-wrap">
              {batch.status === "available" ? (
                <button
                  className="btn-alert-solid text-sm px-4 py-2"
                  disabled={saving || loading || !dataReady}
                  onClick={() => void decideHold(true)}
                >
                  Quarantine recorded lot
                </button>
              ) : (
                <button
                  className="rounded-lg border border-border px-4 py-2 text-sm"
                  disabled={saving || loading || !dataReady}
                  onClick={() => void decideHold(false)}
                >
                  Manager release review
                </button>
              )}
              <Link to="/app/recalls" className="underline text-sm self-center">
                View recall cases
              </Link>
            </div>
          </>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        This investigation includes up to 200 recent registered lots and 500 manual allocations for
        the selected premises. It is not a full order ledger, customer notification system, supplier
        recall feed or verified physical withdrawal report. Reconcile external systems and stock
        records before relying on its findings.
      </p>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "datetime-local";
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        className="input block w-full mt-1"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
