import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assessAudit, directAdvisories } from "../scripts/check-production-audits.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

function mobileAuditReport(advisory = "GHSA-w3rx-r6r6-pgpr") {
  return {
    vulnerabilities: {
      "image-size": {
        name: "image-size",
        severity: "high",
        via: [
          {
            name: "image-size",
            severity: "high",
            url: `https://github.com/advisories/${advisory}`,
          },
        ],
      },
      metro: { name: "metro", severity: "high", via: ["image-size"] },
      expo: { name: "expo", severity: "high", via: ["metro"] },
    },
  };
}

test("Phase 26 permits only exact, unexpired build-tool advisories", () => {
  const report = mobileAuditReport();
  const policy = {
    exceptions: [
      {
        scope: "mobile",
        package: "image-size",
        advisory: "GHSA-w3rx-r6r6-pgpr",
        severity: "high",
        expiresOn: "2026-09-30",
      },
    ],
  };
  assert.deepEqual(directAdvisories(report), [
    {
      advisory: "GHSA-W3RX-R6R6-PGPR",
      package: "image-size",
      severity: "high",
    },
  ]);
  assert.equal(
    assessAudit(report, "mobile", policy, new Date("2026-08-09T00:00:00Z")).passed,
    true,
  );
  assert.equal(
    assessAudit(report, "mobile", policy, new Date("2026-10-01T00:00:00Z")).passed,
    false,
  );
  assert.equal(
    assessAudit(
      mobileAuditReport("GHSA-UNEXPECTED-0000"),
      "mobile",
      policy,
      new Date("2026-08-09T00:00:00Z"),
    ).passed,
    false,
  );
});

test("Phase 26 records service-role-only scheduler heartbeats", async () => {
  const migration = await read("supabase/migrations/20260809120000_production_job_heartbeats.sql");
  assert.match(migration, /create table if not exists public\.service_job_heartbeats/i);
  assert.match(migration, /auth\.role\(\) <> 'service_role'/i);
  assert.match(
    migration,
    /revoke all on public\.service_job_heartbeats from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.record_service_job_heartbeat[\s\S]*to service_role/i,
  );

  for (const job of [
    "file-scan",
    "operations-dispatch",
    "integration-dispatch",
    "notification-dispatch",
  ]) {
    const source = await read(`supabase/functions/${job}/index.ts`);
    assert.match(source, /recordJobHeartbeat/);
    assert.match(source, new RegExp(`recordJobHeartbeat\\([\\s\\S]*?"${job}"[\\s\\S]*?"started"`));
    assert.match(
      source,
      new RegExp(`recordJobHeartbeat\\([\\s\\S]*?"${job}"[\\s\\S]*?"succeeded"`),
    );
  }
});

test("Phase 26 operations health is aggregate, protected and release-gating", async () => {
  const [health, checker, config, release, uptime, env] = await Promise.all([
    read("supabase/functions/operations-health/index.ts"),
    read("scripts/check-operations-health.mjs"),
    read("supabase/config.toml"),
    read(".github/workflows/release-readiness.yml"),
    read(".github/workflows/uptime.yml"),
    read(".env.example"),
  ]);
  assert.match(health, /x-monitor-secret/);
  assert.match(health, /OPERATIONS_MONITOR_SECRET/);
  assert.doesNotMatch(health, /SUPABASE_SERVICE_ROLE_KEY.*json/i);
  assert.match(health, /notificationDeadLetters/);
  assert.match(health, /healthy \? 200 : 503/);
  assert.match(checker, /\/functions\/v1\/operations-health/);
  assert.match(config, /\[functions\.operations-health\][\s\S]*verify_jwt = false/);
  assert.match(config, /\[functions\.notification-dispatch\][\s\S]*verify_jwt = false/);
  assert.match(release, /npm run operations:health/);
  assert.match(release, /OPERATIONS_HEALTH_PASSED: "true"/);
  assert.match(uptime, /OPERATIONS_MONITOR_SECRET/);
  assert.match(env, /^OPERATIONS_HEALTH_URL=/m);
  assert.match(env, /^OPERATIONS_MONITOR_SECRET=/m);
});

test("Phase 26 CI enforces the governed audit and all deployable Edge Functions", async () => {
  const [ci, packageJson, policy, mobilePackage] = await Promise.all([
    read(".github/workflows/ci.yml"),
    read("package.json"),
    read("security/dependency-audit-exceptions.json"),
    read("mobile/package.json"),
  ]);
  assert.match(ci, /npm run audit:production/);
  assert.match(ci, /operations-health\/index\.ts/);
  assert.equal(
    JSON.parse(packageJson).scripts["audit:production"],
    "node scripts/check-production-audits.mjs",
  );
  assert.equal(JSON.parse(policy).exceptions.length, 2);
  assert.equal(JSON.parse(mobilePackage).overrides.nanoid, "3.3.18");
  assert.equal(JSON.parse(mobilePackage).dependencies.nanoid, undefined);
});
