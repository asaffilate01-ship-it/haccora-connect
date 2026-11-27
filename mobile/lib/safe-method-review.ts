type ReviewMethod = { version: string; prompts: string[] };
type ReviewProfile = { jurisdiction: string; business_type: string };
export type ReviewControls = {
  answers?: Record<string, string>;
  templateVersion?: string;
  jurisdiction?: string;
  businessType?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  managementConfirmed?: boolean;
};
type ReviewAdoption = {
  status: string;
  review_due_at: string | null;
  controls: ReviewControls | null;
};

function calendarDate(value: string) {
  const date = new Date(value + "T00:00:00Z");
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

/** Six calendar months, clamped to the last valid day of the target month. */
export function safeMethodNextReview(day: string): string {
  const date = calendarDate(day);
  if (!date) throw new RangeError("Invalid review date");
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 6);
  const end = new Date(date.getTime());
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  date.setUTCDate(Math.min(originalDay, end.getUTCDate()));
  return date.toISOString().slice(0, 10);
}

/** A recorded review is not current if any required attestation has drifted. */
export function safeMethodReviewCurrent(
  method: ReviewMethod,
  profile: ReviewProfile | null,
  adoption: ReviewAdoption | undefined,
  today: string,
): boolean {
  if (!profile || !adoption || adoption.status !== "active" || !method.prompts.length) return false;
  const controls = adoption.controls;
  if (
    !controls ||
    controls.managementConfirmed !== true ||
    controls.templateVersion !== method.version ||
    controls.jurisdiction !== profile.jurisdiction ||
    controls.businessType !== profile.business_type ||
    typeof controls.reviewedBy !== "string" ||
    !controls.reviewedBy ||
    typeof controls.reviewedAt !== "string" ||
    !Number.isFinite(Date.parse(controls.reviewedAt)) ||
    !adoption.review_due_at ||
    !calendarDate(adoption.review_due_at) ||
    adoption.review_due_at < today
  ) {
    return false;
  }
  return method.prompts.every((_, index) => {
    const answer = controls.answers?.[String(index)];
    return typeof answer === "string" && answer.trim().length >= 12;
  });
}
