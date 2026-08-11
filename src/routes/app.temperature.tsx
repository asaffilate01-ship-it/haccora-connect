import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";
import { Thermometer, CheckCircle2, AlertTriangle, Loader2, PlusCircle } from "lucide-react";

export const Route = createFileRoute("/app/temperature")({ component: TemperaturePage });

type Preset = { id: string; name: string; min: number; max: number };
const PRESETS: Preset[] = [
  { id: "cold1", name: "Cold room 1", min: 0, max: 5 },
  { id: "cold2", name: "Cold room 2", min: 0, max: 5 },
  { id: "freezer", name: "Freezer", min: -22, max: -18 },
  { id: "hot", name: "Hot holding", min: 63, max: 90 },
];

interface Row {
  id: string;
  location: string;
  reading: number;
  target_min: number | null;
  target_max: number | null;
  status: string;
  logged_at: string;
  note: string | null;
  user_id: string;
}

function TemperaturePage() {
  const { user } = useAuth();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("temperature_logs")
      .select("*")
      .order("logged_at", { ascending: false })
      .limit(50);
    if (error) setErr(error.message);
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user) return;
    const v = parseFloat(value);
    if (!Number.isFinite(v) || v < -100 || v > 300) {
      setErr("Enter -100 to 300 °C.");
      return;
    }
    setBusy(true);
    setErr(null);
    const status = v >= preset.min && v <= preset.max ? "in_range" : "out_of_range";
    const { error } = await supabase.from("temperature_logs").insert({
      user_id: user.id,
      location: preset.name,
      reading: v,
      target_min: preset.min,
      target_max: preset.max,
      status,
      note: note.trim() || null,
      logged_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setValue("");
    setNote("");
    load();
  };

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div>
        <div className="eyebrow">{"Monitoring"}</div>
        <h1 className="mt-1 text-3xl md:text-4xl">{"Temperatures"}</h1>
        <p className="text-muted-foreground mt-1">
          {"Stored live with target tolerances — CCP evidence."}
        </p>
      </div>

      <div className="surface p-5 grid md:grid-cols-6 gap-3">
        <select
          value={preset.id}
          onChange={(e) => setPreset(PRESETS.find((p) => p.id === e.target.value) ?? PRESETS[0])}
          className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.min}…{p.max} °C)
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="°C"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={"Note (optional)"}
          className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <button
          onClick={submit}
          disabled={busy}
          className="btn-alert-solid text-sm inline-flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
          {"Save"}
        </button>
      </div>

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            {"Loading…"}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {"No readings yet. Log the first one above."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const ok = r.status === "in_range";
              return (
                <li key={r.id} className="p-4 flex items-center gap-4">
                  <span
                    className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${ok ? "bg-success/15 text-success" : "bg-[color:var(--color-alert-red)]/15 text-[color:var(--color-alert-red)]"}`}
                  >
                    {ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{r.location}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.target_min ?? "–"}…{r.target_max ?? "–"} °C ·{" "}
                      {new Date(r.logged_at).toLocaleString("en-GB")}
                    </div>
                    {r.note && <div className="text-xs text-muted-foreground mt-0.5">{r.note}</div>}
                  </div>
                  <div
                    className={`font-display text-2xl ${ok ? "" : "text-[color:var(--color-alert-red)]"}`}
                  >
                    <Thermometer size={14} className="inline mr-1 opacity-60" />
                    {Number(r.reading).toFixed(1)} °C
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
