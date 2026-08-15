import { json, preflight, requirePost } from "../_shared/http.ts";
import { evaluateProviderConfiguration } from "../_shared/provider-readiness.ts";
import { requireUser, serviceClient } from "../_shared/supabase.ts";

type Heartbeat = {
  job_name: string;
  last_status: "started" | "succeeded" | "failed";
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

  try {
    const { client, user } = await requireUser(request);
    const { data: platformContext, error: contextError } = await client.rpc(
      "get_my_platform_context",
    );
    if (contextError) throw contextError;
    const role = platformContext && typeof platformContext === "object"
      ? String((platformContext as Record<string, unknown>).role ?? "")
      : "";
    if (!new Set(["platform_owner", "platform_auditor"]).has(role)) {
      return json(request, { error: "forbidden" }, 403);
    }

    const service = serviceClient();
    const checkedAt = new Date();
    const [{ data: heartbeatRows, error: heartbeatError }, queueCounts] =
      await Promise.all([
        service
          .from("service_job_heartbeats")
          .select(
            "job_name,last_status,last_succeeded_at,last_failed_at,last_duration_ms",
          ),
        Promise.all([
          countRows(service, "notification_outbox", "dead_letter"),
          countRows(service, "file_scan_jobs", "dead_letter"),
          countRows(service, "webhook_deliveries", "dead_letter"),
        ]),
      ]);
    if (heartbeatError) throw heartbeatError;

    const heartbeatByJob = new Map(
      ((heartbeatRows ?? []) as Heartbeat[]).map((row) => [row.job_name, row]),
    );
    const jobs = [...requiredJobs].map(([jobName, maximumAgeMinutes]) => {
      const heartbeat = heartbeatByJob.get(jobName);
      const ageMinutes = heartbeat?.last_succeeded_at
        ? Math.max(
          0,
          Math.floor(
            (checkedAt.getTime() - Date.parse(heartbeat.last_succeeded_at)) /
              60_000,
          ),
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
    const operationsHealthy = jobs.every((job) => !job.overdue) &&
      Object.values(queues).every((count) => count === 0);
    const configuration = evaluateProviderConfiguration((name) =>
      Deno.env.get(name)
    );
    const configuredCount = configuration.filter((item) =>
      item.configured
    ).length;

    const { error: auditError } = await service.from("platform_audit_events")
      .insert({
        actor_id: user.id,
        event_type: "platform_launch_readiness_viewed",
        metadata: {
          operations_healthy: operationsHealthy,
          configured_providers: configuredCount,
          provider_checks: configuration.length,
        },
      });
    if (auditError) throw auditError;

    return json(request, {
      status: operationsHealthy && configuredCount === configuration.length
        ? "configured"
        : "action_required",
      checkedAt: checkedAt.toISOString(),
      operations: {
        status: operationsHealthy ? "healthy" : "degraded",
        jobs,
        queues,
      },
      configuration: {
        configuredCount,
        totalCount: configuration.length,
        items: configuration,
      },
      caveat:
        "Configured means required values are present and structurally valid. Production evidence must still prove each provider and accountable approval.",
    });
  } catch (error) {
    console.error("platform_readiness_failed", error);
    return json(request, { error: "platform_readiness_failed" }, 500);
  }
});
