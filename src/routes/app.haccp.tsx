import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  PlusCircle,
  Loader2,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/app/haccp")({ component: HaccpPage });

interface Hazard {
  id: string;
  step: string;
  hazard: string;
  control: string;
  is_ccp: boolean;
  critical_limit: string | null;
  monitoring: string | null;
  corrective_action: string | null;
  status: string;
}

function HaccpPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const role = user?.role;
  const t = (_legacy: string, english: string) => english;
  const canEdit = role === "owner" || role === "manager" || role === "chef";

  const [rows, setRows] = useState<Hazard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [versionStatus, setVersionStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    step: "",
    hazard: "",
    control: "",
    is_ccp: false,
    critical_limit: "",
    monitoring: "",
    corrective_action: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("haccp_hazards")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setRows((data ?? []) as Hazard[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form.step.trim() || !form.hazard.trim() || !form.control.trim()) {
      setErr("Step, hazard and control are required.");
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("haccp_hazards").insert({
      step: form.step,
      hazard: form.hazard,
      control: form.control,
      is_ccp: form.is_ccp,
      critical_limit: form.critical_limit || null,
      monitoring: form.monitoring || null,
      corrective_action: form.corrective_action || null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setForm({
      step: "",
      hazard: "",
      control: "",
      is_ccp: false,
      critical_limit: "",
      monitoring: "",
      corrective_action: "",
    });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("haccp_hazards")
      .update({ status: "archived" })
      .eq("id", id);
    if (error) setErr(error.message);
    else load();
  };

  const recordVersion = async (approve: boolean) => {
    const statement = approve ? window.prompt("Approval statement (at least 10 characters)") : null;
    if (approve && !statement) return;
    setBusy(true);
    setErr(null);
    setVersionStatus(null);
    const { data, error } = await supabase.rpc("record_haccp_plan", {
      p_plan: rows as unknown as import("@/integrations/supabase/types").Json,
      p_approve: approve,
      p_statement: statement ?? undefined,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else {
      const result = data as Record<string, unknown>;
      setVersionStatus(
        `${"Version"} ${String(result.version ?? "")} · ${String(result.status ?? "")}`,
      );
    }
  };

  const ccpCount = rows.filter((r) => r.is_ccp).length;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">HACCP · Live</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{"HACCP plan"}</h1>
          <p className="text-muted-foreground mt-1">
            {"Hazard analysis and critical control points — live from the database."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 text-success px-3 py-1 text-xs font-semibold">
            <CheckCircle2 size={12} /> {rows.length} {"steps"} · {ccpCount} CCP
          </span>
          {canEdit && (
            <button onClick={() => setOpen((o) => !o)} className="btn-alert-solid text-sm">
              <PlusCircle size={14} className="inline mr-1.5" />
              {"Add step"}
            </button>
          )}
        </div>
      </div>

      <div className="surface p-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <ShieldCheck size={18} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{"Human approval required"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {"Changes to the HACCP plan must be documented and approved."}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link to="/app/inspection" className="btn-outline text-xs py-1.5 px-3">
              <FileText size={14} className="inline mr-1" /> PDF
            </Link>
            {canEdit && (
              <button
                disabled={busy}
                onClick={() => recordVersion(role === "owner" || role === "manager")}
                className="btn-outline text-xs py-1.5 px-3"
              >
                {role === "owner" || role === "manager" ? "Approve version" : "Submit for review"}
              </button>
            )}
          </div>
        </div>
        {versionStatus && (
          <div
            role="status"
            className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-xs text-success"
          >
            {versionStatus}
          </div>
        )}
      </div>

      {open && canEdit && (
        <div className="surface p-5 grid md:grid-cols-3 gap-3">
          <input
            value={form.step}
            onChange={(e) => setForm({ ...form, step: e.target.value })}
            placeholder={"Step (e.g. Goods receiving)"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.hazard}
            onChange={(e) => setForm({ ...form, hazard: e.target.value })}
            placeholder={"Hazard"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.control}
            onChange={(e) => setForm({ ...form, control: e.target.value })}
            placeholder={"Control"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.critical_limit}
            onChange={(e) => setForm({ ...form, critical_limit: e.target.value })}
            placeholder={"Critical limit"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.monitoring}
            onChange={(e) => setForm({ ...form, monitoring: e.target.value })}
            placeholder={"Monitoring"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.corrective_action}
            onChange={(e) => setForm({ ...form, corrective_action: e.target.value })}
            placeholder={"Corrective action"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.is_ccp}
              onChange={(e) => setForm({ ...form, is_ccp: e.target.checked })}
            />
            {"Critical Control Point (CCP)"}
          </label>
          <button onClick={submit} disabled={busy} className="btn-alert-solid text-sm">
            {busy ? (
              <Loader2 size={14} className="inline animate-spin mr-1" />
            ) : (
              <PlusCircle size={14} className="inline mr-1" />
            )}
            {"Save"}
          </button>
        </div>
      )}

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      <div className="surface overflow-hidden">
        <div className="hidden md:grid grid-cols-12 text-xs uppercase tracking-widest text-muted-foreground bg-secondary/60 px-5 py-3">
          <div className="col-span-2">{"Step"}</div>
          <div className="col-span-3">{"Hazard"}</div>
          <div className="col-span-1">CCP</div>
          <div className="col-span-2">{"Limit"}</div>
          <div className="col-span-2">{"Monitoring"}</div>
          <div className="col-span-2">{"Action"}</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            {"Loading…"}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {"No HACCP steps yet. Add your first above."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-1 md:grid-cols-12 px-5 py-4 text-sm items-start gap-2 group"
              >
                <div className="md:col-span-2 font-medium">{r.step}</div>
                <div className="md:col-span-3 text-muted-foreground">
                  {r.hazard}
                  <div className="text-xs mt-0.5 text-foreground/70">{r.control}</div>
                </div>
                <div className="md:col-span-1">
                  {r.is_ccp ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-bold uppercase">
                      <AlertTriangle size={10} /> CCP
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">–</span>
                  )}
                </div>
                <div className="md:col-span-2 text-xs">{r.critical_limit || "–"}</div>
                <div className="md:col-span-2 text-xs text-muted-foreground">
                  {r.monitoring || "–"}
                </div>
                <div className="md:col-span-2 text-xs text-muted-foreground flex items-start justify-between gap-2">
                  <span>{r.corrective_action || "–"}</span>
                  {canEdit && (
                    <button
                      onClick={() => remove(r.id)}
                      className="opacity-0 group-hover:opacity-100 text-destructive"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
