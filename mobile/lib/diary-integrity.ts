export const DIARY_FIELDS =
  "id,diary_date,opening_checks,closing_checks,problems,corrective_actions,signed_off_at,signed_off_by,updated_at";

export type DiaryRecord = {
  id: string;
  diary_date: string;
  opening_checks: unknown;
  closing_checks: unknown;
  problems: string;
  corrective_actions: string;
  signed_off_at: string | null;
  signed_off_by: string | null;
  updated_at: string;
};

export type DiaryDraft = {
  opening: boolean;
  closing: boolean;
  problems: string;
  actions: string;
};

export const emptyDiary: DiaryDraft = {
  opening: false,
  closing: false,
  problems: "",
  actions: "",
};

function completed(value: unknown) {
  return !!value && typeof value === "object" && "completed" in value && value.completed === true;
}

export function draftFromDiary(record: DiaryRecord | null): DiaryDraft {
  return record
    ? {
        opening: completed(record.opening_checks),
        closing: completed(record.closing_checks),
        problems: record.problems,
        actions: record.corrective_actions,
      }
    : { ...emptyDiary };
}

export function diaryLocked(record: DiaryRecord | null): boolean {
  return record !== null && (record.signed_off_at !== null || record.signed_off_by !== null);
}

export function diaryProblem(draft: DiaryDraft): string | null {
  if (draft.problems.trim() && !draft.actions.trim()) return "Corrective action required";
  if (draft.problems.length > 10000 || draft.actions.length > 10000) {
    return "Keep each diary note within 10,000 characters.";
  }
  return null;
}

export function diaryValues(draft: DiaryDraft) {
  return {
    opening_checks: { completed: draft.opening },
    closing_checks: { completed: draft.closing },
    problems: draft.problems.trim(),
    corrective_actions: draft.actions.trim(),
  };
}

export function validDiaryDate(day: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day > today) return false;
  const date = new Date(day + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

export function canSignDiary(
  role: string | null,
  draft: DiaryDraft,
  record: DiaryRecord | null,
): boolean {
  return (
    (role === "owner" || role === "manager") &&
    !diaryLocked(record) &&
    draft.opening &&
    draft.closing &&
    !diaryProblem(draft)
  );
}
