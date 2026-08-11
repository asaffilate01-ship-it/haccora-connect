import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";
import { FlaskConical, PlusCircle, Loader2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/app/chemicals")({ component: ChemicalsPage });

interface Row {
  id: string;
  name: string;
  supplier: string | null;
  hazard_class: string | null;
  ghs_pictograms: string[] | null;
  storage_location: string | null;
  sds_url: string | null;
  ppe_required: string | null;
  reviewed_on: string | null;
  next_review: string | null;
  notes: string | null;
}

function ChemicalsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (_legacy: string, english: string) => english;
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: "",
    supplier: "",
    hazard_class: "",
    storage_location: "",
    sds_url: "",
    ppe_required: "",
    next_review: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("chemicals")
      .select("*")
      .order("name", { ascending: true })
      .limit(200);
    if (error) setErr(error.message);
    else setItems((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user || !f.name.trim()) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("chemicals").insert({
      user_id: user.id,
      name: f.name.trim(),
      supplier: f.supplier.trim() || null,
      hazard_class: f.hazard_class.trim() || null,
      storage_location: f.storage_location.trim() || null,
      sds_url: f.sds_url.trim() || null,
      ppe_required: f.ppe_required.trim() || null,
      reviewed_on: new Date().toISOString().slice(0, 10),
      next_review: f.next_review || null,
      notes: f.notes.trim() || null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setF({
      name: "",
      supplier: "",
      hazard_class: "",
      storage_location: "",
      sds_url: "",
      ppe_required: "",
      next_review: "",
      notes: "",
    });
    setOpen(false);
    load();
  };

  const dueReview = items.filter(
    (i) => i.next_review && new Date(i.next_review) < new Date(Date.now() + 30 * 864e5),
  ).length;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{"Chemicals & SDS"}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{"Chemicals register (COSHH/GHS)"}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            {
              "Detergents, sanitisers and hazardous substances with SDS link and PPE — per GefStoffV / TRGS 555."
            }
          </p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="btn-alert-solid text-sm">
          <PlusCircle size={16} className="inline mr-1.5" />
          {"Add substance"}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Kpi label={"Substances registered"} value={items.length} tone="neutral" />
        <Kpi label={"Review due ≤ 30 d"} value={dueReview} tone="warn" />
        <Kpi label={"With SDS link"} value={items.filter((i) => i.sds_url).length} tone="ok" />
      </div>

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      {open && (
        <div className="surface p-5 grid md:grid-cols-4 gap-3">
          <input
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            placeholder={"Name"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={f.supplier}
            onChange={(e) => setF({ ...f, supplier: e.target.value })}
            placeholder={"Supplier"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={f.hazard_class}
            onChange={(e) => setF({ ...f, hazard_class: e.target.value })}
            placeholder={"Hazard class (H-statements)"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={f.storage_location}
            onChange={(e) => setF({ ...f, storage_location: e.target.value })}
            placeholder={"Storage location"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={f.ppe_required}
            onChange={(e) => setF({ ...f, ppe_required: e.target.value })}
            placeholder={"PPE (gloves, goggles…)"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={f.sds_url}
            onChange={(e) => setF({ ...f, sds_url: e.target.value })}
            placeholder={"SDS URL"}
            type="url"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={f.next_review}
            onChange={(e) => setF({ ...f, next_review: e.target.value })}
            type="date"
            placeholder={"Next review"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder={"Note"}
            className="md:col-span-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="btn-alert-solid text-sm md:col-span-4 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {"Save"}
          </button>
        </div>
      )}

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            {"Loading…"}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {"No substances registered yet."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="p-5 flex items-start gap-4">
                <span className="h-10 w-10 rounded-xl grid place-items-center shrink-0 bg-amber-500/15 text-amber-700">
                  <FlaskConical size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg">
                    {i.name}{" "}
                    {i.supplier && (
                      <span className="text-muted-foreground text-sm">· {i.supplier}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {i.hazard_class && (
                      <span className="font-semibold text-amber-700">{i.hazard_class}</span>
                    )}
                    {i.storage_location && (
                      <span>
                        {"Storage"}: {i.storage_location}
                      </span>
                    )}
                    {i.ppe_required && <span>PSA: {i.ppe_required}</span>}
                    {i.next_review && (
                      <span>
                        {"Review"}: <b className="text-foreground">{i.next_review}</b>
                      </span>
                    )}
                  </div>
                  {i.notes && <div className="text-xs text-muted-foreground mt-1">{i.notes}</div>}
                </div>
                {i.sds_url && (
                  <a
                    href={i.sds_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border border-border hover:bg-secondary inline-flex items-center gap-1"
                  >
                    <ExternalLink size={12} />
                    SDS
                  </a>
                )}
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
}: {
  label: string;
  value: number;
  tone: "warn" | "ok" | "neutral";
}) {
  const cls =
    tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-success" : "text-foreground";
  return (
    <div className="surface p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-4xl mt-2 ${cls}`}>{value}</div>
    </div>
  );
}
