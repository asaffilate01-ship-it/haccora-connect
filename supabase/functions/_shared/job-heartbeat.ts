import type { SupabaseClient } from "@supabase/supabase-js";

export type JobStatus = "started" | "succeeded" | "failed";

export async function recordJobHeartbeat(
  client: SupabaseClient,
  jobName: string,
  status: JobStatus,
  startedAt: string,
  result: Record<string, unknown> = {},
) {
  const { error } = await client.rpc("record_service_job_heartbeat", {
    p_job_name: jobName,
    p_status: status,
    p_started_at: startedAt,
    p_result: result,
  });
  if (error) throw error;
}
