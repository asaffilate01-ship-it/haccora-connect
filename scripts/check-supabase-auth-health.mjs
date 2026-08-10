const rawUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").trim();
const publishableKey = (
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  ""
).trim();
const timeoutMs = Number.parseInt(process.env.AUTH_HEALTH_TIMEOUT_MS ?? "10000", 10);

if (!rawUrl) {
  console.error("- SUPABASE_URL is missing");
  process.exit(1);
}
if (!publishableKey) {
  console.error("- SUPABASE_PUBLISHABLE_KEY is missing");
  process.exit(1);
}
if (publishableKey.startsWith("sb_secret_")) {
  console.error("- SUPABASE_PUBLISHABLE_KEY must not contain a Supabase secret key");
  process.exit(1);
}
if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
  console.error("- AUTH_HEALTH_TIMEOUT_MS must be between 1000 and 60000");
  process.exit(1);
}

let endpoint;
try {
  const base = new URL(rawUrl);
  if (base.protocol !== "https:") throw new Error("must use HTTPS");
  if (base.username || base.password || base.search || base.hash) {
    throw new Error("must not contain credentials, a query string or a fragment");
  }
  endpoint = new URL("/auth/v1/health", base);
} catch (error) {
  console.error(`- SUPABASE_URL is invalid: ${error.message}`);
  process.exit(1);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
  const response = await fetch(endpoint, {
    cache: "no-store",
    redirect: "error",
    signal: controller.signal,
    headers: {
      apikey: publishableKey,
      "User-Agent": "Haccora-Auth-Health/1.0",
    },
  });
  if (!response.ok) throw new Error(`returned HTTP ${response.status}`);
  if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    throw new Error("returned an unexpected Content-Type");
  }

  const body = await response.json();
  if (body?.name !== "GoTrue" || typeof body?.version !== "string" || !body.version.trim()) {
    throw new Error("returned an unexpected health payload");
  }

  console.log(`Supabase authentication health passed (${endpoint.hostname}).`);
} catch (error) {
  const reason = error?.name === "AbortError" ? `timed out after ${timeoutMs} ms` : error.message;
  console.error(`- Supabase authentication health failed: ${reason}`);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
