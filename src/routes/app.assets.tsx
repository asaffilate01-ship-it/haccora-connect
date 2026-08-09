import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Printer,
  QrCode,
  Search,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { renderQrDataUrl } from "@/lib/qr";

export const Route = createFileRoute("/app/assets")({ component: AssetsPage });

type Asset = {
  id: string;
  asset_code: string;
  qr_token: string;
  name: string;
  category: string | null;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
  serial: string | null;
  last_service_at: string | null;
  next_service_at: string | null;
  status: string;
  retired_at: string | null;
};

type Label = Asset & { qr: string };

const blankForm = () => ({
  asset_code: `EQ-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
  name: "",
  category: "fridge",
  location: "",
  manufacturer: "",
  model: "",
  serial: "",
  next_service_at: "",
});

function daysUntil(value: string | null) {
  if (!value) return null;
  return Math.ceil((new Date(`${value}T23:59:59`).getTime() - Date.now()) / 86400000);
}

function statusOf(asset: Asset): "ok" | "due" | "overdue" | "attention" | "retired" {
  if (asset.retired_at) return "retired";
  if (asset.status === "attention") return "attention";
  const days = daysUntil(asset.next_service_at);
  if (days !== null && days < 0) return "overdue";
  if (days !== null && days <= 30) return "due";
  return "ok";
}

function AssetsPage() {
  const { user } = useAuth();
  const canManage = user ? can(user.role, "assets.manage", user.actionPermissions) : false;
  const [rows, setRows] = useState<Asset[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(blankForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from("assets")
      .select(
        "id,asset_code,qr_token,name,category,location,manufacturer,model,serial,last_service_at,next_service_at,status,retired_at",
      )
      .order("name");
    if (loadError) setError(loadError.message);
    else setRows((data ?? []) as Asset[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((asset) =>
      [asset.name, asset.asset_code, asset.serial, asset.location, asset.manufacturer, asset.model]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [query, rows]);

  const submit = async () => {
    if (!user?.organizationId || !form.name.trim() || !form.asset_code.trim()) {
      setError("Asset code and name are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase.from("assets").insert({
      organization_id: user.organizationId,
      location_id: user.locationId,
      created_by: user.id,
      asset_code: form.asset_code.trim().toUpperCase(),
      name: form.name.trim(),
      category: form.category,
      location: form.location.trim() || user.location,
      manufacturer: form.manufacturer.trim() || null,
      model: form.model.trim() || null,
      serial: form.serial.trim() || null,
      next_service_at: form.next_service_at || null,
      status: "ok",
    });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm(blankForm());
    setOpen(false);
    await load();
  };

  const printLabels = async () => {
    const active = rows.filter((asset) => !asset.retired_at);
    const origin = window.location.origin;
    const nextLabels = await Promise.all(
      active.map(async (asset) => ({
        ...asset,
        qr: renderQrDataUrl(`${origin}/app/assets/${asset.qr_token}`),
      })),
    );
    setLabels(nextLabels);
    window.setTimeout(() => window.print(), 100);
  };

  const due = rows.filter((asset) => ["due", "overdue"].includes(statusOf(asset))).length;
  const attention = rows.filter((asset) => statusOf(asset) === "attention").length;

  return (
    <div className="p-4 md:p-7 space-y-5">
      <header className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Equipment control</div>
          <h1 className="mt-1 text-2xl md:text-3xl">Assets & maintenance</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Give every item a printable QR identity. Scan it to see details, service history and add
            timestamped evidence.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/assets/scan" className="btn-secondary text-xs">
            <QrCode size={14} /> Scan QR
          </Link>
          {rows.length > 0 && (
            <button onClick={() => void printLabels()} className="btn-secondary text-xs">
              <Printer size={14} /> Print QR labels
            </button>
          )}
          {canManage && (
            <button onClick={() => setOpen((value) => !value)} className="btn-alert-solid text-xs">
              <Plus size={14} /> Add asset
            </button>
          )}
        </div>
      </header>

      <section className="no-print grid grid-cols-3 gap-3">
        <Kpi
          label="Active assets"
          value={rows.filter((asset) => !asset.retired_at).length}
          icon={Wrench}
        />
        <Kpi label="Due ≤ 30 days" value={due} icon={Clock} tone={due ? "warn" : "ok"} />
        <Kpi
          label="Needs action"
          value={attention}
          icon={AlertTriangle}
          tone={attention ? "danger" : "ok"}
        />
      </section>

      {open && canManage && (
        <section className="no-print surface grid gap-3 p-4 md:grid-cols-4">
          <label className="text-xs font-medium">
            Asset code
            <input
              className="field mt-1"
              value={form.asset_code}
              onChange={(event) => setForm({ ...form, asset_code: event.target.value })}
              maxLength={32}
            />
          </label>
          <label className="text-xs font-medium md:col-span-2">
            Equipment name
            <input
              className="field mt-1"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Walk-in fridge 1"
            />
          </label>
          <label className="text-xs font-medium">
            Category
            <select
              className="field mt-1"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              <option value="fridge">Fridge</option>
              <option value="freezer">Freezer</option>
              <option value="probe">Temperature probe</option>
              <option value="oven">Oven</option>
              <option value="dishwasher">Dishwasher</option>
              <option value="extractor">Extractor</option>
              <option value="mixer">Mixer/prep equipment</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-xs font-medium">
            Area/location
            <input
              className="field mt-1"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              placeholder="Main kitchen"
            />
          </label>
          <label className="text-xs font-medium">
            Manufacturer
            <input
              className="field mt-1"
              value={form.manufacturer}
              onChange={(event) => setForm({ ...form, manufacturer: event.target.value })}
            />
          </label>
          <label className="text-xs font-medium">
            Model
            <input
              className="field mt-1"
              value={form.model}
              onChange={(event) => setForm({ ...form, model: event.target.value })}
            />
          </label>
          <label className="text-xs font-medium">
            Serial number
            <input
              className="field mt-1"
              value={form.serial}
              onChange={(event) => setForm({ ...form, serial: event.target.value })}
            />
          </label>
          <label className="text-xs font-medium">
            Next service/check
            <input
              className="field mt-1"
              type="date"
              value={form.next_service_at}
              onChange={(event) => setForm({ ...form, next_service_at: event.target.value })}
            />
          </label>
          <button
            className="btn-alert-solid self-end text-xs md:col-span-3"
            onClick={() => void submit()}
            disabled={busy}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Save and
            create QR
          </button>
        </section>
      )}

      {error && (
        <div
          role="alert"
          className="no-print rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <section className="no-print surface overflow-hidden">
        <div className="border-b border-border p-3">
          <label className="relative block max-w-md">
            <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
            <input
              className="field pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search equipment, code, serial or area"
            />
          </label>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="mr-2 inline animate-spin" />
            Loading equipment…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <QrCode className="mx-auto text-muted-foreground" />
            <div className="mt-2 text-sm font-semibold">No matching equipment</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Owners and managers can add the first asset and print its QR label.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((asset) => (
              <AssetRow key={asset.id} asset={asset} />
            ))}
          </ul>
        )}
      </section>

      <section className="asset-label-sheet">
        {labels.map((asset) => (
          <article className="asset-label" key={asset.id}>
            <img src={asset.qr} alt="" />
            <div>
              <strong>Haccora</strong>
              <h2>{asset.name}</h2>
              <p>{asset.asset_code}</p>
              <p>{asset.location || "Site equipment"}</p>
              <small>Scan to inspect, report or view history</small>
              <small className="font-mono">{asset.qr_token}</small>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function AssetRow({ asset }: { asset: Asset }) {
  const status = statusOf(asset);
  const due = daysUntil(asset.next_service_at);
  const tone =
    status === "ok"
      ? "text-success"
      : status === "retired"
        ? "text-muted-foreground"
        : "text-destructive";
  return (
    <li>
      <Link
        to="/app/assets/$assetId"
        params={{ assetId: asset.qr_token }}
        className="grid items-center gap-2 px-4 py-3 text-sm hover:bg-secondary/50 md:grid-cols-[2fr_1fr_1fr_auto]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary">
            <QrCode size={16} />
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold">{asset.name}</div>
            <div className="truncate text-xs uppercase tracking-wide text-muted-foreground">
              {asset.asset_code} · {asset.category || "equipment"} · {asset.location || "No area"}
            </div>
          </div>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Serial</span>
          <br />
          {asset.serial || "Not recorded"}
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Next due</span>
          <br />
          {due === null ? "Not scheduled" : due < 0 ? `${Math.abs(due)}d overdue` : `${due}d`}
        </div>
        <span className={`text-xs font-bold capitalize ${tone}`}>{status.replace("_", " ")} ›</span>
      </Link>
    </li>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Wrench;
  tone?: "ok" | "warn" | "danger";
}) {
  const colour =
    tone === "danger"
      ? "text-destructive"
      : tone === "warn"
        ? "text-warning-foreground"
        : tone === "ok"
          ? "text-success"
          : "";
  return (
    <div className="surface p-3">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <Icon size={13} className={colour} />
      </div>
      <div className={`mt-1 text-2xl font-bold ${colour}`}>{value}</div>
    </div>
  );
}
