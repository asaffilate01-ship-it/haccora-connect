import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const [
  platform,
  readiness,
  providerReadiness,
  admin,
  migration,
  config,
  ci,
  release,
  publicConfig,
] = await Promise.all([
  read("src/routes/platform.tsx"),
  read("supabase/functions/platform-readiness/index.ts"),
  read("supabase/functions/_shared/provider-readiness.ts"),
  read("supabase/functions/platform-admin/index.ts"),
  read("supabase/migrations/20260809230000_platform_step_up_security.sql"),
  read("supabase/config.toml"),
  read(".github/workflows/ci.yml"),
  read(".github/workflows/release-readiness.yml"),
  read("src/lib/public-config.ts"),
]);

test("Phase 34 adds an audited and aggregate SaaS-owner launch centre", () => {
  assert.match(platform, /Launch centre/);
  assert.match(platform, /platform-readiness/);
  assert.match(platform, /Scheduled operations/);
  assert.match(platform, /Production configuration/);
  assert.match(platform, /configuration is not proof/i);
  assert.match(readiness, /get_my_platform_context/);
  assert.match(readiness, /platform_owner/);
  assert.match(readiness, /platform_auditor/);
  assert.match(readiness, /platform_launch_readiness_viewed/);
  assert.match(readiness, /notificationDeadLetters/);
  assert.doesNotMatch(readiness, /SUPABASE_SERVICE_ROLE_KEY.*json/i);
});

test("provider readiness reports structural validity without exposing or overstating verification", () => {
  for (const marker of [
    "RESEND_API_KEY",
    "EXPO_ACCESS_TOKEN",
    "MALWARE_SCAN_URL",
    "PAYMENTS_RUNTIME_PROVIDER",
    "PAYMENTS_ENVIRONMENT",
    "PAYMENTS_WEBHOOK_URL",
    "OPERATIONS_MONITOR_SECRET",
    "LEGAL_COUNSEL_APPROVAL_REFERENCE",
  ]) {
    assert.match(providerReadiness, new RegExp(marker));
  }
  assert.match(readiness, /required values are present and structurally valid/);
  assert.match(publicConfig, /PUBLIC_LAUNCH_READINESS/);
  assert.match(publicConfig, /browserPushConfigured/);
});

test("SaaS-owner mutations require server-enforced MFA step-up", () => {
  assert.match(admin, /getAuthenticatorAssuranceLevel/);
  assert.match(admin, /currentLevel !== "aal2"/);
  assert.match(admin, /mfa_step_up_required/);
  assert.match(migration, /auth\.jwt\(\) ->> 'aal'/);
  assert.match(migration, /platform mutation requires MFA step-up/);
  for (const table of ["organizations", "subscriptions", "platform_operators"]) {
    assert.match(migration, new RegExp(`on public\\.${table}`));
  }
  assert.match(platform, /Enrol authenticator/);
  assert.match(platform, /Verify and unlock/);
  assert.match(platform, /if \(!requireMfa\(\)\) return/);
});

test("release and CI wiring include the new function and current UK Stripe plans", () => {
  assert.match(config, /\[functions\.platform-readiness\][\s\S]*verify_jwt = false/);
  assert.match(ci, /platform-readiness\/index\.ts/);
  assert.match(release, /platform-readiness\/index\.ts/);
  for (const key of [
    "VITE_PAYMENTS_CLIENT_TOKEN",
    "PAYMENTS_RUNTIME_PROVIDER",
    "PAYMENTS_ENVIRONMENT",
    "PAYMENTS_WEBHOOK_URL",
  ]) {
    assert.ok(release.includes(`${key}: \${{ vars.${key} }}`));
  }
});
