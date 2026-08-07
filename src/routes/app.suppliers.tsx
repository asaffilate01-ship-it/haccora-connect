import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Truck, CheckCircle2, AlertTriangle, Plus, Loader2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/suppliers")({ component: SuppliersPage });

interface Row {
  id: string;
  created_by: string;
  name: string;
  category: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  cert_expires_on: string | null;
  note: string | null;
}

function SuppliersPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (_legacy: string, english: string) => english;
  const canManage = user?.role === "owner" || user?.role === "manager";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    contact: "",
    email: "",
    phone: "",
    cert_expires_on: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!user || !form.name.trim()) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("suppliers").insert({
      created_by: user.id,
      name: form.name.trim(),
      category: form.category || null,
      contact: form.contact || null,
      email: form.email || null,
      phone: form.phone || null,
      cert_expires_on: form.cert_expires_on || null,
      status: "approved",
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setForm({ name: "", category: "", contact: "", email: "", phone: "", cert_expires_on: "" });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("suppliers").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{"Supply chain"}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{"Suppliers"}</h1>
          <p className="text-muted-foreground mt-1">{"Live directory · certificates in sight."}</p>
        </div>
        {canManage && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="btn-alert-solid text-sm inline-flex items-center gap-2"
          >
            <Plus size={14} /> {"New"}
          </button>
        )}
      </div>

      {open && canManage && (
        <div className="surface p-5 grid md:grid-cols-6 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={"Name"}
            className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder={"Category"}
            className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.contact}
            onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
            placeholder={"Contact"}
            className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Email"
            className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder={"Phone"}
            className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.cert_expires_on}
            onChange={(e) => setForm((f) => ({ ...f, cert_expires_on: e.target.value }))}
            placeholder={"Cert."}
            className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <button
            onClick={add}
            disabled={busy || !form.name.trim()}
            className="btn-alert-solid text-sm md:col-span-6 inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {"Save"}
          </button>
          {err && (
            <div className="md:col-span-6 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">
              {err}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="surface p-10 text-center text-sm text-muted-foreground">
          <Loader2 size={16} className="inline animate-spin mr-2" />
          {"Loading…"}
        </div>
      ) : rows.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-muted-foreground">
          {"No suppliers yet. Add your first entry."}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((s) => {
            const expiring =
              s.cert_expires_on &&
              new Date(s.cert_expires_on).getTime() - Date.now() < 30 * 86400000;
            return (
              <div key={s.id} className="surface p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                      <Truck size={16} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg leading-tight truncate">{s.name}</h3>
                      <div className="text-xs text-muted-foreground">
                        {s.category ?? "Uncategorised"}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase shrink-0 ${
                      s.status === "approved"
                        ? "bg-success/15 text-success"
                        : "bg-amber-500/20 text-amber-700"
                    }`}
                  >
                    {s.status === "approved" ? (
                      <CheckCircle2 size={10} />
                    ) : (
                      <AlertTriangle size={10} />
                    )}{" "}
                    {s.status}
                  </span>
                </div>
                <dl className="mt-4 space-y-1 text-xs">
                  {s.contact && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-16">{"Contact"}</dt>
                      <dd>{s.contact}</dd>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-16">Email</dt>
                      <dd className="truncate">{s.email}</dd>
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-16">{"Phone"}</dt>
                      <dd>{s.phone}</dd>
                    </div>
                  )}
                  {s.cert_expires_on && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-16">{"Cert."}</dt>
                      <dd className={expiring ? "text-destructive font-semibold" : ""}>
                        {s.cert_expires_on}
                      </dd>
                    </div>
                  )}
                </dl>
                {canManage && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => remove(s.id)}
                      className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      {"Delete"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
