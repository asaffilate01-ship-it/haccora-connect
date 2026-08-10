const rawUrl = (process.env.PRODUCTION_URL ?? "").trim();
const expectedReleaseSha = (process.env.EXPECTED_RELEASE_SHA ?? "").trim().toLowerCase();
const timeoutMs = Number.parseInt(process.env.DEPLOYMENT_READINESS_TIMEOUT_MS ?? "10000", 10);
const fullCommitSha = /^[0-9a-f]{40}$/;

if (!rawUrl) {
  console.error("- PRODUCTION_URL is missing");
  process.exit(1);
}
if (expectedReleaseSha && !fullCommitSha.test(expectedReleaseSha)) {
  console.error("- EXPECTED_RELEASE_SHA must be a full 40-character Git commit SHA");
  process.exit(1);
}

let readinessUrl;
try {
  const productionUrl = new URL(rawUrl);
  if (productionUrl.protocol !== "https:") throw new Error("must use HTTPS");
  if (
    productionUrl.username ||
    productionUrl.password ||
    productionUrl.search ||
    productionUrl.hash
  ) {
    throw new Error("must not contain credentials, a query string or a fragment");
  }
  readinessUrl = new URL("/readiness.json", productionUrl);
} catch (error) {
  console.error(`- PRODUCTION_URL is invalid: ${error.message}`);
  process.exit(1);
}

if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
  console.error("- DEPLOYMENT_READINESS_TIMEOUT_MS must be between 1000 and 60000");
  process.exit(1);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
  const response = await fetch(readinessUrl, {
    cache: "no-store",
    redirect: "error",
    signal: controller.signal,
    headers: { "User-Agent": "Haccora-Deployment-Readiness/1.0" },
  });
  if (!response.ok) throw new Error(`returned HTTP ${response.status}`);
  if (!(response.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    throw new Error("returned an unexpected Content-Type");
  }
  if (!/\bno-store\b/i.test(response.headers.get("cache-control") ?? "")) {
    throw new Error("is missing Cache-Control: no-store");
  }

  const body = await response.json();
  if (body?.service !== "haccora-web") throw new Error("returned an unexpected service");

  if (expectedReleaseSha) {
    const headerRelease = (response.headers.get("x-haccora-release") ?? "").toLowerCase();
    const payloadRelease = String(body?.release ?? "").toLowerCase();
    if (headerRelease !== expectedReleaseSha || payloadRelease !== expectedReleaseSha) {
      throw new Error(
        `release identity mismatch (expected ${expectedReleaseSha}, header ${headerRelease || "missing"}, payload ${payloadRelease || "missing"})`,
      );
    }
  }

  const failedChecks = Object.entries(body?.checks ?? {})
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name);
  if (body?.status !== "ready" || body?.publicWebReady !== true || failedChecks.length) {
    throw new Error(
      `public runtime is not launch-ready${failedChecks.length ? ` (${failedChecks.join(", ")})` : ""}`,
    );
  }

  console.log(`Production readiness check passed (${readinessUrl.origin}).`);
} catch (error) {
  const reason = error?.name === "AbortError" ? `timed out after ${timeoutMs} ms` : error.message;
  console.error(`- Production readiness check failed: ${reason}`);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
