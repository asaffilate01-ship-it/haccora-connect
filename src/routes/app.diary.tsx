import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";
import { operationalDate } from "@/lib/operational-day";
import {
  canSignDiary,
  DIARY_FIELDS,
  diaryLocked,
  diaryProblem,
  diaryValues,
  draftFromDiary,
  emptyDiary,
  validDiaryDate,
  type DiaryDraft,
  type DiaryRecord,
} from "@/lib/diary-integrity";

export const Route = createFileRoute("/app/diary")({ component: Diary });

function Diary() {
  const { user } = useAuth();
  if (!user?.organizationId || !user.locationId) {
    return <p className="p-5 text-sm">Select a premises to review its daily diary.</p>;
  }
  return (
    <SiteDiary
      key={`${user.id}:${user.organizationId}:${user.locationId}:${user.role}`}
      organizationId={user.organizationId}
      locationId={user.locationId}
      userId={user.id}
      role={user.role}
    />
  );
}

function SiteDiary({
  organizationId,
  locationId,
  userId,
  role,
}: {
  organizationId: string;
  locationId: string;
  userId: string;
  role: string;
}) {
  const [date, setDate] = useState(() => operationalDate(new Date(), "Europe/London"));
  const [draft, setDraft] = useState<DiaryDraft>(emptyDiary);
  const [record, setRecord] = useState<DiaryRecord | null>(null);
  const [loadedDate, setLoadedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const lock = useRef(false);
  const mounted = useRef(false);
  const today = operationalDate(new Date(), "Europe/London");
  const available = !loading && loadedDate === date;
  const readOnly = role === "inspector" || diaryLocked(record);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setLoadedDate("");
    setError("");
    setConfirmed(false);
    try {
      if (!validDiaryDate(date, operationalDate(new Date(), "Europe/London"))) {
        throw new Error("Invalid diary date");
      }
      const { data, error: readError } = await supabase
        .from("daily_diary_entries")
        .select(DIARY_FIELDS)
        .eq("organization_id", organizationId)
        .eq("location_id", locationId)
        .eq("diary_date", date)
        .maybeSingle();
      if (!mounted.current || request !== requestId.current) return;
      if (readError) throw readError;
      setRecord(data);
      setDraft(draftFromDiary(data));
      setLoadedDate(date);
    } catch {
      if (mounted.current && request === requestId.current) {
        setRecord(null);
        setDraft(emptyDiary);
        setError("Diary evidence unavailable. Refresh before recording or signing off.");
      }
    } finally {
      if (mounted.current && request === requestId.current) setLoading(false);
    }
  }, [date, organizationId, locationId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, [load]);

  function edit(patch: Partial<DiaryDraft>) {
    setDraft((previous) => ({ ...previous, ...patch }));
    setConfirmed(false);
    setMessage("");
  }

  async function save(sign = false) {
    if (lock.current || !available || readOnly || !validDiaryDate(date, today)) return;
    const problem = diaryProblem(draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (sign && (!confirmed || !canSignDiary(role, draft, record))) return;
    lock.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    const timestamp = new Date().toISOString();
    const values = {
      ...diaryValues(draft),
      updated_at: timestamp,
      ...(sign ? { signed_off_at: timestamp, signed_off_by: userId } : {}),
    };
    try {
      const write = record
        ? supabase
            .from("daily_diary_entries")
            .update(values)
            .eq("id", record.id)
            .eq("organization_id", organizationId)
            .eq("location_id", locationId)
            .eq("diary_date", date)
            .eq("updated_at", record.updated_at)
            .is("signed_off_at", null)
            .is("signed_off_by", null)
        : supabase.from("daily_diary_entries").insert({
            ...values,
            organization_id: organizationId,
            location_id: locationId,
            diary_date: date,
            created_by: userId,
          });
      const { data, error: writeError } = await write.select(DIARY_FIELDS).single();
      if (!mounted.current) return;
      if (
        writeError ||
        !data ||
        data.diary_date !== date ||
        (sign && (!data.signed_off_at || data.signed_off_by !== userId))
      ) {
        throw new Error("Diary save not confirmed");
      }
      setRecord(data);
      setDraft(draftFromDiary(data));
      setConfirmed(false);
      setMessage(sign ? "Manager sign-off recorded." : "Diary draft saved.");
    } catch {
      if (mounted.current) {
        await load();
        setError("Save not confirmed. Review the latest record before trying again.");
      }
    } finally {
      lock.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <div className="p-5 md:p-8 max-w-4xl space-y-5">
      <header>
        <div className="eyebrow">SFBB-STYLE DAILY RECORD</div>
        <h1 className="mt-1">Daily diary</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Record actual checks, unusual events and corrective action for this premises.
        </p>
      </header>
      <section className="surface p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block text-sm font-bold">
            Diary date (UK)
            <input
              className="input mt-2 block"
              type="date"
              value={date}
              max={today}
              disabled={saving}
              onChange={(event) => {
                setLoadedDate("");
                setDate(event.target.value);
                setMessage("");
                setConfirmed(false);
              }}
            />
          </label>
          <button
            type="button"
            className="btn-secondary min-h-11 px-4 py-2 text-sm"
            disabled={saving || loading}
            onClick={() => {
              setMessage("");
              void load();
            }}
          >
            Refresh saved diary
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        {!available ? (
          <p role="status" className="text-sm text-muted-foreground">
            {loading ? "Loading saved diary…" : "Diary unavailable. Refresh to continue."}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {diaryLocked(record)
                ? "A signature is recorded. This entry is read-only here."
                : record
                  ? "Saved draft"
                  : "No saved entry for this date. Start a new draft."}
            </p>
            <fieldset disabled={saving || readOnly} className="space-y-4">
              <label className="flex items-center gap-3 min-h-11">
                <input
                  type="checkbox"
                  checked={draft.opening}
                  onChange={(event) => edit({ opening: event.target.checked })}
                />
                Opening checks completed
              </label>
              <label className="flex items-center gap-3 min-h-11">
                <input
                  type="checkbox"
                  checked={draft.closing}
                  onChange={(event) => edit({ closing: event.target.checked })}
                />
                Closing checks completed
              </label>
              <label className="block text-sm font-bold">
                Problems or unusual events
                <textarea
                  className="input mt-2 w-full min-h-24"
                  maxLength={10000}
                  value={draft.problems}
                  onChange={(event) => edit({ problems: event.target.value })}
                />
              </label>
              <label className="block text-sm font-bold">
                Corrective action
                <textarea
                  className="input mt-2 w-full min-h-24"
                  maxLength={10000}
                  value={draft.actions}
                  onChange={(event) => edit({ actions: event.target.value })}
                />
              </label>
              {!readOnly && (
                <>
                  {(role === "owner" || role === "manager") && (
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(event) => setConfirmed(event.target.checked)}
                      />
                      I have reviewed the actual opening, closing and corrective-action evidence.
                    </label>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="btn-secondary min-h-11 px-4 py-2"
                      onClick={() => void save()}
                    >
                      {saving ? "Saving…" : "Save draft"}
                    </button>
                    {(role === "owner" || role === "manager") && (
                      <button
                        type="button"
                        className="btn-primary min-h-11 px-4 py-2"
                        disabled={!confirmed || !canSignDiary(role, draft, record)}
                        onClick={() => void save(true)}
                      >
                        Manager sign-off
                      </button>
                    )}
                  </div>
                </>
              )}
            </fieldset>
          </>
        )}
      </section>
    </div>
  );
}
