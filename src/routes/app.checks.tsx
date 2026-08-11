import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";
import { CheckCircle2, Clock, PlusCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/checks")({ component: ChecksPage });

interface Row {
  id: string;
  kind: string;
  title: string;
  status: string;
  note: string | null;
  completed_at: string | null;
  created_at: string;
  user_id: string;
}

const KINDS = [
  "opening",
  "hygiene",
  "temperature",
  "cleaning",
  "closing",
  "goods",
  "production",
] as const;

function ChecksPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (_legacy: string, english: string) => english;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>("opening");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("checks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setErr(error.message);
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!user || !title.trim()) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase
      .from("checks")
      .insert({ user_id: user.id, kind, title: title.trim(), status: "pending" });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setTitle("");
    load();
  };

  const complete = async (id: string) => {
    await supabase
      .from("checks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id);
    load();
  };

  const filtered = rows.filter((r) =>
    filter === "all"
      ? true
      : filter === "pending"
        ? r.status === "pending"
        : r.status === "completed",
  );
  const todayDone = rows.filter(
    (r) =>
      r.status === "completed" &&
      r.completed_at &&
      new Date(r.completed_at).toDateString() === new Date().toDateString(),
  ).length;

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{"Daily checks"}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{"Checks"}</h1>
          <p className="text-muted-foreground mt-1">
            {t(
              `${todayDone} heute erledigt · live gespeichert.`,
              `${todayDone} completed today · live storage.`,
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${filter === f ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
            >
              {f === "all" ? "All" : f === "pending" ? "Pending" : "Done"}
            </button>
          ))}
        </div>
      </div>

      <div className="surface p-5 grid md:grid-cols-6 gap-3">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={"New check…"}
          className="md:col-span-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <button
          onClick={add}
          disabled={busy || !title.trim()}
          className="btn-alert-solid text-sm inline-flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
          {"Add"}
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
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{"Nothing here."}</div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => {
              const done = r.status === "completed";
              return (
                <li key={r.id} className="p-4 flex items-center gap-4">
                  <span
                    className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${done ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}`}
                  >
                    {done ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      {r.kind}
                    </div>
                    <div className="font-medium text-sm mt-0.5">{r.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {done && r.completed_at
                        ? new Date(r.completed_at).toLocaleString("en-GB")
                        : new Date(r.created_at).toLocaleString("en-GB")}
                    </div>
                  </div>
                  {!done && (
                    <button
                      onClick={() => complete(r.id)}
                      className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-success text-success-foreground"
                    >
                      <CheckCircle2 size={12} className="inline mr-1" />
                      {"Complete"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
