export const actorColumns = {
  checks: "user_id",
  temperature_logs: "user_id",
  haccp_flow_runs: "user_id",
  goods_in_logs: "user_id",
  cleaning_completions: "completed_by",
  asset_events: "recorded_by",
} as const;
export type EvidenceTable = keyof typeof actorColumns;
export type EvidenceJob = {
  id: string;
  table: EvidenceTable;
  payload: Record<string, unknown>;
  queuedAt: string;
  attempts: number;
  lastError?: string;
};
type Failure = { code?: string; message: string };

export function belongsToUser(job: EvidenceJob, userId: string) {
  const actor = actorColumns[job.table];
  return Boolean(
    actor &&
    job.payload[actor] === userId &&
    typeof job.payload.organization_id === "string" &&
    job.payload.organization_id,
  );
}

/** Never replay another user's evidence or discard an unverified unique conflict. */
export async function replayEvidence(
  jobs: EvidenceJob[],
  userId: string,
  send: (job: EvidenceJob) => Promise<Failure | null>,
  confirmDuplicate: (job: EvidenceJob) => Promise<boolean>,
) {
  const remaining: EvidenceJob[] = [];
  for (const job of jobs) {
    if (!belongsToUser(job, userId)) {
      remaining.push(job);
      continue;
    }
    try {
      const error = await send(job);
      if (!error) continue;
      if (error.code === "23505" && (await confirmDuplicate(job))) continue;
      remaining.push({
        ...job,
        attempts: job.attempts + 1,
        lastError: error.message.slice(0, 300),
      });
    } catch {
      remaining.push({
        ...job,
        attempts: job.attempts + 1,
        lastError: "Sync interrupted; evidence retained for retry.",
      });
    }
  }
  return remaining;
}
