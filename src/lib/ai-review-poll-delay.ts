/** Retry status reads without hammering an unavailable AI provider. */
export function aiReviewPollDelay(failedReads: number): number {
  const failures = Number.isFinite(failedReads) ? Math.max(0, Math.floor(failedReads)) : 0;
  return Math.min(60_000, 3500 * 2 ** Math.min(failures, 5));
}
