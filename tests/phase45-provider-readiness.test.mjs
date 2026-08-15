import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const [helper, endpoint, platform, fsaProspects, ci, release] = await Promise.all([
  read("supabase/functions/_shared/provider-readiness.ts"),
  read("supabase/functions/platform-readiness/index.ts"),
  read("src/routes/platform.tsx"),
  read("src/lib/fsa-prospects.functions.ts"),
  read(".github/workflows/ci.yml"),
  read(".github/workflows/release-readiness.yml"),
]);

test("Phase 45 fails provider readiness closed on malformed production values", () => {
  assert.match(helper, /validHttpsOrigin/);
  assert.match(helper, /allowed\.has\(new URL\(applicationUrl\)\.origin\)/);
  assert.match(helper, /\(\?:sk\|rk\)_live_/);
  assert.match(helper, /whsec_/);
  assert.match(helper, /price_/);
  assert.match(helper, /VIRUSTOTAL_API_KEY/);
  assert.match(helper, /MALWARE_SCAN_TOKEN", 20/);
  assert.match(helper, /WEB_PUSH_GATEWAY_TOKEN", 32/);
  assert.match(helper, /OPERATIONS_MONITOR_SECRET[\s\S]*32/);
  assert.match(helper, /INTEGRATION_ENCRYPTION_KEY[\s\S]*32/);
  assert.match(helper, /validIsoDate/);
});

test("the protected endpoint returns status only and preserves the evidence caveat", () => {
  assert.match(endpoint, /evaluateProviderConfiguration/);
  assert.doesNotMatch(endpoint, /Deno\.env\.toObject/);
  assert.match(endpoint, /present and structurally valid/);
  assert.match(platform, /Shape-valid · verification required/);
  assert.match(platform, /Invalid or missing/);
});

test("release convergence removes the deprecated TanStack validator API", () => {
  assert.match(fsaProspects, /\.validator\(/);
  assert.doesNotMatch(fsaProspects, /\.inputValidator\(/);
});

test("CI and release readiness execute the provider shape tests", () => {
  for (const workflow of [ci, release]) {
    assert.match(workflow, /deno test --no-lock _shared\/provider-readiness\.test\.ts/);
  }
});
