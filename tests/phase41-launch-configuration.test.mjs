import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

import { bootstrapLaunchConfiguration } from "../scripts/bootstrap-launch-config.mjs";
import {
  evaluateLaunchReadiness,
  formatLaunchReadiness,
  generatedLaunchSecretNames,
  launchRequirements,
  serialiseLaunchReadiness,
} from "../scripts/launch-requirements.mjs";

const run = promisify(execFile);
const root = path.resolve(new URL("..", import.meta.url).pathname);

function completeEnvironment() {
  const publishable = "sb_publishable_phase41_validation_key";
  return {
    VITE_SUPABASE_URL: "https://phase41.supabase.co",
    SUPABASE_URL: "https://phase41.supabase.co",
    PUBLIC_MARKETING_URL: "https://haccora.co.uk",
    PUBLIC_APP_URL: "https://app.haccora.co.uk",
    OPERATIONS_HEALTH_URL: "https://phase41.supabase.co/functions/v1/operations-health",
    ALLOWED_ORIGINS: "https://app.haccora.co.uk,https://haccora.co.uk",
    VITE_SUPABASE_PUBLISHABLE_KEY: publishable,
    SUPABASE_PUBLISHABLE_KEY: publishable,
    VITE_LEGAL_COMPANY_NAME: "iTechLounge",
    VITE_LEGAL_ADDRESS_LINE_1: "1 Validation Way",
    VITE_LEGAL_POSTAL_CITY: "London",
    VITE_LEGAL_REGISTERED_IN: "England and Wales",
    VITE_LEGAL_COMPANY_NUMBER: "01234567",
    VITE_LEGAL_EMAIL: "legal@haccora.co.uk",
    VITE_LEGAL_PHONE: "+44 20 7946 0000",
    LEGAL_COUNSEL_APPROVAL_REFERENCE: "COUNSEL-VALIDATION-41",
    LEGAL_COUNSEL_APPROVED_AT: "2026-08-11",
    LEGAL_ICO_FEE_STATUS_CONFIRMED: "true",
    VITE_LEGAL_CONTENT_APPROVED: "true",
    VITE_PAYMENTS_CLIENT_TOKEN: ["pk", "live", "validation", "only"].join("_"),
    STRIPE_LIVE_API_KEY: "lovable_connection_validation_only",
    LOVABLE_API_KEY: "lovable_api_validation_only",
    PAYMENTS_LIVE_WEBHOOK_SECRET: ["whsec", "validation", "only"].join("_"),
    PAYMENTS_ENVIRONMENT: "live",
    PAYMENTS_RUNTIME_PROVIDER: "lovable",
    PAYMENTS_WEBHOOK_URL: "https://app.haccora.co.uk/api/public/payments/webhook",
    RESEND_API_KEY: "re_validation_only",
    NOTIFICATION_FROM_EMAIL: "Haccora Alerts <alerts@haccora.co.uk>",
    MALWARE_SCAN_URL: "https://app.haccora.co.uk/api/public/malware-scan",
    MALWARE_SCAN_TOKEN: "m".repeat(24),
    VIRUSTOTAL_API_KEY: "v".repeat(24),
    VITE_WEB_PUSH_PUBLIC_KEY: "vapid_public_validation_key",
    WEB_PUSH_GATEWAY_URL: "https://push.haccora.co.uk/send",
    WEB_PUSH_GATEWAY_TOKEN: "w".repeat(43),
    CONTACT_HASH_SALT: "c".repeat(43),
    CRON_SECRET: "r".repeat(43),
    OPERATIONS_MONITOR_SECRET: "o".repeat(43),
    INTEGRATION_ENCRYPTION_KEY: "i".repeat(43),
    VITE_SUPPORT_URL: "https://support.haccora.co.uk",
    VITE_STATUS_URL: "https://status.haccora.co.uk",
    EXPO_PUBLIC_SUPABASE_URL: "https://phase41.supabase.co",
    EXPO_PUBLIC_WEB_APP_URL: "https://app.haccora.co.uk",
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable,
    EAS_PROJECT_ID: "123e4567-e89b-43d3-a456-436614174000",
    EXPO_ACCESS_TOKEN: "e".repeat(24),
  };
}

function parseAssignments(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]]),
  );
}

test("Phase 41 reports 45 unique production configuration controls by accountable owner", async () => {
  assert.equal(launchRequirements.length, 45);
  assert.equal(new Set(launchRequirements.map((item) => item.name)).size, 45);
  const result = await evaluateLaunchReadiness({ environment: {}, root });
  assert.equal(result.failedControls, 45);
  assert.equal(result.issues.length, 44);
  assert.equal(result.groups.filter((group) => group.issues.length).length, 10);
  const output = formatLaunchReadiness(result);
  assert.match(output, /Application and Supabase/);
  assert.match(output, /Legal and ICO approval/);
  assert.match(output, /Stripe live billing/);
  assert.match(output, /Native iOS and Android release/);
  assert.equal((output.match(/MALWARE_SCAN_TOKEN is missing/g) ?? []).length, 1);
  assert.equal((output.match(/EXPO_ACCESS_TOKEN is missing/g) ?? []).length, 1);
});

test("Phase 41 accepts a complete production-shaped environment without weakening the gate", async () => {
  const result = await evaluateLaunchReadiness({ environment: completeEnvironment(), root });
  assert.equal(result.ready, true, formatLaunchReadiness(result));
  assert.equal(result.passedControls, 45);
  assert.equal(result.issues.length, 0);
});

test("Phase 41 rejects Stripe sandbox credentials even when the live flag is true", async () => {
  const environment = completeEnvironment();
  environment.VITE_PAYMENTS_CLIENT_TOKEN = ["pk", "test", "must", "not", "launch"].join("_");
  const result = await evaluateLaunchReadiness({ environment, root });
  assert.equal(result.ready, false);
  assert.match(
    formatLaunchReadiness(result),
    /must be a Stripe live-mode publishable key/,
  );
});

test("Phase 41 keeps every launch control wired into the protected GitHub environment", async () => {
  const workflow = await readFile(
    path.join(root, ".github/workflows/release-readiness.yml"),
    "utf8",
  );
  for (const requirement of launchRequirements) {
    assert.match(workflow, new RegExp(`^\\s+${requirement.name}:`, "m"), requirement.name);
  }
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /npm run launch:preflight/);
});

test("Phase 41 launch evidence never serialises configured values", async () => {
  const environment = completeEnvironment();
  const sentinel = "DO_NOT_PRINT_THIS_PROVIDER_SECRET";
  environment.RESEND_API_KEY = sentinel;
  delete environment.PAYMENTS_LIVE_WEBHOOK_SECRET;
  const result = await evaluateLaunchReadiness({ environment, root });
  const rendered = `${formatLaunchReadiness(result)}\n${JSON.stringify(serialiseLaunchReadiness(result))}`;
  assert.doesNotMatch(rendered, new RegExp(sentinel));
  assert.match(rendered, /PAYMENTS_LIVE_WEBHOOK_SECRET is missing/);
});

test("Phase 41 bootstrap creates an ignored 0600 file and is idempotent", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "haccora-phase41-"));
  await writeFile(
    path.join(directory, ".env.example"),
    generatedLaunchSecretNames
      .map((name) => `${name}=generate-at-least-32-random-characters`)
      .join("\n"),
    "utf8",
  );
  const first = await bootstrapLaunchConfiguration({ root: directory });
  assert.deepEqual(first.generated.sort(), [...generatedLaunchSecretNames].sort());
  const firstContent = await readFile(first.target, "utf8");
  const firstValues = parseAssignments(firstContent);
  assert.equal(new Set(generatedLaunchSecretNames.map((name) => firstValues[name])).size, 5);
  for (const name of generatedLaunchSecretNames) assert.ok(firstValues[name].length >= 32);
  assert.equal((await stat(first.target)).mode & 0o777, 0o600);

  const second = await bootstrapLaunchConfiguration({ root: directory });
  const secondContent = await readFile(second.target, "utf8");
  assert.equal(second.generated.length, 0);
  assert.equal(second.preserved.length, 5);
  assert.equal(secondContent, firstContent);
});

test("Phase 41 bootstrap refuses to write secrets into a tracked file", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "haccora-phase41-tracked-"));
  await writeFile(path.join(directory, ".env.example"), "CRON_SECRET=\n", "utf8");
  await writeFile(path.join(directory, ".env.launch.local"), "CRON_SECRET=\n", "utf8");
  await run("git", ["init", "--quiet"], { cwd: directory });
  try {
    await run("git", ["add", ".env.launch.local"], { cwd: directory });
  } catch (error) {
    // Some sandboxed environments forbid staging files; the gate itself is unchanged.
    if (/not allowed/.test(String(error?.stderr ?? error))) {
      t.skip("Git staging is unavailable in this environment");
      return;
    }
    throw error;
  }
  await assert.rejects(bootstrapLaunchConfiguration({ root: directory }), /is tracked by Git/);
});
