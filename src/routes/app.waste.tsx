import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, TrendingDown, PlusCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/waste")({ component: WastePage });

interface Row {
  id: string;
  item: string;
  qty: number;
  unit: string;
  reason: string;
  cost_eur: number | null;
  logged_at: string;
  user_id: string;
}

const REASONS_EN = ["Past use-by", "Chain broken", "Wilted", "Over-prep", "Guest waste", "Burnt"];

function WastePage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (_legacy: string, english: string) => english;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    item: "",
    qty: "",
    unit: "kg",
    reason: REASONS_EN[0],
    cost: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("waste_entries")
      .select("*")
      .order("logged_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!user || !form.item.trim() || !form.qty) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("waste_entries").insert({
      user_id: user.id,
      item: form.item.trim(),
      qty: Number(form.qty),
      unit: form.unit,
      reason: form.reason,
      cost_eur: form.cost ? Number(form.cost) : null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setForm({ item: "", qty: "", unit: "kg", reason: REASONS_EN[0], cost: "" });
    setOpen(false);
    load();
  };

  const weekAgo = Date.now() - 7 * 86400000;
  const week = rows.filter((r) => new Date(r.logged_at).getTime() >= weekAgo);
  const weekCost = week.reduce((n, r) => n + (r.cost_eur ?? 0), 0);
  const weekQty = week.reduce((n, r) => n + Number(r.qty ?? 0), 0);

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{"Sustainability"}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{"Waste log"}</h1>
          <p className="text-muted-foreground mt-1">
            {"Live storage · cost & volume at a glance."}
          </p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="btn-alert-solid text-sm">
          <PlusCircle size={16} className="inline mr-1.5" />
          {"New entry"}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Kpi
          label={"Cost loss (week)"}
          value={`£${weekCost.toFixed(2)}`}
          hint={`${week.length} ${"entries"}`}
        />
        <Kpi label={"Volume (week)"} value={`${weekQty.toFixed(1)} kg`} hint={"Target < 25 kg"} />
        <Kpi label={"Total (30d)"} value={String(rows.length)} hint={"entries"} />
      </div>

      {open && (
        <div className="surface p-5 grid md:grid-cols-6 gap-3">
          <input
            value={form.item}
            onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
            placeholder={"Item"}
            className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.qty}
            onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
            placeholder={"Qty"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            placeholder="kg"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <select
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {REASONS_EN.map((r, i) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            value={form.cost}
            onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
            placeholder="£"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <button
            onClick={add}
            disabled={busy || !form.item.trim() || !form.qty}
            className="btn-alert-solid text-sm md:col-span-6 inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
            {"Save"}
          </button>
          {err && (
            <div className="md:col-span-6 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">
              {err}
            </div>
          )}
        </div>
      )}

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            {"Loading…"}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{"Nothing here."}</div>
        ) : (
          <>
            <div className="grid grid-cols-12 text-xs uppercase tracking-widest text-muted-foreground bg-secondary/60 px-5 py-3">
              <div className="col-span-2">{"Date"}</div>
              <div className="col-span-3">{"Item"}</div>
              <div className="col-span-2">{"Qty"}</div>
              <div className="col-span-3">{"Reason"}</div>
              <div className="col-span-2 text-right">{"Cost"}</div>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((e) => (
                <li key={e.id} className="grid grid-cols-12 items-center px-5 py-3 text-sm">
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {new Date(e.logged_at).toLocaleDateString("en-GB")}
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <Trash2 size={14} className="text-destructive" />
                    {e.item}
                  </div>
                  <div className="col-span-2 font-mono text-xs">
                    {e.qty} {e.unit}
                  </div>
                  <div className="col-span-3 text-xs">{e.reason}</div>
                  <div className="col-span-2 text-right font-mono text-xs">
                    {e.cost_eur != null ? `£${Number(e.cost_eur).toFixed(2)}` : "—"}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="surface p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-3xl mt-2">{value}</div>
      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        <TrendingDown size={12} />
        {hint}
      </div>
    </div>
  );
}
