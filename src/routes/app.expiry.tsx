import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarClock,
  Package,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/app/expiry")({ component: ExpiryPage });

interface Row {
  id: string;
  user_id: string;
  name: string;
  location: string | null;
  batch: string | null;
  qty: number | null;
  unit: string | null;
  expires_on: string;
  status: string;
  note: string | null;
}

function daysUntil(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

function ExpiryPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "expired" | "soon" | "ok">("soon");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    location: "",
    batch: "",
    qty: "",
    unit: "kg",
    expires_on: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expiry_items")
      .select("*")
      .eq("status", "active")
      .order("expires_on", { ascending: true })
      .limit(200);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const enriched = useMemo(() => rows.map((r) => ({ ...r, d: daysUntil(r.expires_on) })), [rows]);
  const filtered = enriched.filter((i) =>
    tab === "all"
      ? true
      : tab === "expired"
        ? i.d < 0
        : tab === "soon"
          ? i.d >= 0 && i.d <= 3
          : i.d > 3,
  );
  const stats = {
    expired: enriched.filter((i) => i.d < 0).length,
    soon: enriched.filter((i) => i.d >= 0 && i.d <= 3).length,
    ok: enriched.filter((i) => i.d > 3).length,
  };

  const add = async () => {
    if (!user || !form.name.trim() || !form.expires_on) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("expiry_items").insert({
      user_id: user.id,
      name: form.name.trim(),
      location: form.location || null,
      batch: form.batch || null,
      qty: form.qty ? Number(form.qty) : null,
      unit: form.unit || null,
      expires_on: form.expires_on,
      status: "active",
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setForm({ name: "", location: "", batch: "", qty: "", unit: "kg", expires_on: "" });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("expiry_items")
      .update({ status: "removed", note: "Archived from active expiry tracking" })
      .eq("id", id);
    if (error) setErr(error.message);
    load();
  };

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="eyebrow">{t("Traceability", "Traceability")}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{t("MHD & Chargen", "Use-by & batches")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("Live gespeichert · Filter nach Fälligkeit.", "Live storage · filter by urgency.")}
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="btn-alert-solid text-sm inline-flex items-center gap-2"
        >
          <Plus size={14} /> {t("Artikel", "New item")}
        </button>
      </div>

      {open && (
        <div className="surface p-5 grid md:grid-cols-6 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t("Artikel", "Item")}
            className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder={t("Ort", "Location")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.batch}
            onChange={(e) => setForm((f) => ({ ...f, batch: e.target.value }))}
            placeholder={t("Charge", "Batch")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.qty}
            onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
            placeholder={t("Menge", "Qty")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.expires_on}
            onChange={(e) => setForm((f) => ({ ...f, expires_on: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <button
            onClick={add}
            disabled={busy || !form.name.trim() || !form.expires_on}
            className="btn-alert-solid text-sm md:col-span-6 inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{" "}
            {t("Speichern", "Save")}
          </button>
          {err && (
            <div className="md:col-span-6 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">
              {err}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile
          tone="critical"
          icon={AlertTriangle}
          value={stats.expired}
          label={t("Abgelaufen", "Expired")}
        />
        <Tile
          tone="warning"
          icon={CalendarClock}
          value={stats.soon}
          label={t("Bald fällig (≤3 T.)", "Due soon (≤3d)")}
        />
        <Tile tone="ok" icon={CheckCircle2} value={stats.ok} label={t("Im Zeitplan", "On track")} />
      </div>

      <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 w-fit">
        {(["soon", "expired", "ok", "all"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide transition ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {k === "soon"
              ? t("Bald", "Soon")
              : k === "expired"
                ? t("Abgelaufen", "Expired")
                : k === "ok"
                  ? t("Ok", "Ok")
                  : t("Alle", "All")}
          </button>
        ))}
      </div>

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            {t("Lade…", "Loading…")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            {t("Keine Einträge.", "Nothing here.")}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((i) => {
              const status = i.d < 0 ? "expired" : i.d <= 3 ? "soon" : "ok";
              const badgeCls =
                status === "expired"
                  ? "bg-destructive/10 text-destructive"
                  : status === "soon"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-success/10 text-success";
              const label =
                i.d < 0 ? t(`Vor ${-i.d} T.`, `${-i.d}d ago`) : t(`in ${i.d} T.`, `in ${i.d}d`);
              return (
                <div
                  key={i.id}
                  className="grid grid-cols-1 md:grid-cols-12 px-5 py-4 items-center gap-3"
                >
                  <div className="md:col-span-4 flex items-center gap-3">
                    <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
                      <Package size={16} />
                    </span>
                    <div>
                      <div className="font-medium text-sm">{i.name}</div>
                      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        {i.batch ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-3 text-xs">{i.location ?? "—"}</div>
                  <div className="md:col-span-2 text-xs">
                    {i.qty ? `${i.qty} ${i.unit ?? ""}` : "—"}
                  </div>
                  <div className="md:col-span-2 text-xs">
                    <div>{i.expires_on}</div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase mt-1 ${badgeCls}`}
                    >
                      {label}
                    </span>
                  </div>
                  <div className="md:col-span-1 md:text-right">
                    <button
                      onClick={() => remove(i.id)}
                      className="text-muted-foreground hover:text-destructive transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({
  tone,
  icon: Icon,
  value,
  label,
}: {
  tone: "critical" | "warning" | "ok";
  icon: typeof AlertTriangle;
  value: number;
  label: string;
}) {
  const cls =
    tone === "critical"
      ? "bg-destructive/10 text-destructive"
      : tone === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-success/10 text-success";
  return (
    <div className="surface p-5 flex items-center gap-4">
      <span className={`h-11 w-11 rounded-xl grid place-items-center ${cls}`}>
        <Icon size={20} />
      </span>
      <div>
        <div className="text-2xl font-display leading-none">{value}</div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}
