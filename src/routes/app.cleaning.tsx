import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/cleaning")({ component: CleaningPage });
type Task = {
  id: string;
  area: string;
  instruction: string;
  chemical: string | null;
  contact_minutes: number | null;
  frequency: string;
  colour_code: string | null;
  active: boolean;
};
type Completion = {
  task_id: string | null;
  completed_at: string;
  result: string;
  notes: string | null;
};
const frequencies = ["each_shift", "daily", "weekly", "monthly", "as_needed"];

function CleaningPage() {
  const { user } = useAuth();
  const manager = user?.role === "owner" || user?.role === "manager";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    area: "",
    instruction: "",
    chemical: "",
    contact: "",
    frequency: "daily",
    colour: "",
  });
  const load = useCallback(async () => {
    setLoading(true);
    const [taskResult, completionResult] = await Promise.all([
      supabase.from("cleaning_tasks").select("*").eq("active", true).order("area"),
      supabase
        .from("cleaning_completions")
        .select("task_id,completed_at,result,notes")
        .order("completed_at", { ascending: false })
        .limit(200),
    ]);
    setTasks((taskResult.data ?? []) as Task[]);
    setCompletions((completionResult.data ?? []) as Completion[]);
    setError(taskResult.error?.message ?? completionResult.error?.message ?? null);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const latest = useMemo(
    () => new Map(completions.map((row) => [row.task_id, row])),
    [completions],
  );

  const addTask = async () => {
    if (!user?.organizationId || form.area.trim().length < 2 || form.instruction.trim().length < 3)
      return setError("Area and cleaning instruction are required.");
    setBusy("new");
    const contact = form.contact ? Number(form.contact) : null;
    const { error: saveError } = await supabase.from("cleaning_tasks").insert({
      organization_id: user.organizationId,
      location_id: user.locationId,
      area: form.area.trim(),
      instruction: form.instruction.trim(),
      chemical: form.chemical.trim() || null,
      contact_minutes: contact,
      frequency: form.frequency,
      colour_code: form.colour.trim() || null,
      created_by: user.id,
    });
    setBusy(null);
    if (saveError) return setError(saveError.message);
    setForm({
      area: "",
      instruction: "",
      chemical: "",
      contact: "",
      frequency: "daily",
      colour: "",
    });
    setOpen(false);
    await load();
  };
  const complete = async (task: Task) => {
    if (!user?.organizationId) return;
    setBusy(task.id);
    const { error: saveError } = await supabase.from("cleaning_completions").insert({
      organization_id: user.organizationId,
      location_id: user.locationId,
      task_id: task.id,
      task_area_snapshot: task.area,
      completed_by: user.id,
      result: "satisfactory",
    });
    setBusy(null);
    if (saveError) return setError(saveError.message);
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-700">
            Cleaning schedule
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Clean safely</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
            Configure site-specific methods, chemicals and contact times, then retain named
            completion evidence.
          </p>
        </div>
        {manager && (
          <button
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-extrabold text-white"
          >
            <Plus className="mr-1 inline h-4 w-4" />
            Add task
          </button>
        )}
      </header>
      {open && (
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
          <input
            className="rounded-lg border px-3 py-2 text-xs"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            placeholder="Area or equipment"
          />
          <input
            className="rounded-lg border px-3 py-2 text-xs md:col-span-2"
            value={form.instruction}
            onChange={(e) => setForm({ ...form, instruction: e.target.value })}
            placeholder="Approved cleaning method"
          />
          <input
            className="rounded-lg border px-3 py-2 text-xs"
            value={form.chemical}
            onChange={(e) => setForm({ ...form, chemical: e.target.value })}
            placeholder="Approved chemical (optional)"
          />
          <input
            className="rounded-lg border px-3 py-2 text-xs"
            type="number"
            min="0"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            placeholder="Contact minutes"
          />
          <select
            className="rounded-lg border px-3 py-2 text-xs"
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          >
            {frequencies.map((value) => (
              <option key={value} value={value}>
                {value.replace("_", " ")}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border px-3 py-2 text-xs"
            value={form.colour}
            onChange={(e) => setForm({ ...form, colour: e.target.value })}
            placeholder="Colour code (optional)"
          />
          <button
            disabled={busy === "new"}
            onClick={() => void addTask()}
            className="rounded-lg bg-red-700 px-4 py-2 text-xs font-extrabold text-white md:col-span-2"
          >
            {busy === "new" ? "Saving…" : "Save cleaning task"}
          </button>
        </section>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800">
          {error}
        </p>
      )}
      {loading ? (
        <div className="p-10 text-center text-xs text-slate-500">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Loading schedule…
        </div>
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {tasks.map((task) => {
            const last = latest.get(task.id);
            return (
              <article
                key={task.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 text-red-700" />
                    <div>
                      <h2 className="text-sm font-extrabold">{task.area}</h2>
                      <p className="text-[9px] font-black uppercase tracking-wider text-red-700">
                        {task.frequency.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <p className="max-w-32 text-right text-[9px] leading-4 text-slate-500">
                    {last
                      ? `Last: ${new Date(last.completed_at).toLocaleString("en-GB")}`
                      : "Not completed"}
                  </p>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-700">{task.instruction}</p>
                <p className="mt-2 text-[10px] leading-4 text-slate-500">
                  {task.chemical || "Use the approved site method"}
                  {task.contact_minutes !== null
                    ? ` · ${task.contact_minutes} min contact time`
                    : ""}
                  {task.colour_code ? ` · ${task.colour_code}` : ""}
                </p>
                <button
                  disabled={busy === task.id}
                  onClick={() => void complete(task)}
                  className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white"
                >
                  <CheckCircle2 className="mr-1 inline h-4 w-4" />
                  {busy === task.id ? "Saving…" : "Complete task"}
                </button>
              </article>
            );
          })}
          {tasks.length === 0 && (
            <div className="rounded-xl border border-dashed p-10 text-center text-xs text-slate-500 md:col-span-2">
              No cleaning tasks configured. Add the methods used at this premises.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
