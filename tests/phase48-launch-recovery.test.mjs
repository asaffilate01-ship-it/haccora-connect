import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("published fixed-password platform identities are revoked before authentication returns", async () => {
  const [provision, remediation] = await Promise.all([
    read("supabase/migrations/20260816074111_8e45c285-9600-43f9-b3e2-045fa8f9c742.sql"),
    read("supabase/migrations/20260816170000_revoke_embedded_demo_platform_accounts.sql"),
  ]);

  assert.match(provision, /insert into auth\.users/i);
  assert.match(remediation, /status = 'revoked'/i);
  assert.match(remediation, /DELETE FROM auth\.sessions/i);
  assert.match(remediation, /DELETE FROM auth\.refresh_tokens/i);
  assert.match(remediation, /DELETE FROM auth\.identities/i);
  assert.match(remediation, /banned_until = 'infinity'/i);
  assert.match(remediation, /gen_random_bytes\(48\)/i);
  assert.doesNotMatch(remediation, /HaccoraDemo/i);
});

test("the secret gate pins the historic migration and rejects new database passwords", async () => {
  const scanner = path.resolve("scripts/check-secrets.mjs");
  const scannerSource = await read("scripts/check-secrets.mjs");
  assert.match(scannerSource, /publishedDemoProvision/);
  assert.match(
    scannerSource,
    /database passwords must not be provisioned by production migrations/,
  );
  assert.match(scannerSource, /943524c296b06ba61d74b9494e1f6f5a127689966b7168c0dc59c32adb78ef8d/);

  const directory = await mkdtemp(path.join(os.tmpdir(), "haccora-password-migration-"));
  try {
    await run("git", ["init", "--quiet"], { cwd: directory });
    const migrationDirectory = path.join(directory, "supabase", "migrations");
    await mkdir(migrationDirectory, { recursive: true });
    const migration = path.join(migrationDirectory, "20260817000000_unsafe_password.sql");
    await writeFile(
      migration,
      "insert into auth.users (email, encrypted_password) values ('x@example.test', crypt('fixed-password', gen_salt('bf')));\n",
    );
    await run("git", ["add", "."], { cwd: directory });
    await assert.rejects(run(process.execPath, [scanner], { cwd: directory }), (error) =>
      /database passwords must not be provisioned/.test(error.stderr),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("SSR and browser agree about whether interactive authentication exists", async () => {
  const [configuration, readiness, integrity] = await Promise.all([
    read("src/integrations/supabase/config.ts"),
    read("src/routes/readiness[.]json.ts"),
    read("scripts/check-source-integrity.mjs"),
  ]);

  assert.match(configuration, /getBrowserSupabaseConfig/);
  assert.doesNotMatch(configuration, /process\.env|runtimeEnvironment/);
  assert.match(readiness, /getBrowserSupabaseConfig\(\)\.configured/);
  assert.match(integrity, /server-only values/);
});

test("uptime and release evidence fail closed when browser authentication is absent", async () => {
  const [checker, uptime, release, evidence, packageText] = await Promise.all([
    read("scripts/check-deployment-client-auth.mjs"),
    read(".github/workflows/uptime.yml"),
    read(".github/workflows/release-readiness.yml"),
    read("scripts/generate-release-evidence.mjs"),
    read("package.json"),
  ]);
  const scripts = JSON.parse(packageText).scripts;

  assert.equal(scripts["auth:client:health"], "node scripts/check-deployment-client-auth.mjs");
  assert.match(checker, /checks\?\.authentication !== true/);
  assert.match(uptime, /check-deployment-client-auth\.mjs/);
  assert.match(release, /npm run auth:client:health/);
  assert.match(release, /CLIENT_AUTH_HEALTH_PASSED: "true"/);
  assert.match(evidence, /CLIENT_AUTH_HEALTH_PASSED/);

  await assert.rejects(
    run(process.execPath, [path.resolve("scripts/check-deployment-client-auth.mjs")], {
      env: { ...process.env, PRODUCTION_URL: "" },
    }),
    (error) => /PRODUCTION_URL is missing/.test(error.stderr),
  );
});
