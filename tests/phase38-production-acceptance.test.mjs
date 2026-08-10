import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("Phase 38 restores and independently enforces every generated authentication boundary", async () => {
  const [integrity, client, middleware, serverClient, attacher, ci] = await Promise.all([
    read("scripts/check-source-integrity.mjs"),
    read("src/integrations/supabase/client.ts"),
    read("src/integrations/supabase/auth-middleware.ts"),
    read("src/integrations/supabase/client.server.ts"),
    read("src/integrations/supabase/auth-attacher.ts"),
    read(".github/workflows/ci.yml"),
  ]);

  assert.match(client, /getPublicSupabaseConfig/);
  assert.doesNotMatch(client, /Connect Supabase in Lovable Cloud/);
  assert.match(middleware, /supabase\.auth\.getClaims\(token\)/);
  assert.match(serverClient, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(attacher, /Authorization: `Bearer \$\{token\}`/);
  for (const marker of [
    "auth-attacher.ts",
    "getPublicSupabaseConfig",
    "supabase.auth.getClaims(token)",
    "SUPABASE_SERVICE_ROLE_KEY",
    "supabase.auth.getSession()",
  ]) {
    assert.match(integrity, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(ci, /release-integrity:/);
  assert.match(ci, /npm run source:integrity/);
  await run(process.execPath, [path.resolve("scripts/check-source-integrity.mjs")]);
});

test("the root lockfile is reproducible with the npm major used by GitHub", async () => {
  const [packageText, lockText] = await Promise.all([
    read("package.json"),
    read("package-lock.json"),
  ]);
  const packageJson = JSON.parse(packageText);
  const lock = JSON.parse(lockText);

  assert.equal(packageJson.packageManager, "npm@10.9.4");
  assert.equal(lock.packages?.["node_modules/nitro/node_modules/lru-cache"]?.version, "11.5.2");
});

test("Supabase Auth health fails closed before making unsafe requests", async () => {
  const checker = path.resolve("scripts/check-supabase-auth-health.mjs");
  await assert.rejects(run(process.execPath, [checker], { env: {} }), (error) =>
    /SUPABASE_URL is missing/.test(error.stderr),
  );
  await assert.rejects(
    run(process.execPath, [checker], {
      env: { SUPABASE_URL: "http://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public" },
    }),
    (error) => /must use HTTPS/.test(error.stderr),
  );
  await assert.rejects(
    run(process.execPath, [checker], {
      env: {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_secret_never_use_here",
      },
    }),
    (error) => /must not contain a Supabase secret key/.test(error.stderr),
  );
});

test("release and scheduled monitoring prove authentication, readiness and release identity", async () => {
  const [release, staging, uptime, evidence] = await Promise.all([
    read(".github/workflows/release-readiness.yml"),
    read(".github/workflows/staging-rehearsal.yml"),
    read(".github/workflows/uptime.yml"),
    read("scripts/generate-release-evidence.mjs"),
  ]);

  assert.match(release, /npm run auth:health/);
  assert.match(release, /AUTH_HEALTH_PASSED: "true"/);
  assert.match(staging, /auth-health\.txt/);
  assert.match(uptime, /PRODUCTION_RELEASE_SHA/);
  assert.match(uptime, /PRODUCTION_PUBLIC_LAUNCH/);
  assert.match(uptime, /check-supabase-auth-health\.mjs/);
  assert.match(uptime, /check-deployment-readiness\.mjs/);
  assert.match(evidence, /AUTH_HEALTH_PASSED/);
});
