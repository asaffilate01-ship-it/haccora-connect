import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("Edge CORS trusts exact configured origins and bounds request bodies", async () => {
  const source = await read("supabase/functions/_shared/http.ts");
  assert.match(source, /https:\/\/app\.haccora\.co\.uk/);
  assert.match(source, /configuredOrigins\.has\(normalized\)/);
  assert.doesNotMatch(source, /endsWith\(["']\.lovable/);
  assert.match(source, /status: 403/);
  assert.match(source, /RequestBodyError\("body_too_large", 413\)/);
});

test("all Edge handlers parse public bodies through bounded readers", async () => {
  const handlers = [
    "billing",
    "contact",
    "dokuvera-admin",
    "dokuvera-webhook",
    "inspection-export",
    "inspector-invite",
    "integration-admin",
    "platform-admin",
    "privacy-requests",
    "security-center",
    "sensor-ingest",
    "sensor-provision",
    "team-invite",
  ];
  for (const handler of handlers) {
    const source = await read(`supabase/functions/${handler}/index.ts`);
    assert.doesNotMatch(source, /request\.(?:json|text)\(\)/, handler);
    assert.match(source, /read(?:JsonBody|LimitedText)\(request, /, handler);
  }
});

test("webhook dispatch resists basic SSRF and resource exhaustion", async () => {
  const [guard, dispatch] = await Promise.all([
    read("supabase/functions/_shared/webhook-url.ts"),
    read("supabase/functions/integration-dispatch/index.ts"),
  ]);
  assert.match(guard, /value\.length > 2048/);
  assert.match(guard, /direct IP literals are not supported/);
  assert.match(guard, /\.internal/);
  assert.match(dispatch, /redirect: "error"/);
  assert.match(dispatch, /AbortSignal\.timeout\(15_000\)/);
});

test("server auth failures and browser policy fail closed", async () => {
  const [middleware, server, errorPage] = await Promise.all([
    read("src/integrations/supabase/haccora-auth-middleware.ts"),
    read("src/server.ts"),
    read("src/lib/error-page.ts"),
  ]);
  assert.match(middleware, /statusCode: 401/);
  assert.match(middleware, /getClaims\(token\)/);
  assert.match(server, /script-src-attr 'none'/);
  assert.match(server, /frame-ancestors 'none'/);
  assert.doesNotMatch(errorPage, /onclick=/i);
});
