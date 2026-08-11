import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";
import {
  PackageX,
  AlertTriangle,
  ShieldAlert,
  PlusCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/app/recalls")({ component: RecallsPage });

interface Recall {
  id: string;
  product: string;
  batch: string | null;
  reason: string;
  severity: string;
  status: string;
  initiated_at: string;
}

function RecallsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const role = user?.role;
  const t = (_legacy: string, english: string) => english;
  const canEdit = role === "owner" || role === "manager" || role === "chef";

  const [rows, setRows] = useState<Recall[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product: "", batch: "", reason: "", severity: "high" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("recalls")
      .select("*")
      .order("initiated_at", { ascending: false })
      .limit(50);
    if (error) setErr(error.message);
    else setRows((data ?? []) as Recall[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form.product.trim() || !form.reason.trim()) {
      setErr("Product and reason are required.");
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("recalls").insert({
      product: form.product,
      batch: form.batch || null,
      reason: form.reason,
      severity: form.severity,
      status: "open",
      initiated_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setForm({ product: "", batch: "", reason: "", severity: "high" });
    setOpen(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("recalls").update({ status }).eq("id", id);
    if (error) setErr(error.message);
    else load();
  };

  const active = rows.filter((r) => r.status === "open").length;
  const quarantined = rows.filter((r) => r.status === "quarantined").length;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{"UK food safety · withdrawals and recalls"}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{"Recalls & quarantine"}</h1>
          <p className="text-muted-foreground mt-1">
            {"Track BVL/RASFF alerts, block batches, notify affected customers."}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setOpen((o) => !o)} className="btn-alert-solid text-sm">
            <PlusCircle size={16} className="inline mr-1.5" />
            {"Report recall"}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Kpi
          label={"Open recalls"}
          value={String(active)}
          tone={active > 0 ? "destructive" : undefined}
          icon={AlertTriangle}
        />
        <Kpi
          label={"Quarantined"}
          value={String(quarantined)}
          tone={quarantined > 0 ? "warning" : undefined}
          icon={ShieldAlert}
        />
        <Kpi
          label={"Closed"}
          value={String(rows.filter((r) => r.status === "closed").length)}
          tone="success"
          icon={CheckCircle2}
        />
      </div>

      {open && canEdit && (
        <div className="surface p-5 grid md:grid-cols-4 gap-3">
          <input
            value={form.product}
            onChange={(e) => setForm({ ...form, product: e.target.value })}
            placeholder={"Product"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.batch}
            onChange={(e) => setForm({ ...form, batch: e.target.value })}
            placeholder={"Lot #"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <select
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="high">{"High"}</option>
            <option value="medium">{"Medium"}</option>
            <option value="low">{"Low"}</option>
          </select>
          <button onClick={submit} disabled={busy} className="btn-alert-solid text-sm">
            {busy ? (
              <Loader2 size={14} className="inline animate-spin mr-1" />
            ) : (
              <PlusCircle size={14} className="inline mr-1" />
            )}
            {"Report"}
          </button>
          <input
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder={"Reason"}
            className="md:col-span-4 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
      )}

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      <div className="surface overflow-hidden">
        <div className="hidden md:grid grid-cols-12 text-xs uppercase tracking-widest text-muted-foreground bg-secondary/60 px-5 py-3">
          <div className="col-span-3">{"Product"}</div>
          <div className="col-span-2">{"Lot"}</div>
          <div className="col-span-4">{"Reason"}</div>
          <div className="col-span-1 text-right">{"Sev"}</div>
          <div className="col-span-2 text-right">{"Status"}</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            {"Loading…"}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {"No recalls recorded."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-1 md:grid-cols-12 items-start px-5 py-3 text-sm gap-2"
              >
                <div className="md:col-span-3 flex items-start gap-2">
                  <PackageX
                    size={14}
                    className={`mt-0.5 ${r.severity === "high" ? "text-destructive" : r.severity === "medium" ? "text-warning-foreground" : "text-muted-foreground"}`}
                  />
                  <div>
                    <div className="font-medium">{r.product}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(r.initiated_at).toLocaleDateString("en-GB")}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 font-mono text-xs">{r.batch || "–"}</div>
                <div className="md:col-span-4 text-xs">{r.reason}</div>
                <div className="md:col-span-1 text-right">
                  <span
                    className={`text-[10px] font-bold uppercase ${r.severity === "high" ? "text-destructive" : r.severity === "medium" ? "text-warning-foreground" : "text-muted-foreground"}`}
                  >
                    {r.severity}
                  </span>
                </div>
                <div className="md:col-span-2 text-right">
                  {canEdit && r.status !== "closed" ? (
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                      className="text-[10px] font-bold uppercase rounded border border-border bg-card px-2 py-0.5"
                    >
                      <option value="open">{"Open"}</option>
                      <option value="quarantined">{"Quarantine"}</option>
                      <option value="closed">{"Closed"}</option>
                    </select>
                  ) : (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-success/15 text-success">
                      {"Closed"}
                    </span>
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
  icon: typeof PackageX;
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
