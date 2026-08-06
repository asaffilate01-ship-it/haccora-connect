import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  Plus,
  Printer,
  QrCode,
  Save,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { renderQrDataUrl } from "@/lib/qr";

export const Route = createFileRoute("/app/assets/$assetId")({ component: AssetDetailPage });

type Asset = {
  id: string;
  organization_id: string | null;
  location_id: string | null;
  asset_code: string;
  qr_token: string;
  name: string;
  category: string | null;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
  serial: string | null;
  purchase_date: string | null;
  warranty_expires_at: string | null;
  last_service_at: string | null;
  next_service_at: string | null;
  notes: string | null;
  status: string;
  retired_at: string | null;
};
type AssetEvent = {
  id: string;
  event_type: string;
  outcome: string;
  title: string;
  notes: string | null;
  measured_value: number | null;
  measured_unit: string | null;
  next_due_at: string | null;
  recorded_by_name: string;
  recorded_at: string;
};

const emptyEvent = {
  event_type: "inspection",
  outcome: "pass",
  title: "",
  notes: "",
  measured_value: "",
  measured_unit: "",
  next_due_at: "",
};

function AssetDetailPage() {
  const { assetId } = Route.useParams();
  const { user } = useAuth();
  const canManage = user?.role === "owner" || user?.role === "manager";
  const readOnly = user?.role === "inspector";
  const [asset, setAsset] = useState<Asset | null>(null);
  const [events, setEvents] = useState<AssetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(emptyEvent);
  const [edit, setEdit] = useState({
    name: "",
    location: "",
    manufacturer: "",
    model: "",
    serial: "",
    next_service_at: "",
    notes: "",
  });
  const [qr, setQr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const assetResult = await supabase
      .from("assets")
      .select("*")
      .eq("qr_token", assetId)
      .maybeSingle();
    if (assetResult.error || !assetResult.data) {
      setError(
        assetResult.error?.message || "Equipment not found or your access does not include it.",
      );
      setLoading(false);
      return;
    }
    const nextAsset = assetResult.data as Asset;
    const eventResult = await supabase
      .from("asset_events")
      .select(
        "id,event_type,outcome,title,notes,measured_value,measured_unit,next_due_at,recorded_by_name,recorded_at",
      )
      .eq("asset_id", nextAsset.id)
      .order("recorded_at", { ascending: false })
      .limit(250);
    setAsset(nextAsset);
    setEvents((eventResult.data ?? []) as AssetEvent[]);
    setEdit({
      name: nextAsset.name,
      location: nextAsset.location || "",
      manufacturer: nextAsset.manufacturer || "",
      model: nextAsset.model || "",
      serial: nextAsset.serial || "",
      next_service_at: nextAsset.next_service_at || "",
      notes: nextAsset.notes || "",
    });
    if (eventResult.error) setError(eventResult.error.message);
    setLoading(false);
  }, [assetId]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!asset || typeof window === "undefined") return;
    setQr(renderQrDataUrl(`${window.location.origin}/app/assets/${asset.qr_token}`));
  }, [asset]);

  const addEvent = async () => {
    if (!asset?.organization_id || !user || form.title.trim().length < 2) {
      setError("Add a short event title before saving.");
      return;
    }
    setBusy(true);
    setError(null);
    const measured = form.measured_value.trim() ? Number(form.measured_value) : null;
    const { error: insertError } = await supabase.from("asset_events").insert({
      organization_id: asset.organization_id,
      location_id: asset.location_id,
      asset_id: asset.id,
      event_type: form.event_type,
      outcome: form.outcome,
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      measured_value: Number.isFinite(measured) ? measured : null,
      measured_unit: form.measured_unit.trim() || null,
      next_due_at: form.next_due_at ? new Date(`${form.next_due_at}T12:00:00`).toISOString() : null,
      recorded_by: user.id,
    });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm(emptyEvent);
    setEventOpen(false);
    await load();
  };

  const saveDetails = async () => {
    if (!asset || edit.name.trim().length < 2) return;
    setBusy(true);
    const { error: updateError } = await supabase
      .from("assets")
      .update({
        name: edit.name.trim(),
        location: edit.location.trim() || null,
        manufacturer: edit.manufacturer.trim() || null,
        model: edit.model.trim() || null,
        serial: edit.serial.trim() || null,
        next_service_at: edit.next_service_at || null,
        notes: edit.notes.trim() || null,
      })
      .eq("id", asset.id);
    setBusy(false);
    if (updateError) setError(updateError.message);
    else {
      setEditOpen(false);
      await load();
    }
  };

  const retire = async () => {
    if (
      !asset ||
      !window.confirm("Retire this asset? Its QR and complete history will remain available.")
    )
      return;
    const { error: updateError } = await supabase
      .from("assets")
      .update({ retired_at: new Date().toISOString(), status: "retired" })
      .eq("id", asset.id);
    if (updateError) setError(updateError.message);
    else await load();
  };

  const timeline = useMemo(
    () => events.map((event, index) => ({ ...event, latest: index === 0 })),
    [events],
  );

  if (loading)
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        <Loader2 size={16} className="mr-2 inline animate-spin" />
        Loading equipment history…
      </div>
    );
  if (!asset)
    return (
      <div className="p-6">
        <div className="surface p-6 text-sm text-destructive">{error}</div>
        <Link to="/app/assets" className="mt-3 inline-flex text-sm text-primary">
          Back to assets
        </Link>
      </div>
    );

  return (
    <div className="p-4 md:p-7 space-y-5">
      <header className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/app/assets"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground"
          >
            <ArrowLeft size={12} /> Assets
          </Link>
          <div className="eyebrow">
            {asset.asset_code} · {asset.location || "Equipment"}
          </div>
          <h1 className="mt-1 text-2xl md:text-3xl">{asset.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {[asset.manufacturer, asset.model, asset.serial && `Serial ${asset.serial}`]
              .filter(Boolean)
              .join(" · ") || "Equipment details not yet completed"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary text-xs" onClick={() => window.print()}>
            <Printer size={14} /> Print label
          </button>
          {canManage && (
            <button
              className="btn-secondary text-xs"
              onClick={() => setEditOpen((value) => !value)}
            >
              <Wrench size={14} /> Edit details
            </button>
          )}
          {!readOnly && !asset.retired_at && (
            <button
              className="btn-alert-solid text-xs"
              onClick={() => setEventOpen((value) => !value)}
            >
              <Plus size={14} /> Add record
            </button>
          )}
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="no-print rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <section className="no-print grid gap-3 md:grid-cols-[220px_1fr]">
        <div className="surface p-4 text-center">
          <img className="mx-auto h-36 w-36" src={qr} alt={`QR code for ${asset.name}`} />
          <div className="mt-2 font-mono text-xs font-bold">{asset.asset_code}</div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            The QR opens this protected record. Sign-in and tenant permissions are still required.
          </p>
        </div>
        <div className="surface grid grid-cols-2 gap-px overflow-hidden bg-border md:grid-cols-4">
          <Fact
            label="Status"
            value={asset.retired_at ? "Retired" : asset.status}
            icon={asset.status === "attention" ? AlertTriangle : CheckCircle2}
          />
          <Fact
            label="Last serviced"
            value={
              asset.last_service_at
                ? new Date(asset.last_service_at).toLocaleDateString("en-GB")
                : "No record"
            }
            icon={History}
          />
          <Fact
            label="Next due"
            value={
              asset.next_service_at
                ? new Date(asset.next_service_at).toLocaleDateString("en-GB")
                : "Not scheduled"
            }
            icon={Clock}
          />
          <Fact label="History" value={`${events.length} records`} icon={ShieldCheck} />
          <div className="col-span-2 bg-card p-4 text-xs">
            <span className="text-muted-foreground">Equipment</span>
            <p className="mt-1">
              {asset.category || "Other"} · {asset.manufacturer || "Maker not recorded"} ·{" "}
              {asset.model || "Model not recorded"}
            </p>
          </div>
          <div className="col-span-2 bg-card p-4 text-xs">
            <span className="text-muted-foreground">Notes</span>
            <p className="mt-1 whitespace-pre-wrap">{asset.notes || "No standing notes."}</p>
          </div>
        </div>
      </section>

      {editOpen && canManage && (
        <section className="no-print surface grid gap-3 p-4 md:grid-cols-3">
          <Field
            label="Name"
            value={edit.name}
            set={(value) => setEdit({ ...edit, name: value })}
          />
          <Field
            label="Area/location"
            value={edit.location}
            set={(value) => setEdit({ ...edit, location: value })}
          />
          <Field
            label="Serial"
            value={edit.serial}
            set={(value) => setEdit({ ...edit, serial: value })}
          />
          <Field
            label="Manufacturer"
            value={edit.manufacturer}
            set={(value) => setEdit({ ...edit, manufacturer: value })}
          />
          <Field
            label="Model"
            value={edit.model}
            set={(value) => setEdit({ ...edit, model: value })}
          />
          <label className="text-xs font-medium">
            Next service/check
            <input
              className="field mt-1"
              type="date"
              value={edit.next_service_at}
              onChange={(event) => setEdit({ ...edit, next_service_at: event.target.value })}
            />
          </label>
          <label className="text-xs font-medium md:col-span-3">
            Standing notes
            <textarea
              className="field mt-1 min-h-20"
              value={edit.notes}
              onChange={(event) => setEdit({ ...edit, notes: event.target.value })}
              maxLength={4000}
            />
          </label>
          <div className="flex gap-2 md:col-span-3">
            <button
              className="btn-alert-solid flex-1 text-xs"
              disabled={busy}
              onClick={() => void saveDetails()}
            >
              <Save size={14} /> Save details
            </button>
            <button className="text-xs text-destructive" onClick={() => void retire()}>
              Retire asset
            </button>
          </div>
        </section>
      )}

      {eventOpen && !readOnly && (
        <section className="no-print surface grid gap-3 p-4 md:grid-cols-4">
          <label className="text-xs font-medium">
            Record type
            <select
              className="field mt-1"
              value={form.event_type}
              onChange={(event) => setForm({ ...form, event_type: event.target.value })}
            >
              <option value="inspection">Inspection/check</option>
              <option value="maintenance">Maintenance</option>
              <option value="repair">Repair</option>
              <option value="calibration">Calibration</option>
              <option value="cleaning">Deep clean</option>
              <option value="issue">Issue/fault</option>
              <option value="movement">Location change</option>
              <option value="service">External service</option>
            </select>
          </label>
          <label className="text-xs font-medium">
            Outcome
            <select
              className="field mt-1"
              value={form.outcome}
              onChange={(event) => setForm({ ...form, outcome: event.target.value })}
            >
              <option value="pass">Pass</option>
              <option value="completed">Completed</option>
              <option value="monitoring">Monitor</option>
              <option value="fail">Fail</option>
              <option value="open">Open issue</option>
            </select>
          </label>
          <label className="text-xs font-medium md:col-span-2">
            Title
            <input
              className="field mt-1"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Door seal inspected"
              maxLength={160}
            />
          </label>
          <label className="text-xs font-medium">
            Reading
            <input
              className="field mt-1"
              type="number"
              step="0.1"
              value={form.measured_value}
              onChange={(event) => setForm({ ...form, measured_value: event.target.value })}
              placeholder="Optional"
            />
          </label>
          <Field
            label="Unit"
            value={form.measured_unit}
            set={(value) => setForm({ ...form, measured_unit: value })}
            placeholder="°C, bar, ppm…"
          />
          <label className="text-xs font-medium">
            Next due
            <input
              className="field mt-1"
              type="date"
              value={form.next_due_at}
              onChange={(event) => setForm({ ...form, next_due_at: event.target.value })}
            />
          </label>
          <div />
          <label className="text-xs font-medium md:col-span-4">
            Details and action taken
            <textarea
              className="field mt-1 min-h-24"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              maxLength={4000}
              placeholder="What was checked, found and done?"
            />
          </label>
          <button
            className="btn-alert-solid text-xs md:col-span-4"
            disabled={busy}
            onClick={() => void addEvent()}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Save
            timestamped record
          </button>
        </section>
      )}

      <section className="no-print surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-bold">Complete history</h2>
            <p className="text-[10px] text-muted-foreground">
              Append-only records; staff cannot edit or delete saved evidence.
            </p>
          </div>
          <History size={16} className="text-muted-foreground" />
        </div>
        {timeline.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No checks or maintenance recorded yet.
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {timeline.map((event) => (
              <li
                key={event.id}
                className="grid gap-2 px-4 py-3 text-xs md:grid-cols-[120px_1fr_auto]"
              >
                <div>
                  <span
                    className={`font-bold uppercase ${["fail", "open"].includes(event.outcome) ? "text-destructive" : "text-success"}`}
                  >
                    {event.outcome}
                  </span>
                  <div className="mt-1 text-[10px] capitalize text-muted-foreground">
                    {event.event_type}
                  </div>
                </div>
                <div>
                  <div className="font-semibold">{event.title}</div>
                  {event.notes && (
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{event.notes}</p>
                  )}
                  {event.measured_value !== null && (
                    <p className="mt-1 font-mono">
                      {event.measured_value} {event.measured_unit}
                    </p>
                  )}
                </div>
                <div className="text-right text-[10px] text-muted-foreground">
                  <div>{new Date(event.recorded_at).toLocaleString("en-GB")}</div>
                  <div className="mt-1">{event.recorded_by_name}</div>
                  {event.next_due_at && (
                    <div className="mt-1">
                      Next: {new Date(event.next_due_at).toLocaleDateString("en-GB")}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="asset-label-sheet">
        <article className="asset-label">
          <img src={qr} alt="" />
          <div>
            <strong>Haccora</strong>
            <h2>{asset.name}</h2>
            <p>{asset.asset_code}</p>
            <p>{asset.location || "Site equipment"}</p>
            <small>Scan to inspect, report or view history</small>
          </div>
        </article>
      </section>
    </div>
  );
}

function Fact({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock }) {
  return (
    <div className="bg-card p-4">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <Icon size={13} />
      </div>
      <div className="mt-2 text-sm font-bold capitalize">{value}</div>
    </div>
  );
}
function Field({
  label,
  value,
  set,
  placeholder,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-xs font-medium">
      {label}
      <input
        className="field mt-1"
        value={value}
        onChange={(event) => set(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
