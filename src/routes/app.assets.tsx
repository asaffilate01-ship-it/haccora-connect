import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Wrench,
  Thermometer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PlusCircle,
  Loader2,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/app/assets")({ component: AssetsPage });

interface Asset {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  serial: string | null;
  last_service_at: string | null;
  next_service_at: string | null;
  status: string;
}

function AssetsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const role = user?.role;
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const canEdit = role === "owner" || role === "manager";

  const [rows, setRows] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "fridge",
    location: "",
    serial: "",
    next_service_at: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .order("next_service_at", { ascending: true, nullsFirst: false });
    if (error) setErr(error.message);
    else setRows((data ?? []) as Asset[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const daysUntil = (d: string | null) => {
    if (!d) return null;
    return Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
  };
  const computedStatus = (d: string | null): "ok" | "due" | "overdue" => {
    const days = daysUntil(d);
    if (days === null) return "ok";
    if (days < 0) return "overdue";
    if (days <= 14) return "due";
    return "ok";
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setErr(t("Name ist Pflicht.", "Name is required."));
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("assets").insert({
      name: form.name,
      category: form.category,
      location: form.location || null,
      serial: form.serial || null,
      next_service_at: form.next_service_at || null,
      status: computedStatus(form.next_service_at || null),
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setForm({ name: "", category: "fridge", location: "", serial: "", next_service_at: "" });
    setOpen(false);
    load();
  };

  const markServiced = async (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const next = new Date();
    next.setMonth(next.getMonth() + 6);
    const nextIso = next.toISOString().slice(0, 10);
    const { error } = await supabase
      .from("assets")
      .update({ last_service_at: today, next_service_at: nextIso, status: "ok" })
      .eq("id", id);
    if (error) setErr(error.message);
    else load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) setErr(error.message);
    else load();
  };

  const overdue = rows.filter((a) => computedStatus(a.next_service_at) === "overdue").length;
  const due = rows.filter((a) => computedStatus(a.next_service_at) === "due").length;
  const ok = rows.length - overdue - due;
  const compliance = rows.length ? Math.round((ok / rows.length) * 100) : 100;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">{t("Instandhaltung", "Maintenance")}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">
            {t("Geräte & Wartung", "Assets & maintenance")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t(
              "Kalibrierungen, Wartungsintervalle und Reparaturhistorie – auditsicher.",
              "Calibrations, service intervals and repair history in a traceable record.",
            )}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setOpen((o) => !o)} className="btn-alert-solid text-sm">
            <PlusCircle size={14} className="inline mr-1.5" />
            {t("Gerät hinzufügen", "Add asset")}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Kpi label={t("Geräte", "Assets")} value={String(rows.length)} icon={Thermometer} />
        <Kpi
          label={t("Fällig", "Due")}
          value={String(due)}
          icon={Clock}
          tone={due > 0 ? "warning" : undefined}
        />
        <Kpi
          label={t("Überfällig", "Overdue")}
          value={String(overdue)}
          icon={AlertTriangle}
          tone={overdue > 0 ? "destructive" : undefined}
        />
        <Kpi
          label={t("Compliance", "Compliance")}
          value={`${compliance}%`}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      {open && canEdit && (
        <div className="surface p-5 grid md:grid-cols-5 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t("Name", "Name")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="fridge">{t("Kühlschrank", "Fridge")}</option>
            <option value="freezer">{t("Tiefkühler", "Freezer")}</option>
            <option value="oven">{t("Ofen", "Oven")}</option>
            <option value="dishwasher">{t("Spülmaschine", "Dishwasher")}</option>
            <option value="hood">{t("Abzugshaube", "Extractor")}</option>
          </select>
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder={t("Standort", "Location")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.serial}
            onChange={(e) => setForm({ ...form, serial: e.target.value })}
            placeholder={t("Serien-Nr.", "Serial")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.next_service_at}
            onChange={(e) => setForm({ ...form, next_service_at: e.target.value })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="btn-alert-solid text-sm md:col-span-5"
          >
            {busy ? (
              <Loader2 size={14} className="inline animate-spin mr-1" />
            ) : (
              <PlusCircle size={14} className="inline mr-1" />
            )}
            {t("Speichern", "Save")}
          </button>
        </div>
      )}

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      <div className="surface overflow-hidden">
        <div className="hidden md:grid grid-cols-12 text-xs uppercase tracking-widest text-muted-foreground bg-secondary/60 px-5 py-3">
          <div className="col-span-4">{t("Gerät", "Asset")}</div>
          <div className="col-span-2">{t("Serien-Nr.", "Serial")}</div>
          <div className="col-span-2">{t("Letzte Wartung", "Last service")}</div>
          <div className="col-span-2">{t("Nächste fällig", "Next due")}</div>
          <div className="col-span-2 text-right">{t("Status", "Status")}</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            {t("Lade…", "Loading…")}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {t("Noch keine Geräte erfasst.", "No assets recorded yet.")}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((a) => {
              const st = computedStatus(a.next_service_at);
              const days = daysUntil(a.next_service_at);
              return (
                <li
                  key={a.id}
                  className="grid grid-cols-1 md:grid-cols-12 items-center px-5 py-3 text-sm gap-2 group"
                >
                  <div className="md:col-span-4 flex items-center gap-2.5">
                    <span className="h-9 w-9 rounded-lg bg-secondary grid place-items-center">
                      <Wrench size={16} />
                    </span>
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {a.category} {a.location && `· ${a.location}`}
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2 font-mono text-xs">{a.serial || "–"}</div>
                  <div className="md:col-span-2 text-xs text-muted-foreground">
                    {a.last_service_at
                      ? new Date(a.last_service_at).toLocaleDateString(
                          lang === "de" ? "de-DE" : "en-GB",
                        )
                      : "–"}
                  </div>
                  <div className="md:col-span-2 text-xs font-mono">
                    {days === null ? (
                      "–"
                    ) : days < 0 ? (
                      <span className="text-destructive font-bold">
                        {Math.abs(days)}d {t("überfällig", "overdue")}
                      </span>
                    ) : (
                      <span
                        className={days <= 14 ? "text-warning-foreground" : "text-muted-foreground"}
                      >
                        {days}d
                      </span>
                    )}
                  </div>
                  <div className="md:col-span-2 text-right flex items-center justify-end gap-2">
                    {st === "ok" && <CheckCircle2 size={16} className="text-success" />}
                    {st === "due" && <Clock size={16} className="text-warning-foreground" />}
                    {st === "overdue" && <AlertTriangle size={16} className="text-destructive" />}
                    {canEdit && (
                      <>
                        <button
                          onClick={() => markServiced(a.id)}
                          className="text-xs text-primary opacity-0 group-hover:opacity-100"
                        >
                          {t("Gewartet", "Serviced")}
                        </button>
                        <button
                          onClick={() => remove(a.id)}
                          className="text-destructive opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
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
  icon: typeof Wrench;
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
