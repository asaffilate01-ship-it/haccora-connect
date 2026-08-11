import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { nativeReleaseEnvironmentFailures } from "../mobile/scripts/native-release-environment.mjs";

const run = promisify(execFile);
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const validNativeEnvironment = {
  EXPO_PUBLIC_SUPABASE_URL: "https://phase40-test.supabase.co",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_phase40_test_key",
  EXPO_PUBLIC_WEB_APP_URL: "https://staging.haccora.co.uk",
  EAS_PROJECT_ID: "123e4567-e89b-42d3-a456-426614174000",
};

test("Phase 40 native releases require real public runtime configuration", async () => {
  assert.deepEqual(nativeReleaseEnvironmentFailures(validNativeEnvironment), []);
  assert.match(
    nativeReleaseEnvironmentFailures({
      ...validNativeEnvironment,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_forbidden_in_native",
    }).join("\n"),
    /must never contain a secret key/,
  );

  const [staticConfig, dynamicConfig, client, ci, internal, staging, production] =
    await Promise.all([
      read("mobile/app.json"),
      read("mobile/app.config.js"),
      read("mobile/lib/supabase.ts"),
      read(".github/workflows/ci.yml"),
      read(".github/workflows/native-internal-candidate.yml"),
      read(".github/workflows/staging-rehearsal.yml"),
      read(".github/workflows/release-readiness.yml"),
    ]);

  assert.doesNotMatch(staticConfig, /SET_WITH_EAS_INIT/);
  assert.match(dynamicConfig, /process\.env\.EAS_PROJECT_ID/);
  assert.match(client, /key\.startsWith\("sb_secret_"\)/);
  for (const workflow of [ci, internal, staging, production]) {
    assert.match(workflow, /EXPO_PUBLIC_SUPABASE_URL/);
    assert.match(workflow, /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    assert.match(workflow, /EXPO_PUBLIC_WEB_APP_URL/);
  }
  assert.match(internal, /npm run release:verify-build/);
});

test("Phase 40 verifies signed EAS output and stores only redacted build evidence", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "haccora-phase40-eas-"));
  const input = path.join(temporary, "raw.json");
  const output = path.join(temporary, "manifest.json");
  await writeFile(
    input,
    JSON.stringify([
      {
        id: "build-ios-1234",
        platform: "IOS",
        status: "FINISHED",
        distribution: "INTERNAL",
        artifacts: { buildUrl: "https://signed.example.test/ios?token=private" },
      },
      {
        id: "build-android-1234",
        platform: "ANDROID",
        status: "FINISHED",
        distribution: "INTERNAL",
        artifacts: { buildUrl: "https://signed.example.test/android?token=private" },
      },
    ]),
  );

  try {
    await run(process.execPath, [path.resolve("mobile/scripts/verify-eas-build-result.mjs")], {
      env: {
        ...process.env,
        EAS_BUILD_RESULT_FILE: input,
        EAS_BUILD_MANIFEST_FILE: output,
        EAS_EXPECTED_PLATFORM: "all",
        HACCORA_RELEASE_SHA: "a".repeat(40),
      },
    });
    const manifest = JSON.parse(await readFile(output, "utf8"));
    assert.equal(manifest.releaseSha, "a".repeat(40));
    assert.deepEqual(
      manifest.builds.map((build) => build.platform),
      ["android", "ios"],
    );
    assert.doesNotMatch(JSON.stringify(manifest), /signed\.example\.test|token=private/);
    assert.match(manifest.sourceResultSha256, /^[a-f0-9]{64}$/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("Phase 40 makes hosted desktop and mobile accessibility release evidence", async () => {
  const [playwright, staging, production, stagingEvidence, releaseEvidence, accessibility] =
    await Promise.all([
      read("playwright.config.ts"),
      read(".github/workflows/staging-rehearsal.yml"),
      read(".github/workflows/release-readiness.yml"),
      read("scripts/generate-staging-evidence.mjs"),
      read("scripts/generate-release-evidence.mjs"),
      read("tests/e2e/public-accessibility.spec.ts"),
    ]);

  assert.match(playwright, /PLAYWRIGHT_BASE_URL/);
  assert.match(playwright, /PLAYWRIGHT_JSON_OUTPUT_FILE/);
  assert.match(playwright, /url\.protocol !== "https:"/);
  for (const workflow of [staging, production]) {
    assert.match(workflow, /Run desktop and mobile browser accessibility/);
    assert.match(workflow, /npm run test:e2e/);
    assert.match(workflow, /hosted-browser-results\.json/);
  }
  assert.match(stagingEvidence, /HOSTED_BROWSER_E2E_PASSED/);
  assert.match(releaseEvidence, /HOSTED_BROWSER_E2E_PASSED/);
  assert.doesNotMatch(accessibility, /passwort/i);
});
