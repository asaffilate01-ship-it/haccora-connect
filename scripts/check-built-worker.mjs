import { stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const candidatePaths = [
  path.resolve(".output/server/index.mjs"),
  path.resolve("dist/server/index.mjs"),
];
let workerPath = null;
for (const candidate of candidatePaths) {
  try {
    await stat(candidate);
    workerPath = candidate;
    break;
  } catch {
    // try the next known production output location
  }
}
if (!workerPath) {
  throw new Error(`No production worker bundle found. Looked in: ${candidatePaths.join(", ")}`);
}

const workerModule = await import(pathToFileURL(workerPath).href);
const worker = workerModule.default;
if (!worker || typeof worker.fetch !== "function") {
  throw new Error("The production Cloudflare bundle does not export a fetch handler");
}

const placeholderUrl = "https://example.supabase.co";
const placeholderKey = "sb_publishable_worker_smoke_placeholder";
const env = {
  SUPABASE_URL: process.env.SUPABASE_URL ?? placeholderUrl,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY ?? placeholderKey,
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? placeholderUrl,
  VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? placeholderKey,
  PUBLIC_RELEASE_SHA: process.env.PUBLIC_RELEASE_SHA,
  HACCORA_RELEASE_SHA: process.env.HACCORA_RELEASE_SHA,
};
const fullCommitSha = /^[0-9a-f]{40}$/i;
const expectedReleaseSha = [
  process.env.PUBLIC_RELEASE_SHA,
  process.env.GITHUB_SHA,
  process.env.HACCORA_RELEASE_SHA,
].find((candidate) => fullCommitSha.test(candidate ?? ""));
const context = {
  waitUntil() {},
  passThroughOnException() {},
};
const routes = [
  ["/", "text/html"],
  ["/help", "text/html"],
  ["/login", "text/html", true],
  ["/blog", "text/html"],
  ["/legal/privacy", "text/html"],
  ["/health.json", "application/json"],
  ["/readiness.json", "application/json"],
  ["/app", "text/html", true],
  ["/onboarding", "text/html", true],
  ["/platform", "text/html", true],
  ["/account-status", "text/html", true],
];
const failures = [];

for (const [pathname, expectedContentType, privateCache] of routes) {
  const response = await worker.fetch(
    new Request(`https://worker-smoke.haccora.invalid${pathname}`),
    env,
    context,
  );
  const body = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status !== 200) {
    failures.push(`${pathname}: expected 200, received ${response.status}`);
  }
  if (!contentType.startsWith(expectedContentType)) {
    failures.push(
      `${pathname}: expected ${expectedContentType}, received ${contentType || "none"}`,
    );
  }
  if (body.includes('"message":"HTTPError"')) {
    failures.push(`${pathname}: production worker returned the generic HTTPError payload`);
  }
  if (pathname === "/readiness.json") {
    try {
      const payload = JSON.parse(body);
      if (
        payload.service !== "haccora-web" ||
        !new Set(["ready", "action_required"]).has(payload.status) ||
        typeof payload.publicWebReady !== "boolean" ||
        typeof payload.checks?.authentication !== "boolean"
      ) {
        failures.push(`${pathname}: readiness payload has an unexpected shape`);
      }
    } catch {
      failures.push(`${pathname}: readiness payload is not valid JSON`);
    }
  }
  if (response.headers.get("x-content-type-options") !== "nosniff") {
    failures.push(`${pathname}: missing X-Content-Type-Options security header`);
  }
  if (
    expectedReleaseSha &&
    response.headers.get("x-haccora-release")?.toLowerCase() !== expectedReleaseSha.toLowerCase()
  ) {
    failures.push(`${pathname}: release identity header does not match the built commit`);
  }
  if (!response.headers.has("content-security-policy")) {
    failures.push(`${pathname}: missing Content-Security-Policy security header`);
  }
  if (privateCache && !/\bno-store\b/i.test(response.headers.get("cache-control") ?? "")) {
    failures.push(`${pathname}: private route is missing Cache-Control: no-store`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Built Cloudflare worker smoke test passed (${routes.length} routes).`);
