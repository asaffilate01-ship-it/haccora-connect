import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;
export const Route = createFileRoute("/app/diary")({ component: Diary });
const today = () => new Date().toISOString().slice(0, 10);
function Diary() {
  const { user } = useAuth();
  const [date, setDate] = useState(today());
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [problems, setProblems] = useState("");
  const [actions, setActions] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    void (async () => {
      const { data } = await db
        .from("daily_diary_entries")
        .select("*")
        .eq("diary_date", date)
        .maybeSingle();
      if (data) {
        setOpening(Boolean((data.opening_checks as any)?.completed));
        setClosing(Boolean((data.closing_checks as any)?.completed));
        setProblems(data.problems ?? "");
        setActions(data.corrective_actions ?? "");
      } else {
        setOpening(false);
        setClosing(false);
        setProblems("");
        setActions("");
      }
    })();
  }, [date]);
  const save = async (sign = false) => {
    if (!user?.organizationId || !user.locationId) return;
    if (problems.trim() && !actions.trim()) {
      setMsg("Record the corrective action for every problem before saving.");
      return;
    }
    const { error } = await db.from("daily_diary_entries").upsert(
      {
        organization_id: user.organizationId,
        location_id: user.locationId,
        diary_date: date,
        opening_checks: { completed: opening },
        closing_checks: { completed: closing },
        problems: problems.trim(),
        corrective_actions: actions.trim(),
        created_by: user.id,
        ...(sign ? { signed_off_by: user.id, signed_off_at: new Date().toISOString() } : {}),
      },
      { onConflict: "organization_id,location_id,diary_date" },
    );
    setMsg(
      error?.message ?? (sign ? "Diary signed off with an immutable audit event." : "Diary saved."),
    );
  };
  return (
    <div className="p-6 md:p-10 max-w-4xl space-y-6">
      <div>
        <div className="eyebrow">SFBB-STYLE DAILY RECORD</div>
        <h1 className="text-4xl mt-1">Daily diary</h1>
        <p className="text-muted-foreground mt-2">
          Record checks, anything that went wrong and what you did about it.
        </p>
      </div>
      <div className="surface p-6 space-y-5">
        <label className="block text-sm font-bold">
          Diary date
          <input
            className="input mt-2 block"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="flex gap-3">
          <input type="checkbox" checked={opening} onChange={(e) => setOpening(e.target.checked)} />{" "}
          Opening checks completed
        </label>
        <label className="flex gap-3">
          <input type="checkbox" checked={closing} onChange={(e) => setClosing(e.target.checked)} />{" "}
          Closing checks completed
        </label>
        <label className="block text-sm font-bold">
          Problems or unusual events
          <textarea
            className="input mt-2 w-full min-h-24"
            value={problems}
            onChange={(e) => setProblems(e.target.value)}
            placeholder="Leave blank only when there were no problems."
          />
        </label>
        <label className="block text-sm font-bold">
          Corrective action
          <textarea
            className="input mt-2 w-full min-h-24"
            value={actions}
            onChange={(e) => setActions(e.target.value)}
            placeholder="Required whenever a problem is recorded."
          />
        </label>
        {msg && <p className="text-sm">{msg}</p>}
        <div className="flex gap-3">
          <button className="px-4 py-2 border rounded-lg" onClick={() => void save()}>
            Save draft
          </button>
          <button
            className="btn-primary px-4 py-2"
            disabled={!opening}
            onClick={() => void save(true)}
          >
            Manager sign-off
          </button>
        </div>
      </div>
    </div>
  );
}
