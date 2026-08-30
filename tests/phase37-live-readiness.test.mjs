import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("Phase 37 blocks public-client and obsolete-brand drift during every build", async () => {
  const [client, integrity, packageText] = await Promise.all([
    read("src/integrations/supabase/haccora-client.ts"),
    read("scripts/check-source-integrity.mjs"),
    read("package.json"),
  ]);
  const scripts = JSON.parse(packageText).scripts;

  assert.match(client, /getPublicSupabaseConfig/);
  assert.doesNotMatch(client, /Connect Supabase in Lovable Cloud/);
  assert.match(integrity, /hosting integration's generated public client/);
  assert.match(integrity, /haccora-logo\.png\.asset\.json/);
  assert.equal((scripts.build.match(/check-source-integrity\.mjs/g) ?? []).length, 2);
  await assert.rejects(
    access(new URL("../src/assets/haccora-logo.png.asset.json", import.meta.url)),
  );
});

test("Phase 37 exposes release-bound public runtime readiness without secrets", async () => {
  const [route, checker, workflow, evidence] = await Promise.all([
    read("src/routes/readiness[.]json.ts"),
    read("scripts/check-deployment-readiness.mjs"),
    read(".github/workflows/release-readiness.yml"),
    read("scripts/generate-release-evidence.mjs"),
  ]);

  for (const marker of [
    "authentication",
    "legalIdentity",
    "legalApproval",
    "support",
    "statusPage",
    "browserPush",
    "payments",
    "publicWebReady",
  ]) {
    assert.match(route, new RegExp(marker));
  }
  assert.match(checker, /\/readiness\.json/);
  assert.match(checker, /EXPECTED_RELEASE_SHA/);
  assert.match(checker, /public runtime is not launch-ready/);
  assert.doesNotMatch(route, /Deno\.env\.toObject|JSON\.stringify\(process\.env\)/);
  assert.match(route, /payments: lovablePaymentsReady\(\)/);
  assert.match(workflow, /npm run readiness:check/);
  assert.match(workflow, /DEPLOYMENT_READINESS_PASSED: "true"/);
  assert.match(evidence, /DEPLOYMENT_READINESS_PASSED/);
});

test("deployment readiness requires a clean HTTPS target and full release identity", async () => {
  const checker = path.resolve("scripts/check-deployment-readiness.mjs");
  await assert.rejects(
    run(process.execPath, [checker], { env: { ...process.env, PRODUCTION_URL: "" } }),
    (error) => /PRODUCTION_URL is missing/.test(error.stderr),
  );
  await assert.rejects(
    run(process.execPath, [checker], {
      env: { ...process.env, PRODUCTION_URL: "http://example.com" },
    }),
    (error) => /must use HTTPS/.test(error.stderr),
  );
  await assert.rejects(
    run(process.execPath, [checker], {
      env: {
        ...process.env,
        PRODUCTION_URL: "https://example.com",
        EXPECTED_RELEASE_SHA: "0123456789abcdef",
      },
    }),
    (error) => /full 40-character Git commit SHA/.test(error.stderr),
  );
});
