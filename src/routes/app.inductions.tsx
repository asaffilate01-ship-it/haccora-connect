import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";

export const Route = createFileRoute("/app/inductions")({ component: InductionsPage });

type Person = { id: string; full_name: string | null };
type Assignment = {
  id: string;
  user_id: string;
  title: string;
  instructions: string | null;
  due_at: string | null;
  acknowledged_at: string | null;
  acknowledgement_version: string;
  created_at: string;
};

function InductionsPage() {
  const { user } = useAuth();
  const manager = user?.role === "owner" || user?.role === "manager";
  const [people, setPeople] = useState<Person[]>([]);
  const [rows, setRows] = useState<Assignment[]>([]);
  const [staffId, setStaffId] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [profiles, assignments] = await Promise.all([
      supabase.from("profiles").select("id,full_name").order("full_name"),
      supabase
        .from("staff_induction_assignments")
        .select(
          "id,user_id,title,instructions,due_at,acknowledged_at,acknowledgement_version,created_at",
        )
        .order("created_at", { ascending: false }),
    ]);
    setPeople((profiles.data ?? []) as Person[]);
    setRows((assignments.data ?? []) as Assignment[]);
    setError(assignments.error?.message ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(
    () => (manager ? rows : rows.filter((row) => row.user_id === user?.id)),
    [manager, rows, user?.id],
  );

  const assign = async () => {
    if (!user?.organizationId || !staffId || title.trim().length < 2) {
      setError("Choose a staff member and add an instruction title.");
      return;
    }
    if (dueOn && !/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) {
      setError("Use YYYY-MM-DD for the due date.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: saveError } = await supabase.from("staff_induction_assignments").insert({
      organization_id: user.organizationId,
      location_id: user.locationId,
      user_id: staffId,
      assigned_by: user.id,
      title: title.trim(),
      instructions: instructions.trim() || null,
      due_at: dueOn ? `${dueOn}T23:59:59.000Z` : null,
    });
    setBusy(false);
    if (saveError) return setError(saveError.message);
    setTitle("");
    setInstructions("");
    setDueOn("");
    await load();
  };

  const acknowledge = async (id: string) => {
    if (
      !window.confirm(
        "I confirm that I have read and understood this instruction and will follow it.",
      )
    )
      return;
    const { error: rpcError } = await supabase.rpc("acknowledge_my_induction", {
      p_assignment_id: id,
    });
    if (rpcError) return setError(rpcError.message);
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-700">
          People and evidence
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
          Staff induction
        </h1>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
          Assign site instructions and retain named, time-stamped acknowledgement evidence.
        </p>
      </header>

      {manager && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-red-700" />
            <h2 className="text-sm font-extrabold">Assign an instruction</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-[11px] font-bold text-slate-600">
              Staff member
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                value={staffId}
                onChange={(event) => setStaffId(event.target.value)}
              >
                <option value="">Choose staff</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name || "Unnamed staff"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-bold text-slate-600">
              Due date (optional)
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                type="date"
                value={dueOn}
                onChange={(event) => setDueOn(event.target.value)}
              />
            </label>
          </div>
          <input
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            placeholder="Instruction or policy title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            className="mt-3 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs leading-5"
            placeholder="What the staff member must read and follow"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
          />
          <button
            disabled={busy}
            onClick={() => void assign()}
            className="mt-3 rounded-lg bg-slate-950 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
          >
            {busy ? "Assigning…" : "Assign to staff"}
          </button>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800">
          {error}
        </p>
      )}
      <section className="space-y-3">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
          {manager ? "Team acknowledgements" : "My instructions"}
        </h2>
        {visible.map((row) => {
          const person = people.find((item) => item.id === row.user_id);
          const overdue =
            !row.acknowledged_at && !!row.due_at && new Date(row.due_at).getTime() < Date.now();
          return (
            <article
              key={row.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-950">{row.title}</h3>
                  {manager && (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {person?.full_name || "Unnamed staff"}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${row.acknowledged_at ? "bg-emerald-100 text-emerald-800" : overdue ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}
                >
                  {row.acknowledged_at ? "Acknowledged" : overdue ? "Overdue" : "Awaiting"}
                </span>
              </div>
              {row.instructions && (
                <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-700">
                  {row.instructions}
                </p>
              )}
              <p className="mt-3 flex items-center gap-1 text-[10px] text-slate-500">
                <Clock3 className="h-3 w-3" />
                Version {row.acknowledgement_version}
                {row.due_at
                  ? ` · due ${new Date(row.due_at).toLocaleDateString("en-GB")}`
                  : " · no due date"}
              </p>
              {row.acknowledged_at ? (
                <p className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmed {new Date(row.acknowledged_at).toLocaleString("en-GB")}
                </p>
              ) : row.user_id === user?.id ? (
                <button
                  onClick={() => void acknowledge(row.id)}
                  className="mt-3 rounded-lg bg-slate-950 px-4 py-2 text-xs font-extrabold text-white"
                >
                  I have read and understood
                </button>
              ) : null}
            </article>
          );
        })}
        {visible.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
            No induction instructions yet.
          </p>
        )}
      </section>
      <p className="text-[10px] leading-4 text-slate-500">
        This record supports staff instruction evidence. Businesses remain responsible for suitable
        supervision, training and safe methods for their operation.
      </p>
    </div>
  );
}
