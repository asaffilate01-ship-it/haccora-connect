const url = (process.env.OPERATIONS_HEALTH_URL ?? "").trim();
const secret = (process.env.OPERATIONS_MONITOR_SECRET ?? "").trim();

if (!url) throw new Error("OPERATIONS_HEALTH_URL is required");
if (secret.length < 32) {
  throw new Error("OPERATIONS_MONITOR_SECRET must contain at least 32 characters");
}

let endpoint;
try {
  endpoint = new URL(url);
} catch {
  throw new Error("OPERATIONS_HEALTH_URL is not a valid URL");
}
if (endpoint.protocol !== "https:") throw new Error("OPERATIONS_HEALTH_URL must use HTTPS");
if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
  throw new Error("OPERATIONS_HEALTH_URL must not contain credentials, query or fragment");
}
if (!endpoint.pathname.endsWith("/functions/v1/operations-health")) {
  throw new Error("OPERATIONS_HEALTH_URL must target the operations-health Edge Function");
}

let response;
try {
  response = await fetch(endpoint, {
    method: "POST",
    redirect: "error",
    headers: { "x-monitor-secret": secret },
    signal: AbortSignal.timeout(15_000),
  });
} catch (error) {
  throw new Error(
    `Operations health request failed: ${error instanceof Error ? error.message : "unknown"}`,
  );
}

let result;
try {
  result = await response.json();
} catch {
  throw new Error(`Operations health returned non-JSON content (${response.status})`);
}

const expectedJobs = new Set([
  "file-scan",
  "operations-dispatch",
  "integration-dispatch",
  "notification-dispatch",
]);
const jobs = Array.isArray(result.jobs) ? result.jobs : [];
const returnedJobs = new Set(jobs.map((job) => job?.jobName));
const missingJobs = [...expectedJobs].filter((job) => !returnedJobs.has(job));
const overdueJobs = jobs.filter((job) => job?.overdue).map((job) => job.jobName);
const deadLetters = Object.values(result.queues ?? {}).reduce(
  (total, count) => total + (Number.isFinite(Number(count)) ? Number(count) : 0),
  0,
);

if (
  !response.ok ||
  result.status !== "ok" ||
  missingJobs.length ||
  overdueJobs.length ||
  deadLetters > 0
) {
  throw new Error(
    `Operations health is degraded: ${JSON.stringify({
      status: result.status ?? "unknown",
      httpStatus: response.status,
      missingJobs,
      overdueJobs,
      deadLetters,
    })}`,
  );
}

console.log(`Production operations health passed (${jobs.length} scheduler heartbeats).`);
