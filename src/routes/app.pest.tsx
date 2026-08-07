import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Bug, PlusCircle, Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/pest")({ component: PestPage });

type Kind = "sighting" | "contractor_visit" | "bait_check";
type Sev = "low" | "medium" | "high";
interface Row {
  id: string;
  kind: Kind;
  species: string | null;
  location: string | null;
  severity: Sev;
  action_taken: string | null;
  contractor: string | null;
  observed_at: string;
  resolved_at: string | null;
}

const KIND: Record<Kind, [string, string]> = {
  sighting: ["Sighting", "Sighting"],
  contractor_visit: ["Contractor visit", "Contractor visit"],
  bait_check: ["Bait-station check", "Bait-station check"],
};

function PestPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (_legacy: string, english: string) => english;
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    kind: "sighting" as Kind,
    species: "",
    location: "",
    severity: "low" as Sev,
    action_taken: "",
    contractor: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("pest_sightings")
      .select("*")
      .order("observed_at", { ascending: false })
      .limit(100);
    if (error) setErr(error.message);
    else setItems((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("pest_sightings").insert({
      user_id: user.id,
      kind: f.kind,
      species: f.species.trim() || null,
      location: f.location.trim() || null,
      severity: f.severity,
      action_taken: f.action_taken.trim() || null,
      contractor: f.contractor.trim() || null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setF({
      kind: "sighting",
      species: "",
      location: "",
      severity: "low",
      action_taken: "",
      contractor: "",
    });
    setOpen(false);
    load();
  };

  const resolve = async (id: string) => {
    const { error } = await supabase
      .from("pest_sightings")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) setErr(error.message);
    else load();
  };

  const openCount = items.filter((i) => !i.resolved_at && i.kind === "sighting").length;
  const high = items.filter((i) => i.severity === "high" && !i.resolved_at).length;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{"Hygiene & pests"}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{"Pest control log"}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            {"Record sightings, contractor visits and bait-station checks in a structured log."}
          </p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="btn-alert-solid text-sm">
          <PlusCircle size={16} className="inline mr-1.5" />
          {"New entry"}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Kpi label={"Open sightings"} value={openCount} tone="warn" />
        <Kpi label={"High severity"} value={high} tone="danger" />
        <Kpi label={"Total logged"} value={items.length} tone="neutral" />
      </div>

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      {open && (
        <div className="surface p-5 grid md:grid-cols-4 gap-3">
          <select
            value={f.kind}
            onChange={(e) => setF({ ...f, kind: e.target.value as Kind })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {(Object.keys(KIND) as Kind[]).map((k) => (
              <option key={k} value={k}>
                {KIND[k][1]}
              </option>
            ))}
          </select>
          <input
            value={f.species}
            onChange={(e) => setF({ ...f, species: e.target.value })}
            placeholder={"Species"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.location}
            onChange={(e) => setF({ ...f, location: e.target.value })}
            placeholder={"Location"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <select
            value={f.severity}
            onChange={(e) => setF({ ...f, severity: e.target.value as Sev })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="low">{"Low"}</option>
            <option value="medium">{"Medium"}</option>
            <option value="high">{"High"}</option>
          </select>
          <input
            value={f.contractor}
            onChange={(e) => setF({ ...f, contractor: e.target.value })}
            placeholder={"Contractor"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={f.action_taken}
            onChange={(e) => setF({ ...f, action_taken: e.target.value })}
            placeholder={"Action taken"}
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
          <div className="p-10 text-center text-sm text-muted-foreground">{"No entries yet."}</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="p-5 flex items-start gap-4">
                <span
                  className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${i.severity === "high" ? "bg-[color:var(--color-alert-red)]/15 text-[color:var(--color-alert-red)]" : i.severity === "medium" ? "bg-amber-500/15 text-amber-700" : "bg-secondary text-muted-foreground"}`}
                >
                  <Bug size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg">{i.species ?? KIND[i.kind][1]}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>{KIND[i.kind][1]}</span>
                    {i.location && <span>{i.location}</span>}
                    {i.contractor && <span>{i.contractor}</span>}
                    <span>{new Date(i.observed_at).toLocaleString("en-GB")}</span>
                    {i.resolved_at && (
                      <span className="text-success">
                        {"Resolved"}: {new Date(i.resolved_at).toLocaleDateString("en-GB")}
                      </span>
                    )}
                  </div>
                  {i.action_taken && (
                    <div className="text-xs text-muted-foreground mt-1">{i.action_taken}</div>
                  )}
                </div>
                {!i.resolved_at && i.kind === "sighting" && (
                  <button
                    onClick={() => resolve(i.id)}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-success text-success-foreground hover:brightness-110"
                  >
                    <CheckCircle2 size={12} className="inline mr-1" />
                    {"Resolve"}
                  </button>
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
  tone: "warn" | "danger" | "neutral";
}) {
  const cls =
    tone === "danger"
      ? "text-[color:var(--color-alert-red)]"
      : tone === "warn"
        ? "text-amber-600"
        : "text-foreground";
  return (
    <div className="surface p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-4xl mt-2 ${cls}`}>{value}</div>
    </div>
  );
}
