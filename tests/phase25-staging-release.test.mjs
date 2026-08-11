import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const read = (file) => readFile(file, "utf8");

function safeStagingEnvironment() {
  const stagingRef = "abcdefghijklmnopqrst";
  return {
    ...process.env,
    HACCORA_ENV: "staging",
    STAGING_DEPLOY_CONFIRM: "HACCORA_STAGING_ONLY",
    STAGING_BACKUP_OR_DISPOSABLE_CONFIRMED: "false",
    STAGING_APPLY_CHANGES: "false",
    STAGING_PROJECT_REF: stagingRef,
    PRODUCTION_SUPABASE_PROJECT_REF: "uvwxyzabcdefghijklmn",
    STAGING_SUPABASE_URL: `https://${stagingRef}.supabase.co`,
    SUPABASE_URL: `https://${stagingRef}.supabase.co`,
    DEMO_ALLOWED_SUPABASE_URL: `https://${stagingRef}.supabase.co`,
    STAGING_APP_URL: "https://staging.haccora.test",
    PRODUCTION_APP_URL: "https://app.haccora.test",
    EXPECTED_RELEASE_SHA: "a".repeat(40),
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abcdefghijklmnopqrstuvwxyz",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-0123456789abcdefghijklmnopqrstuvwxyz",
    SUPABASE_ACCESS_TOKEN: "access-token-0123456789abcdefghijklmnopqrstuvwxyz",
    SUPABASE_DB_PASSWORD: "database-password-0123456789",
    DEMO_SEED_CONFIRM: "HACCORA_DEMO_ONLY",
    DEMO_EMAIL_DOMAIN: "demo.haccora.test",
    DEMO_PASSWORD: "demo-password-0123456789",
  };
}

test("Phase 25 staging preflight accepts an isolated verify-only environment", async () => {
  const result = await run("node", ["scripts/verify-staging-env.mjs"], {
    env: safeStagingEnvironment(),
  });
  assert.match(result.stdout, /Protected staging environment preflight passed/);
});

test("Phase 25 staging preflight refuses the production Supabase project", async () => {
  const env = safeStagingEnvironment();
  env.PRODUCTION_SUPABASE_PROJECT_REF = env.STAGING_PROJECT_REF;
  await assert.rejects(
    run("node", ["scripts/verify-staging-env.mjs"], { env }),
    /staging and production Supabase project refs must be different/,
  );
});

test("Phase 25 verifies a complete remote migration ledger", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "haccora-ledger-"));
  const versions = (await readdir("supabase/migrations"))
    .filter((file) => /^\d{14}_.+\.sql$/.test(file))
    .map((file) => file.slice(0, 14))
    .sort();
  const ledger = [
    "LOCAL          │ REMOTE         │ TIME (UTC)",
    ...versions.map((version) => `${version} │ ${version} │ verified`),
  ].join("\n");
  const ledgerFile = path.join(directory, "migration-list.txt");
  await writeFile(ledgerFile, ledger, "utf8");
  const result = await run("node", ["scripts/verify-remote-migration-ledger.mjs"], {
    env: {
      ...process.env,
      STAGING_MIGRATION_LIST_FILE: ledgerFile,
      HACCORA_EVIDENCE_DIR: directory,
    },
  });
  assert.match(result.stdout, new RegExp(`verified \\(${versions.length} migrations\\)`));
  const report = JSON.parse(await readFile(path.join(directory, "staging-migration-ledger.json")));
  assert.equal(report.passed, true);
  assert.equal(report.matchedMigrations, versions.length);
});

test("Phase 25 preserves the two published Phase 24 ledger entries", async () => {
  const checker = await read("scripts/check-migration-lineage.mjs");
  assert.match(checker, /public\.register_my_push_token:20260808172806_.+:20260808190000_/);
  assert.match(checker, /preserve the files and allow only this/);
});

test("Phase 25 staging workflow is protected, forward-only and evidence producing", async () => {
  const workflow = await read(".github/workflows/staging-rehearsal.yml");
  for (const marker of [
    "environment: staging",
    "STAGING_DEPLOY_CONFIRM",
    "supabase db push --dry-run",
    "supabase db push --linked --include-all",
    "supabase migration list",
    "supabase functions deploy",
    "npm run demo:access",
    "generate-staging-evidence.mjs",
  ]) {
    assert.match(workflow, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(workflow, /supabase db reset/);
});

test("Phase 25 native candidate is pinned, committed and internal", async () => {
  const workflow = await read(".github/workflows/native-internal-candidate.yml");
  const eas = JSON.parse(await read("mobile/eas.json"));
  const preflight = await read("mobile/scripts/verify-internal-build-env.mjs");
  assert.match(workflow, /eas-cli@\$\{EAS_CLI_VERSION\}/);
  assert.match(workflow, /--profile preview/);
  assert.doesNotMatch(workflow, /--auto-submit/);
  assert.equal(eas.cli.requireCommit, true);
  assert.equal(eas.build.preview.distribution, "internal");
  assert.equal(eas.build.preview.channel, "staging");
  assert.match(preflight, /EXPO_TOKEN/);
  assert.match(preflight, /nativeReleaseEnvironmentFailures/);
  assert.match(workflow, /EAS_PROJECT_ID/);
});

test("Phase 25 hosted RLS rehearsal checks sensitive evidence and inspector writes", async () => {
  const access = await read("scripts/check-demo-role-access.mjs");
  for (const table of ["assets", "documents", "goods_in_logs", "training_records"]) {
    assert.match(access, new RegExp(`"${table}"`));
  }
  assert.match(access, /Inspector cannot create operational evidence/);
  assert.match(access, /tenantBoundary/);
});
