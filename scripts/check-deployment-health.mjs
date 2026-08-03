const rawUrl = (process.env.PRODUCTION_URL ?? "").trim();
const expectedReleaseSha = (process.env.EXPECTED_RELEASE_SHA ?? "").trim().toLowerCase();
const fullCommitSha = /^[0-9a-f]{40}$/;

if (!rawUrl) {
  console.error("- PRODUCTION_URL is missing");
  process.exit(1);
}

if (expectedReleaseSha && !fullCommitSha.test(expectedReleaseSha)) {
  console.error("- EXPECTED_RELEASE_SHA must be a full 40-character Git commit SHA");
  process.exit(1);
}

let healthUrl;
try {
  const productionUrl = new URL(rawUrl);
  if (productionUrl.protocol !== "https:") throw new Error("must use HTTPS");
  healthUrl = new URL("/health.json", productionUrl);
} catch (error) {
  console.error(`- PRODUCTION_URL is invalid: ${error.message}`);
  process.exit(1);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);

try {
  const response = await fetch(healthUrl, {
    cache: "no-store",
    redirect: "error",
    signal: controller.signal,
  });
  if (!response.ok) throw new Error(`returned HTTP ${response.status}`);
  if (!(response.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    throw new Error("returned an unexpected Content-Type");
  }
  if (!response.headers.get("cache-control")?.includes("no-store")) {
    throw new Error("is missing Cache-Control: no-store");
  }
  const body = await response.json();
  if (body?.status !== "ok" || body?.service !== "haccora-web") {
    throw new Error("returned an unexpected health payload");
  }
  if (expectedReleaseSha) {
    const headerRelease = (response.headers.get("x-haccora-release") ?? "").toLowerCase();
    const payloadRelease = String(body?.release ?? "").toLowerCase();
    if (headerRelease !== expectedReleaseSha || payloadRelease !== expectedReleaseSha) {
      throw new Error(
        `release identity mismatch (expected ${expectedReleaseSha}, header ${headerRelease || "missing"}, payload ${payloadRelease || "missing"})`,
      );
    }
  }
  console.log(`Production health check passed (${healthUrl.origin}).`);
} catch (error) {
  console.error(`- Production health check failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
