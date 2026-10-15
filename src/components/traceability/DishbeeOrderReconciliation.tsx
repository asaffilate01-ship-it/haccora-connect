import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/haccora-client";

type ImportedOrder = {
  id: string;
  order_reference: string;
  occurred_at: string;
  received_at: string;
};
type ImportedLine = {
  id: string;
  order_id: string;
  source_line_id: string;
  item_name: string;
  quantity: number;
};
type BatchLink = {
  id: string;
  order_line_id: string;
  batch_id: string;
  evidence_note: string;
  reviewed_at: string;
};
type Lot = {
  id: string;
  batch_code: string;
  product_name: string;
  received_at: string;
  status: "available" | "quarantined";
};
type Props = {
  organizationId: string;
  locationId: string;
  lots: Lot[];
  focusBatchId: string;
};

const db = supabase as any;

export function DishbeeOrderReconciliation({
  organizationId,
  locationId,
  lots,
  focusBatchId,
}: Props) {
  const [orders, setOrders] = useState<ImportedOrder[]>([]);
  const [lines, setLines] = useState<ImportedLine[]>([]);
  const [links, setLinks] = useState<BatchLink[]>([]);
  const [selectedLineId, setSelectedLineId] = useState("");
  const [selectedLotId, setSelectedLotId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setReady(false);
    const [o, l, k] = await Promise.all([
      db.from("dishbee_trace_orders")
        .select("id,order_reference,occurred_at,received_at")
        .eq("organization_id", organizationId).eq("location_id", locationId)
        .order("occurred_at", { ascending: false }).limit(100),
      db.from("dishbee_trace_order_lines")
        .select("id,order_id,source_line_id,item_name,quantity")
        .eq("organization_id", organizationId).eq("location_id", locationId)
        .limit(500),
      db.from("dishbee_trace_batch_links")
        .select("id,order_line_id,batch_id,evidence_note,reviewed_at")
        .eq("organization_id", organizationId).eq("location_id", locationId)
        .limit(1000),
    ]);
    setLoading(false);
    if (o.error || l.error || k.error) {
      setError("Dishbee order reconciliation is unavailable. Do not infer missing or zero exposure.");
      setOrders([]);
      setLines([]);
      setLinks([]);
      return;
    }
    setOrders((o.data ?? []) as ImportedOrder[]);
    setLines((l.data ?? []) as ImportedLine[]);
    setLinks((k.data ?? []) as BatchLink[]);
    setReady(true);
    setError("");
  }, [organizationId, locationId]);

  useEffect(() => {
    setSelectedLineId("");
    setSelectedLotId("");
    setReason("");
    setNotice("");
    void load();
  }, [load]);

  const orderById = useMemo(
    () => new Map(orders.map((order) => [order.id, order])),
    [orders],
  );
  // Only count lines belonging to orders in the selected 100-order window.
  const visibleLines = useMemo(
    () => lines.filter((line) => orderById.has(line.order_id)),
    [lines, orderById],
  );
  const coveredLineIds = useMemo(
    () => new Set(links.map((link) => link.order_line_id)),
    [links],
  );
  const unresolved = visibleLines.filter((line) => !coveredLineIds.has(line.id));
  const selectedLine = visibleLines.find((line) => line.id === selectedLineId);
  const selectedOrder = selectedLine ? orderById.get(selectedLine.order_id) : null;
  const eligibleLots = selectedOrder
    ? lots.filter((lot) => new Date(lot.received_at) <= new Date(selectedOrder.occurred_at))
    : [];

  const impacted = useMemo(() => {
    if (!focusBatchId) return [];
    const lineIds = new Set(
      links.filter((link) => link.batch_id === focusBatchId).map((link) => link.order_line_id),
    );
    return visibleLines
      .filter((line) => lineIds.has(line.id))
      .map((line) => ({
        ...line,
        orderReference: orderById.get(line.order_id)?.order_reference ?? "Unavailable",
      }));
  }, [focusBatchId, links, visibleLines, orderById]);

  const saveLink = async () => {
    if (!ready || loading || busy || !selectedLine || !selectedOrder || !selectedLotId) return;
    if (reason.trim().length < 12 || !eligibleLots.some((lot) => lot.id === selectedLotId)) {
      setError("Choose a lot received before the order and explain its production evidence.");
      return;
    }
    setBusy(true);
    const { error: writeError } = await db.rpc("link_dishbee_trace_batch", {
      p_line_id: selectedLine.id,
      p_batch_id: selectedLotId,
      p_evidence_note: reason.trim(),
    });
    setBusy(false);
    if (writeError) {
      setError("Lot allocation was not saved. Check permissions, site, dates and duplicate links.");
      return;
    }
    setNotice("Manager-reviewed lot link recorded; overall order coverage remains unverified.");
    setSelectedLineId("");
    setSelectedLotId("");
    setReason("");
    await load();
  };

  return (
    <section className="surface p-5 space-y-4" aria-labelledby="dishbee-reconciliation-title">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow">CONNECTED ORDER EVIDENCE</div>
          <h2 id="dishbee-reconciliation-title" className="text-xl font-bold mt-1">
            Dishbee order-to-lot reconciliation
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Source order references arrive only after the Dishbee producer sends authorised
            handed-over events. Ingredient lot attribution remains a separate manager review.
          </p>
        </div>
        <button type="button" className="rounded-lg border p-2" disabled={loading || busy}
          onClick={() => void load()} aria-label="Refresh imported order evidence">
          <RefreshCw size={18} />
        </button>
      </header>
      <div role="note" className="rounded-lg border border-warning/40 p-3 text-sm">
        <AlertTriangle size={16} className="inline mr-2" />
        No automatic lot assignment, completeness certification, external customer alert or
        cross-platform sale reconciliation. Unknown batch links require further investigation.
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="text-sm">{notice}</p>}
      {loading && <p className="text-sm"><Loader2 className="inline animate-spin" size={16} /> Loading source orders…</p>}

      {ready && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Statistic label="Imported orders in window" value={orders.length} />
            <Statistic label="Order lines in window" value={visibleLines.length} />
            <Statistic label="Lines without recorded lot links" value={unresolved.length} />
          </div>
          <p className="text-xs text-muted-foreground">
            Window limited to the latest 100 orders, 500 lines and 1,000 links per premises.
            Linked lines may still be missing other ingredients. Neither this count nor
            zero unmatched lines demonstrates full traceability.
          </p>
          {orders.length === 0 && (
            <p className="rounded-lg border p-3 text-sm">
              No authenticated Dishbee handed-over events have been recorded in this window.
              Confirm the outbound Dishbee webhook is configured before evaluating coverage.
            </p>
          )}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-xs">
                <tr>
                  <th className="p-3">Dishbee order</th>
                  <th className="p-3">Food item</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Lot attribution</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibleLines.map((line) => {
                  const order = orderById.get(line.order_id);
                  const count = links.filter((link) => link.order_line_id === line.id).length;
                  return (
                    <tr key={line.id}>
                      <td className="p-3 font-mono">{order?.order_reference}</td>
                      <td className="p-3">{line.item_name}</td>
                      <td className="p-3">{line.quantity}</td>
                      <td className="p-3">
                        {count ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <CheckCircle2 size={14} /> {count} manager-reviewed link(s); not complete
                          </span>
                        ) : (
                          <span className="text-warning-foreground text-xs">No batch linked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visibleLines.length === 0 && (
                  <tr><td colSpan={4} className="p-3 text-sm">No source order lines in the loaded window.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold">Manager review: attribute a source order item to a lot</h3>
            <label className="block text-sm">
              Order line
              <select className="input mt-1 block w-full" value={selectedLineId}
                onChange={(event) => {
                  setSelectedLineId(event.target.value);
                  setSelectedLotId("");
                  setError("");
                }}>
                <option value="">Select an imported order line</option>
                {visibleLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {orderById.get(line.order_id)?.order_reference} · {line.item_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Supplier lot (received before this order)
              <select className="input mt-1 block w-full" value={selectedLotId}
                onChange={(event) => setSelectedLotId(event.target.value)}>
                <option value="">Select a traceable ingredient lot</option>
                {eligibleLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.batch_code} · {lot.product_name} · {lot.status}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Supporting production record / batch usage evidence
              <textarea className="input mt-1 w-full min-h-20" maxLength={1000} value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain the dated kitchen production log proving this lot was used" />
            </label>
            <button type="button" className="btn-primary px-4 py-2 text-sm"
              disabled={!ready || busy || !selectedLineId || !selectedLotId || reason.trim().length < 12}
              onClick={() => void saveLink()}>
              {busy ? "Saving…" : "Record manager-reviewed lot link"}
            </button>
          </div>

          {focusBatchId && (
            <div className="rounded-lg border border-warning/30 p-4 space-y-2">
              <h3 className="font-semibold">Imported Dishbee orders linked to selected lot</h3>
              {impacted.length ? (
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {impacted.map((line) => (
                    <li key={line.id}>
                      {line.orderReference} · {line.item_name} × {line.quantity}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm">
                  No imported orders have been manually linked to this lot in the loaded window.
                  Exposure remains unknown, not zero.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Statistic({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold text-2xl tabular-nums mt-1">{value}</div>
    </div>
  );
}
