import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const root = process.cwd();
const failures = [];
const run = promisify(execFile);
const required = [
  ".env.example",
  ".env.staging.example",
  "package-lock.json",
  "mobile/package-lock.json",
  "public/manifest.webmanifest",
  "public/sw.js",
  "supabase/migrations/20260801090000_production_tenancy_security.sql",
  "supabase/functions/contact/index.ts",
  "supabase/functions/inspection-export/index.ts",
  "supabase/functions/inspector-invite/index.ts",
  "supabase/functions/notification-dispatch/index.ts",
  "supabase/functions/sensor-ingest/index.ts",
  "supabase/functions/sensor-provision/index.ts",
  "supabase/functions/team-invite/index.ts",
  "supabase/functions/platform-admin/index.ts",
  "supabase/functions/platform-readiness/index.ts",
  "supabase/functions/privacy-requests/index.ts",
  "supabase/functions/security-center/index.ts",
  "supabase/functions/file-scan/index.ts",
  "supabase/migrations/20260802090000_v2_security_privacy_launch.sql",
  "src/routes/app.security.tsx",
  "supabase/functions/operations-dispatch/index.ts",
  "supabase/migrations/20260802100000_v2_operations_control.sql",
  "src/routes/app.control-centre.tsx",
  "src/routes/app.workflows.tsx",
  "supabase/migrations/20260802103319_63102a85-216e-4527-ab82-2f9dc19862bb.sql",
  "supabase/migrations/20260802120000_v2_commercial_reconciliation.sql",
  "supabase/migrations/20260808170000_restore_tenant_billing_and_platform_policy.sql",
  "supabase/migrations/20260808190000_native_evidence_and_push_hardening.sql",
  "supabase/migrations/20260809120000_production_job_heartbeats.sql",
  "supabase/migrations/20260809150000_saas_control_plane_and_asset_scan_evidence.sql",
  "supabase/migrations/20260809230000_platform_step_up_security.sql",
  "supabase/roles.sql",
  "src/integrations/supabase/haccora-client.ts",
  "src/integrations/supabase/haccora-auth-attacher.ts",
  "docs/PHASE-24-NATIVE-EVIDENCE-AND-NOTIFICATIONS.md",
  "docs/PHASE-25-STAGING-RELEASE-AUTOMATION.md",
  "docs/PHASE-26-PRODUCTION-OPERATIONS.md",
  "docs/PHASE-27-LAUNCH-ACCEPTANCE.md",
  "docs/PHASE-34-PLATFORM-LAUNCH-CENTRE.md",
  "docs/PHASE-39-CI-DATABASE-RECOVERY.md",
  "docs/launch-acceptance.example.json",
  "supabase/functions/billing/index.ts",
  "supabase/functions/integration-admin/index.ts",
  "supabase/functions/integration-dispatch/index.ts",
  "supabase/functions/operations-health/index.ts",
  "supabase/functions/package-lock.json",
  "supabase/functions/package.json",
  "src/routes/app.billing.tsx",
  "src/routes/app.organisation.tsx",
  "src/routes/platform.tsx",
  "src/routes/account-status.tsx",
  "src/routes/app.integrations.tsx",
  "src/routes/app.preferences.tsx",
  "mobile/app/actions.tsx",
  "mobile/app/documents.tsx",
  "mobile/app/incidents.tsx",
  "mobile/app/settings.tsx",
  "mobile/app.json",
  "mobile/eas.json",
  ".github/workflows/ci.yml",
  ".github/workflows/codeql.yml",
  "scripts/check-migration-lineage.mjs",
  "scripts/check-secrets.mjs",
  "scripts/verify-launch-env.mjs",
  "playwright.config.ts",
  "tests/e2e/public-accessibility.spec.ts",
  "tests/phase34-platform-launch-centre.test.mjs",
  "tests/phase39-ci-database-recovery.test.mjs",
  "src/routes/health[.]json.ts",
  ".github/workflows/database.yml",
  ".github/workflows/release-readiness.yml",
  ".github/workflows/staging-rehearsal.yml",
  ".github/workflows/native-internal-candidate.yml",
  ".github/workflows/uptime.yml",
  ".github/CODEOWNERS",
  ".github/pull_request_template.md",
  "SECURITY.md",
  "scripts/check-deployment-health.mjs",
  "scripts/check-deployment-smoke.mjs",
  "scripts/check-operations-health.mjs",
  "scripts/check-production-audits.mjs",
  "scripts/check-action-pins.mjs",
  "scripts/verify-launch-acceptance.mjs",
  "security/dependency-audit-exceptions.json",
  "scripts/generate-release-evidence.mjs",
  "scripts/generate-staging-evidence.mjs",
  "scripts/verify-staging-env.mjs",
  "scripts/verify-remote-migration-ledger.mjs",
  "scripts/check-build-budget.mjs",
  "scripts/check-built-worker.mjs",
  "scripts/clean-build-output.mjs",
  "supabase/tests/database/rls_isolation.test.sql",
  "docs/PRODUCTION_READINESS.md",
  "docs/MIGRATION_RECONCILIATION.md",
  "docs/PRODUCTION_RUNBOOK.md",
  "docs/INCIDENT_RESPONSE.md",
  "docs/RESTORE_DRILL.md",
  "docs/RELEASE_EVIDENCE.md",
  "mobile/scripts/verify-store-readiness.mjs",
  "mobile/scripts/verify-internal-build-env.mjs",
  "mobile/store/PRIVACY_DATA_MAP.md",
  "mobile/store/STORE_RELEASE_CHECKLIST.md",
  "docs/GO_LIVE_STATUS_2026-08-02.md",
  "docs/V2_FILE_3_COMPLETE.md",
];

for (const file of required) {
  try {
    await stat(path.join(root, file));
  } catch {
    failures.push(`Missing required production file: ${file}`);
  }
}

const auth = await readFile(path.join(root, "src/lib/auth.tsx"), "utf8");
if (/data:\s*\{[^}]*\brole\b/s.test(auth))
  failures.push("Public sign-up still sends role metadata");

const haccoraClient = await readFile(
  path.join(root, "src/integrations/supabase/haccora-client.ts"),
  "utf8",
);
if (
  !haccoraClient.includes("getPublicSupabaseConfig") ||
  /import\.meta\.env|process\.env|SUPABASE_SERVICE_ROLE_KEY/.test(haccoraClient)
) {
  failures.push("The Haccora-owned public client does not use its shared safe boundary");
}
const haccoraStart = await readFile(path.join(root, "src/start.ts"), "utf8");
if (
  !haccoraStart.includes("haccora-auth-attacher") ||
  !haccoraStart.includes("attachHaccoraAuth")
) {
  failures.push("TanStack Start does not use the Haccora-owned authentication attacher");
}
const rolesSql = await readFile(path.join(root, "supabase/roles.sql"), "utf8");
for (const marker of ["sandbox_exec", "NOLOGIN", "NOINHERIT", "NOBYPASSRLS"]) {
  if (!rolesSql.includes(marker))
    failures.push(`Migration compatibility role is missing: ${marker}`);
}

const login = await readFile(path.join(root, "src/routes/login.tsx"), "utf8");
if (/setRole\(|onClick=\{\(\) => setRole/.test(login))
  failures.push("Public sign-up still exposes a role selector");

const migration = await readFile(
  path.join(root, "supabase/migrations/20260801090000_production_tenancy_security.sql"),
  "utf8",
);
for (const marker of [
  "organization_memberships",
  "inspector_access_grants",
  "audit_events",
  "can_read_organization",
  "NEW.reading",
  "docs_insert_scoped",
]) {
  if (!migration.includes(marker)) failures.push(`Security migration is missing: ${marker}`);
}

const envExample = await readFile(path.join(root, ".env.example"), "utf8");
for (const key of [
  "MALWARE_SCAN_URL",
  "MALWARE_SCAN_TOKEN",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_SOLO",
  "STRIPE_PRICE_COMPLETE",
  "STRIPE_PRICE_GROUP",
  "STRIPE_LIVE_MODE",
  "INTEGRATION_ENCRYPTION_KEY",
  "EXPO_ACCESS_TOKEN",
  "OPERATIONS_HEALTH_URL",
  "OPERATIONS_MONITOR_SECRET",
]) {
  if (!new RegExp(`^${key}=`, "m").test(envExample)) {
    failures.push(`Environment template is missing: ${key}`);
  }
}

const supabaseConfig = await readFile(path.join(root, "supabase/config.toml"), "utf8");
for (const functionName of [
  "file-scan",
  "operations-dispatch",
  "billing",
  "integration-admin",
  "integration-dispatch",
  "notification-dispatch",
  "operations-health",
  "platform-admin",
  "platform-readiness",
]) {
  if (!supabaseConfig.includes(`[functions.${functionName}]`)) {
    failures.push(`Supabase config is missing function: ${functionName}`);
  }
}

const ci = await readFile(path.join(root, ".github/workflows/ci.yml"), "utf8");
for (const functionName of [
  "privacy-requests",
  "security-center",
  "file-scan",
  "operations-dispatch",
  "billing",
  "integration-admin",
  "integration-dispatch",
  "notification-dispatch",
  "operations-health",
  "platform-admin",
  "platform-readiness",
]) {
  if (!ci.includes(`${functionName}/index.ts`)) {
    failures.push(`CI does not type-check Edge Function: ${functionName}`);
  }
}
if (!ci.includes("npm run export:check")) {
  failures.push("CI does not export native iOS/Android bundles");
}
if (!ci.includes("needs: release-integrity") || !ci.includes("npm run source:integrity")) {
  failures.push("CI does not block generated source drift before dependency installation");
}

const rootPackage = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (rootPackage.packageManager !== "npm@10.9.4") {
  failures.push("The root npm version is not pinned to the CI-compatible release");
}
if (!rootPackage.scripts?.quality?.includes("npm run format:check")) {
  failures.push("The local quality gate does not enforce formatting");
}
if (!rootPackage.scripts?.build?.includes("check-build-budget.mjs")) {
  failures.push("The production build does not enforce a JavaScript bundle budget");
}
if (!rootPackage.scripts?.build?.includes("check-built-worker.mjs")) {
  failures.push("The production build does not smoke-test the generated worker");
}
if ((rootPackage.scripts?.build?.match(/check-source-integrity\.mjs/g) ?? []).length !== 2) {
  failures.push("The production build does not check source integrity before and after bundling");
}
if (!rootPackage.scripts?.build?.startsWith("node scripts/clean-build-output.mjs")) {
  failures.push("The production build does not remove stale output before bundling");
}
if (rootPackage.scripts?.preview !== "nitro preview") {
  failures.push("Production preview does not run the generated Nitro worker");
}

const releaseWorkflow = await readFile(
  path.join(root, ".github/workflows/release-readiness.yml"),
  "utf8",
);
for (const marker of [
  "environment: production",
  "npm run launch:preflight",
  "npm run quality",
  "npm run export:check",
  "npm run release:preflight",
  "npm run deployment:smoke",
  "npm run auth:health",
  "npm run readiness:check",
  "npm run operations:health",
  "npm run launch:acceptance",
  "npm run release:evidence",
  "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
]) {
  if (!releaseWorkflow.includes(marker)) {
    failures.push(`Production release workflow is missing: ${marker}`);
  }
}
if (!rootPackage.scripts?.quality?.includes("npm run actions:check")) {
  failures.push("The local quality gate does not enforce immutable GitHub Action pins");
}

const stagingWorkflow = await readFile(
  path.join(root, ".github/workflows/staging-rehearsal.yml"),
  "utf8",
);
for (const marker of [
  "environment: staging",
  "npm run staging:preflight",
  "supabase db push --dry-run",
  "npm run staging:ledger",
  "supabase functions deploy",
  "npm run demo:access",
  "npm run auth:health",
  "npm run deployment:smoke",
  "generate-staging-evidence.mjs",
]) {
  if (!stagingWorkflow.includes(marker)) {
    failures.push(`Staging rehearsal workflow is missing: ${marker}`);
  }
}

const uptimeWorkflow = await readFile(path.join(root, ".github/workflows/uptime.yml"), "utf8");
for (const marker of [
  "https://hacccora-chums.lovable.app",
  "vars.PRODUCTION_RELEASE_SHA || github.sha",
  "check-deployment-health.mjs",
  "check-deployment-smoke.mjs",
  "check-deployment-readiness.mjs",
  "check-supabase-auth-health.mjs",
  "check-operations-health.mjs",
]) {
  if (!uptimeWorkflow.includes(marker)) {
    failures.push(`Production uptime workflow is missing: ${marker}`);
  }
}

const deploymentSmoke = await readFile(
  path.join(root, "scripts/check-deployment-smoke.mjs"),
  "utf8",
);
for (const route of ["/help", "/platform", "/legal/terms", "/legal/company-details"]) {
  if (!deploymentSmoke.includes(route)) {
    failures.push(`Production deployment smoke test is missing route: ${route}`);
  }
}

const operationsMigration = await readFile(
  path.join(root, "supabase/migrations/20260802100000_v2_operations_control.sql"),
  "utf8",
);
for (const marker of [
  "workflow_template_versions",
  "workflow_step_results",
  "unified_inbox_items",
  "sensor_health_snapshots",
  "traceability_edges",
  "transition_corrective_action",
  "dispatch_operations_control",
]) {
  if (!operationsMigration.includes(marker)) {
    failures.push(`V2 operations migration is missing: ${marker}`);
  }
}

const securityMigration = await readFile(
  path.join(root, "supabase/migrations/20260802090000_v2_security_privacy_launch.sql"),
  "utf8",
);
for (const marker of [
  "privacy_requests",
  "device_sessions",
  "security_events",
  "high_risk_action_requests",
  "file_scan_jobs",
  "two-person approval required",
]) {
  if (!securityMigration.includes(marker)) {
    failures.push(`V2 security migration is missing: ${marker}`);
  }
}

const completeMigration = await readFile(
  path.join(root, "supabase/migrations/20260802103319_63102a85-216e-4527-ab82-2f9dc19862bb.sql"),
  "utf8",
);
for (const marker of [
  "subscription_entitlements",
  "billing_events",
  "webhook_endpoints",
  "encrypted_signing_secret",
  "claim_webhook_deliveries",
  "user_experience_preferences",
  "sync_conflicts",
]) {
  if (!completeMigration.includes(marker)) {
    failures.push(`V2 complete migration is missing: ${marker}`);
  }
}

const { stdout: trackedOutput } = await run("git", ["ls-files", "-z"], {
  cwd: root,
  encoding: "utf8",
});
// The hosting platform generates a root .env holding only publishable client
// configuration; it cannot be untracked there, so it is tolerated while every
// declaration stays publishable. Anything else still fails the gate.
const exampleEnvironmentFiles = new Set([
  ".env.example",
  ".env.demo.example",
  ".env.staging.example",
  "mobile/.env.example",
]);
const publishableEnvironmentDeclaration =
  /^(?:VITE_)?SUPABASE_(?:URL|PROJECT_ID|PUBLISHABLE_KEY|ANON_KEY)\s*=/;
const trackedEnvironmentCandidates = trackedOutput
  .split("\0")
  .filter(Boolean)
  .filter((file) => /(^|\/)\.env($|\.)/.test(file) && !exampleEnvironmentFiles.has(file));
const trackedEnvironmentFiles = [];
for (const file of trackedEnvironmentCandidates) {
  const content = await readFile(path.join(root, file), "utf8");
  const publishableOnly =
    file === ".env" &&
    content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .every((line) => publishableEnvironmentDeclaration.test(line));
  if (!publishableOnly) trackedEnvironmentFiles.push(file);
}
if (trackedEnvironmentFiles.length) {
  failures.push(`Tracked environment file: ${trackedEnvironmentFiles.join(", ")}`);
}

const mobilePackage = JSON.parse(await readFile(path.join(root, "mobile/package.json"), "utf8"));
if (mobilePackage.dependencies?.["expo-file-system"] !== "~57.0.1") {
  failures.push("Native evidence upload must declare expo-file-system as a direct dependency");
}
if (!mobilePackage.scripts?.["export:check"]?.includes("--platform all")) {
  failures.push("Native release verification must export iOS, Android and web bundles");
}
if (mobilePackage.scripts?.["release:preflight"] !== "node scripts/verify-store-readiness.mjs") {
  failures.push("Native release verification must enforce the store configuration preflight");
}
if (
  mobilePackage.scripts?.["release:internal-preflight"] !==
  "node scripts/verify-internal-build-env.mjs"
) {
  failures.push("Native internal builds must enforce the protected staging preflight");
}

const forbiddenDuplicateMigrations = [
  "supabase/migrations/20260802151821_e39eee69-d055-435f-886e-10b3ab3be4aa.sql",
];
for (const file of forbiddenDuplicateMigrations) {
  try {
    await stat(path.join(root, file));
    failures.push(`Duplicate migration must be removed: ${file}`);
  } catch {
    // Absence is the required state.
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("Production structure verification passed.");
