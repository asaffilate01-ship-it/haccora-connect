import {
  constantTimeEqual,
  env,
  json,
  preflight,
  requirePost,
} from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";

type Heartbeat = {
  job_name: string;
  last_status: "started" | "succeeded" | "failed";
  last_started_at: string;
  last_succeeded_at: string | null;
  last_failed_at: string | null;
  last_duration_ms: number | null;
};

const requiredJobs = new Map([
  ["file-scan", 15],
  ["operations-dispatch", 15],
  ["integration-dispatch", 15],
  ["notification-dispatch", 35],
]);

async function countRows(
  client: ReturnType<typeof serviceClient>,
  table: string,
  status: string,
) {
  const { count, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  if (error) throw error;
  return count ?? 0;
}

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  if (
    !constantTimeEqual(
      request.headers.get("x-monitor-secret") ?? "",
      env("OPERATIONS_MONITOR_SECRET"),
    )
  ) {
    return json(request, { error: "unauthorized" }, 401);
  }

  const client = serviceClient();
  const checkedAt = new Date();
  try {
    const [{ data: heartbeatRows, error: heartbeatError }, queueCounts] =
      await Promise.all([
        client
          .from("service_job_heartbeats")
          .select(
            "job_name,last_status,last_started_at,last_succeeded_at,last_failed_at,last_duration_ms",
          ),
        Promise.all([
          countRows(client, "notification_outbox", "dead_letter"),
          countRows(client, "file_scan_jobs", "dead_letter"),
          countRows(client, "webhook_deliveries", "dead_letter"),
        ]),
      ]);
    if (heartbeatError) throw heartbeatError;

    const heartbeats = new Map(
      ((heartbeatRows ?? []) as Heartbeat[]).map((row) => [row.job_name, row]),
    );
    const jobs = [...requiredJobs].map(([jobName, maximumAgeMinutes]) => {
      const heartbeat = heartbeats.get(jobName);
      const ageMinutes = heartbeat?.last_succeeded_at
        ? Math.floor(
          (checkedAt.getTime() - Date.parse(heartbeat.last_succeeded_at)) /
            60_000,
        )
        : null;
      const overdue = !heartbeat?.last_succeeded_at ||
        heartbeat.last_status === "failed" ||
        ageMinutes === null ||
        ageMinutes > maximumAgeMinutes;
      return {
        jobName,
        lastStatus: heartbeat?.last_status ?? "not_run",
        lastSucceededAt: heartbeat?.last_succeeded_at ?? null,
        lastFailedAt: heartbeat?.last_failed_at ?? null,
        lastDurationMs: heartbeat?.last_duration_ms ?? null,
        maximumAgeMinutes,
        ageMinutes,
        overdue,
      };
    });
    const queues = {
      notificationDeadLetters: queueCounts[0],
      fileScanDeadLetters: queueCounts[1],
      webhookDeadLetters: queueCounts[2],
    };
    const healthy = jobs.every((job) => !job.overdue) &&
      Object.values(queues).every((n) => n === 0);

    return json(
      request,
      {
        status: healthy ? "ok" : "degraded",
        checkedAt: checkedAt.toISOString(),
        jobs,
        queues,
      },
      healthy ? 200 : 503,
    );
  } catch (error) {
    console.error("operations_health_failed", error);
    return json(
      request,
      { status: "error", error: "operations_health_failed" },
      503,
    );
  }
});
