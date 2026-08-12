import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("signup metadata cannot request a privileged role", async () => {
  const source = await readFile("src/lib/auth.tsx", "utf8");
  assert.doesNotMatch(source, /data:\s*\{[^}]*\brole\b/s);
});

test("temperature trigger evaluates the persisted reading column", async () => {
  const migration = await readFile(
    "supabase/migrations/20260801090000_production_tenancy_security.sql",
    "utf8",
  );
  assert.match(migration, /NEW\.reading/);
  assert.doesNotMatch(migration.slice(migration.indexOf("tg_temp_alert")), /NEW\.value_c/);
});

test("documents are private and use tenant plus user storage prefixes", async () => {
  const migration = await readFile(
    "supabase/migrations/20260801090000_production_tenancy_security.sql",
    "utf8",
  );
  assert.match(migration, /'documents', 'documents', false/);
  assert.match(migration, /docs_insert_scoped/);
  assert.match(migration, /\[1\].*current_organization_id/s);
  assert.match(migration, /\[2\].*auth\.uid/s);
  assert.match(migration, /document\.storage_path = name/);
  assert.match(
    migration,
    /has_valid_inspector_grant\(\s*document\.organization_id, 'documents', document\.location_id/s,
  );
});

test("native client queues idempotent offline writes", async () => {
  const queue = await readFile("mobile/lib/offline-queue.ts", "utf8");
  const temperature = await readFile("mobile/app/temperature.tsx", "utf8");
  assert.match(queue, /idempotency_key/);
  assert.match(queue, /NetInfo\.fetch/);
  assert.match(queue, /SecureStore\.setItemAsync/);
  assert.doesNotMatch(queue, /attempts\s*<\s*\d+/);
  assert.match(temperature, /organization_id: organizationId/);
});

test("tenant location references use composite integrity", async () => {
  const migration = await readFile(
    "supabase/migrations/20260801090000_production_tenancy_security.sql",
    "utf8",
  );
  assert.match(migration, /FOREIGN KEY \(location_id, organization_id\)/);
  assert.match(migration, /REFERENCES public\.locations\(id, organization_id\)/);
});

test("staff writes are attributed to the authenticated actor", async () => {
  const migration = await readFile(
    "supabase/migrations/20260801090000_production_tenancy_security.sql",
    "utf8",
  );
  assert.match(migration, /can_operate_record/);
  assert.match(migration, /p_actor_id = auth\.uid\(\)/);
});

test("inspection access is invited, scoped and expiring", async () => {
  const migration = await readFile(
    "supabase/migrations/20260801090000_production_tenancy_security.sql",
    "utf8",
  );
  assert.match(migration, /accept_inspector_invitation/);
  assert.match(migration, /evidence_scopes/);
  assert.match(migration, /now\(\) BETWEEN g\.valid_from AND g\.valid_until/);
  assert.match(migration, /GRANT UPDATE \(revoked_at\) ON public\.inspector_access_grants/);
});

test("inspector navigation follows the granted evidence scopes", async () => {
  const source = await readFile("src/lib/auth.tsx", "utf8");
  assert.match(source, /INSPECTOR_SCOPE_BY_NAV/);
  assert.match(source, /inspectorScopes\.includes\(requiredScope\)/);
  assert.doesNotMatch(source.slice(source.indexOf("inspector:")), /"health"/);
});

test("raw audit payloads are limited to managers and the actor", async () => {
  const migration = await readFile(
    "supabase/migrations/20260801090000_production_tenancy_security.sql",
    "utf8",
  );
  const policy = migration.slice(migration.indexOf("CREATE POLICY audit_events_read"));
  assert.match(policy, /actor_id = auth\.uid\(\)/);
  assert.match(policy, /can_manage_organization\(organization_id\)/);
  assert.doesNotMatch(policy.slice(0, policy.indexOf("CREATE INDEX")), /has_valid_inspector_grant/);
});

test("an organization cannot lose its last active owner", async () => {
  const migration = await readFile(
    "supabase/migrations/20260801090000_production_tenancy_security.sql",
    "utf8",
  );
  assert.match(migration, /tg_preserve_active_owner/);
  assert.match(migration, /organization must retain an active owner/);
});

test("sensor ingestion bounds timestamps and normalizes Fahrenheit", async () => {
  const source = await readFile("supabase/functions/sensor-ingest/index.ts", "utf8");
  assert.match(source, /captured_at_out_of_range/);
  assert.match(source, /body\.unit === "fahrenheit"/);
  assert.match(source, /celsiusReading/);
});

test("sensor secrets cannot be changed through the client role", async () => {
  const migration = await readFile(
    "supabase/migrations/20260801090000_production_tenancy_security.sql",
    "utf8",
  );
  assert.match(migration, /REVOKE UPDATE ON public\.sensor_devices FROM authenticated/);
  assert.doesNotMatch(migration, /GRANT UPDATE \([^)]*secret_hash[^)]*\)/);
});

test("service worker never caches authenticated routes", async () => {
  const worker = await readFile("public/sw.js", "utf8");
  assert.match(worker, /sensitiveRoute/);
  assert.match(worker, /url\.pathname\.startsWith\("\/app"\)/);
  assert.doesNotMatch(worker, /const SHELL = \[[^\]]*"\/login"/s);
});

test("v2 security events are immutable and tenant scoped", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802090000_v2_security_privacy_launch.sql",
    "utf8",
  );
  assert.match(migration, /security_events_immutable/);
  assert.match(migration, /can_manage_organization\(organization_id\)/);
  assert.match(migration, /security events are immutable/);
});

test("v2 sensitive approvals require a different decision maker", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802090000_v2_security_privacy_launch.sql",
    "utf8",
  );
  assert.match(migration, /decided_by <> requested_by/);
  assert.match(migration, /two-person approval required/);
  assert.match(migration, /FOR UPDATE/);
});

test("v2 privacy requests are authenticated and documented", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802090000_v2_security_privacy_launch.sql",
    "utf8",
  );
  const edge = await readFile("supabase/functions/privacy-requests/index.ts", "utf8");
  assert.match(migration, /privacy_request_self_create/);
  assert.match(edge, /requireUser/);
  assert.match(edge, /privacy_request_submitted/);
});

test("v2 document downloads require a clean scan verdict", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802090000_v2_security_privacy_launch.sql",
    "utf8",
  );
  const documents = await readFile("src/routes/app.documents.tsx", "utf8");
  assert.match(migration, /scan\.status = 'clean'/);
  assert.match(migration, /claim_file_scan_jobs/);
  assert.match(documents, /get_document_scan_status/);
});

test("v2 device sessions store only hashed network identifiers", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802090000_v2_security_privacy_launch.sql",
    "utf8",
  );
  const edge = await readFile("supabase/functions/security-center/index.ts", "utf8");
  assert.match(migration, /ip_hash text/);
  assert.doesNotMatch(migration, /\bip_address\b/);
  assert.match(edge, /sha256\(`\$\{salt\}:\$\{ip\}`\)/);
});

test("v2 workflows are versioned and cannot complete with missing required steps", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802100000_v2_operations_control.sql",
    "utf8",
  );
  assert.match(migration, /workflow_template_versions/);
  assert.match(migration, /workflow_step_results/);
  assert.match(migration, /required workflow steps are incomplete/);
  assert.match(migration, /UNIQUE \(organization_id, idempotency_key\)/);
});

test("v2 corrective actions require evidence before verification", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802100000_v2_operations_control.sql",
    "utf8",
  );
  assert.match(migration, /transition_corrective_action/);
  assert.match(migration, /verification evidence required/);
  assert.match(migration, /verification requires manager/);
  assert.match(migration, /corrective_action_events/);
});

test("v2 exceptions enter one tenant-scoped operations inbox", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802100000_v2_operations_control.sql",
    "utf8",
  );
  const control = await readFile("src/routes/app.control-centre.tsx", "utf8");
  assert.match(migration, /unified_inbox_items/);
  assert.match(migration, /can_read_organization\(organization_id\)/);
  assert.match(migration, /trg_temperature_corrective_action/);
  assert.match(migration, /trg_sensor_excursion_corrective_action/);
  assert.match(control, /transition_corrective_action/);
});

test("v2 sensor offline detection runs only through the cron service role", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802100000_v2_operations_control.sql",
    "utf8",
  );
  const edge = await readFile("supabase/functions/operations-dispatch/index.ts", "utf8");
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.dispatch_operations_control/);
  assert.match(edge, /constantTimeEqual/);
  assert.match(edge, /x-cron-secret/);
});

test("v2 traceability and governed content preserve source and approval evidence", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802100000_v2_operations_control.sql",
    "utf8",
  );
  assert.match(migration, /traceability_edges/);
  assert.match(migration, /recall_drills/);
  assert.match(migration, /regulatory_content_versions/);
  assert.match(migration, /source_url text NOT NULL/);
  assert.match(migration, /review_statement text/);
  assert.match(migration, /training_course_versions/);
});

test("v2 billing trusts signed provider events rather than client plan writes", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802103319_63102a85-216e-4527-ab82-2f9dc19862bb.sql",
    "utf8",
  );
  const edge = await readFile("supabase/functions/billing/index.ts", "utf8");
  assert.match(migration, /subscription_entitlements/);
  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON public\.subscription_entitlements/);
  assert.match(edge, /stripe-signature/);
  assert.match(edge, /Math\.abs\(Date\.now\(\) \/ 1000 - timestamp\) > 300/);
  assert.match(edge, /constantTimeEqual/);
  assert.match(edge, /provider_event_id/);
});

test("tenant billing is owner-only in navigation, RLS and the Stripe function", async () => {
  const auth = await readFile("src/lib/auth.tsx", "utf8");
  const billing = await readFile("supabase/functions/billing/index.ts", "utf8");
  const migration = await readFile(
    "supabase/migrations/20260807190000_platform_operator_and_demo_role_access.sql",
    "utf8",
  );
  const managerPermissions = auth.slice(auth.indexOf("manager: ["), auth.indexOf("chef: ["));
  assert.doesNotMatch(managerPermissions, /"billing"/);
  assert.match(billing, /String\(workspace\.role\) !== "owner"/);
  assert.match(migration, /subscriptions_owner_read/);
  assert.match(migration, /array\['owner'\]::public\.app_role\[\]/);
});

test("the final policy reconciliation restores tenant billing and active platform access", async () => {
  const migration = await readFile(
    "supabase/migrations/20260808170000_restore_tenant_billing_and_platform_policy.sql",
    "utf8",
  );
  assert.match(migration, /user_id = auth\.uid\(\) and status = 'active'/);
  assert.match(
    migration,
    /create policy subscriptions_owner_read[\s\S]*?has_org_role\(organization_id, array\['owner'\]::public\.app_role\[\]\)/i,
  );
  assert.match(
    migration,
    /create policy billing_events_owner_read[\s\S]*?has_org_role\(organization_id, array\['owner'\]::public\.app_role\[\]\)/i,
  );
  const tenantBillingPolicies = migration.slice(migration.indexOf("subscriptions_owner_read"));
  assert.doesNotMatch(tenantBillingPolicies, /is_platform_operator/);
});

test("Phase 23 aligns the equipment inspector scope with database constraints", async () => {
  const migration = await readFile(
    "supabase/migrations/20260807190000_platform_operator_and_demo_role_access.sql",
    "utf8",
  );
  assert.match(migration, /inspector_access_grants_evidence_scopes_v2_check/);
  assert.match(migration, /inspector_access_invitations_evidence_scopes_v2_check/);
  assert.match(migration, /'equipment'/);
  assert.match(migration, /cardinality\(evidence_scopes\) between 1 and 11/);
});

test("v2 integration secrets are encrypted and omitted from browser column grants", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802103319_63102a85-216e-4527-ab82-2f9dc19862bb.sql",
    "utf8",
  );
  const crypto = await readFile("supabase/functions/_shared/integration-crypto.ts", "utf8");
  assert.match(migration, /encrypted_signing_secret text NOT NULL/);
  assert.match(migration, /REVOKE SELECT ON public\.webhook_endpoints/);
  assert.doesNotMatch(
    migration.match(/GRANT SELECT \(id, organization_id, name, url[\s\S]*?authenticated;/)?.[0] ??
      "",
    /encrypted_signing_secret/,
  );
  assert.match(crypto, /AES-GCM/);
  assert.match(crypto, /INTEGRATION_ENCRYPTION_KEY/);
});

test("v2 outbound webhooks are signed, idempotent and retry safely", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802103319_63102a85-216e-4527-ab82-2f9dc19862bb.sql",
    "utf8",
  );
  const dispatcher = await readFile("supabase/functions/integration-dispatch/index.ts", "utf8");
  const urlGuard = await readFile("supabase/functions/_shared/webhook-url.ts", "utf8");
  assert.match(migration, /UNIQUE \(endpoint_id, event_id\)/);
  assert.match(migration, /FOR UPDATE SKIP LOCKED/);
  assert.match(dispatcher, /x-haccora-signature/);
  assert.match(dispatcher, /idempotency-key/);
  assert.match(dispatcher, /dead_letter/);
  assert.match(dispatcher, /redirect: "error"/);
  assert.match(urlGuard, /private webhook IPs are not allowed/);
  assert.match(urlGuard, /hostname\.endsWith\("\.local"\)/);
});

test("v2 accessibility preferences persist and control motion, contrast and glove targets", async () => {
  const migration = await readFile(
    "supabase/migrations/20260802103319_63102a85-216e-4527-ab82-2f9dc19862bb.sql",
    "utf8",
  );
  const controller = await readFile("src/components/ExperienceController.tsx", "utf8");
  const styles = await readFile("src/styles.css", "utf8");
  assert.match(migration, /user_experience_preferences/);
  assert.match(controller, /haccora-glove/);
  assert.match(controller, /navigator\.onLine/);
  assert.match(styles, /min-height: 48px/);
  assert.match(styles, /haccora-reduced-motion/);
});

test("commercial reconciliation applies entitlement effective dates without replaying schema", async () => {
  const reconciliation = await readFile(
    "supabase/migrations/20260802120000_v2_commercial_reconciliation.sql",
    "utf8",
  );
  assert.match(reconciliation, /effective_from <= now\(\)/);
  assert.match(reconciliation, /CREATE OR REPLACE FUNCTION public\.get_my_entitlements/);
  assert.doesNotMatch(reconciliation, /CREATE TABLE|CREATE POLICY|CREATE TRIGGER/);
});

test("v2 native app supports secure evidence, corrective actions and privacy requests", async () => {
  const actions = await readFile("mobile/app/actions.tsx", "utf8");
  const documents = await readFile("mobile/app/documents.tsx", "utf8");
  const settings = await readFile("mobile/app/settings.tsx", "utf8");
  const app = await readFile("mobile/app.json", "utf8");
  assert.match(actions, /transition_corrective_action/);
  assert.match(actions, /requestCameraPermissionsAsync/);
  assert.match(documents, /uploadEvidence/);
  assert.match(settings, /privacy-requests/);
  assert.match(settings, /useAppLock/);
  assert.doesNotMatch(app, /"CAMERA"/);
});

test("v2 native offline UX distinguishes queued writes from server confirmation", async () => {
  const dashboard = await readFile("mobile/app/dashboard.tsx", "utf8");
  const queue = await readFile("mobile/lib/offline-queue.ts", "utf8");
  assert.match(dashboard, /securely queued/);
  assert.match(dashboard, /server confirmed/);
  assert.match(queue, /getQueueStatus/);
  assert.match(queue, /Evidence is never discarded/);
});

test("billing rejects Stripe mode mismatches and accepts rotated v1 signatures", async () => {
  const billing = await readFile("supabase/functions/billing/index.ts", "utf8");
  assert.match(billing, /STRIPE_LIVE_MODE/);
  assert.match(billing, /stripe_mode_mismatch/);
  assert.match(billing, /signatures\.some/);
  assert.match(billing, /constantTimeEqual\(value, expected\)/);
});

test("current Deno toolchain uses a pinned import map instead of inline dependency prefixes", async () => {
  const deno = await readFile("supabase/functions/deno.json", "utf8");
  const billing = await readFile("supabase/functions/billing/index.ts", "utf8");
  const shared = await readFile("supabase/functions/_shared/supabase.ts", "utf8");
  assert.match(deno, /"zod": "npm:zod@3\.24\.2"/);
  assert.match(deno, /"@supabase\/supabase-js"/);
  assert.doesNotMatch(billing, /from "npm:/);
  assert.doesNotMatch(shared, /from "npm:/);
});

test("CI checks every deployable Edge Function and security scanning", async () => {
  const ci = await readFile(".github/workflows/ci.yml", "utf8");
  const codeql = await readFile(".github/workflows/codeql.yml", "utf8");
  for (const functionName of [
    "privacy-requests",
    "security-center",
    "file-scan",
    "operations-dispatch",
    "billing",
    "integration-admin",
    "integration-dispatch",
  ])
    assert.match(ci, new RegExp(`${functionName}/index\\.ts`));
  assert.match(codeql, /github\/codeql-action\/analyze@[a-f0-9]{40}/);
});

test("CI runs browser accessibility and fresh-database tenant isolation gates", async () => {
  const ci = await readFile(".github/workflows/ci.yml", "utf8");
  const database = await readFile(".github/workflows/database.yml", "utf8");
  const browser = await readFile("tests/e2e/public-accessibility.spec.ts", "utf8");
  const rls = await readFile("supabase/tests/database/rls_isolation.test.sql", "utf8");
  assert.match(ci, /npm run test:e2e/);
  assert.match(ci, /npm run export:check/);
  assert.match(browser, /AxeBuilder/);
  assert.match(browser, /\/legal\/company-details/);
  assert.match(browser, /\/legal\/data-processing/);
  assert.match(browser, /\/legal\/accessibility/);
  assert.match(browser, /browserErrors/);
  assert.match(database, /supabase db start/);
  assert.match(database, /supabase test db/);
  assert.match(rls, /Tenant B owner cannot read Tenant A temperature evidence/);
});

test("secret scanning is limited to tracked files and forbids a tracked runtime env", async () => {
  const scanner = await readFile("scripts/check-secrets.mjs", "utf8");
  const verifier = await readFile("scripts/verify-production.mjs", "utf8");
  assert.match(scanner, /git", \["ls-files", "-z"\]/);
  assert.match(scanner, /environment file must not be committed/);
  assert.doesNotMatch(scanner, /platformManagedEnvironmentFiles/);
  assert.doesNotMatch(verifier, /file !== "\.env"/);
  assert.match(verifier, /Tracked environment file/);
});

test("native and Edge manifests declare every imported production dependency", async () => {
  const mobile = JSON.parse(await readFile("mobile/package.json", "utf8"));
  const edge = JSON.parse(await readFile("supabase/functions/package.json", "utf8"));
  for (const dependency of [
    "expo-document-picker",
    "expo-file-system",
    "expo-image-picker",
    "expo-local-authentication",
  ]) {
    assert.ok(mobile.dependencies[dependency]);
  }
  assert.equal(edge.dependencies["@supabase/supabase-js"], "2.110.7");
  assert.equal(edge.dependencies["pdf-lib"], "1.17.1");
  assert.equal(edge.dependencies.zod, "3.24.2");
});

test("production preflight blocks placeholders, missing approvals and incomplete native setup", async () => {
  const preflight = await readFile("scripts/verify-launch-env.mjs", "utf8");
  const requirements = await readFile("scripts/launch-requirements.mjs", "utf8");
  assert.match(requirements, /VITE_LEGAL_CONTENT_APPROVED/);
  assert.match(requirements, /STRIPE_LIVE_MODE/);
  assert.match(preflight, /nativeReleaseEnvironmentFailures/);
  assert.match(requirements, /process\.env\.EAS_PROJECT_ID/);
  assert.match(requirements, /INTEGRATION_ENCRYPTION_KEY/);
});

test("release governance requires preflight, deployment smoke and tamper-evident artifacts", async () => {
  const release = await readFile(".github/workflows/release-readiness.yml", "utf8");
  const uptime = await readFile(".github/workflows/uptime.yml", "utf8");
  const health = await readFile("scripts/check-deployment-health.mjs", "utf8");
  const smoke = await readFile("scripts/check-deployment-smoke.mjs", "utf8");
  const evidence = await readFile("scripts/generate-release-evidence.mjs", "utf8");
  const owners = await readFile(".github/CODEOWNERS", "utf8");
  assert.match(release, /environment: production/);
  assert.match(release, /npm run launch:preflight/);
  assert.match(release, /npm run export:check/);
  assert.match(release, /npm run release:preflight/);
  assert.match(release, /npm run deployment:smoke/);
  assert.match(release, /npm run release:evidence/);
  assert.match(release, /npm run health:check/);
  assert.match(release, /EXPECTED_RELEASE_SHA/);
  assert.match(release, /npm run release:sbom/);
  assert.match(release, /deno check/);
  assert.match(release, /deployments: write/);
  assert.match(release, /attestations: write/);
  assert.match(release, /actions\/attest@[a-f0-9]{40}/);
  assert.match(release, /npm run release:record-deployment/);
  assert.match(release, /actions\/upload-artifact@[a-f0-9]{40}/);
  assert.match(uptime, /schedule:/);
  assert.match(uptime, /check-deployment-health\.mjs/);
  assert.match(uptime, /check-deployment-smoke\.mjs/);
  assert.match(health, /redirect: "error"/);
  assert.match(health, /Cache-Control: no-store/);
  assert.match(health, /release identity mismatch/);
  assert.match(smoke, /generic HTTPError payload/);
  assert.match(smoke, /content-security-policy/);
  assert.match(evidence, /createHash\("sha256"\)/);
  assert.match(evidence, /sbom-haccora-release\.cdx\.json/);
  assert.match(owners, /@asaffilate01-ship-it/);
});

test("native release configuration has a fail-closed store gate and privacy map", async () => {
  const mobile = JSON.parse(await readFile("mobile/package.json", "utf8"));
  const preflight = await readFile("mobile/scripts/verify-store-readiness.mjs", "utf8");
  const environment = await readFile("mobile/scripts/native-release-environment.mjs", "utf8");
  const privacy = await readFile("mobile/store/PRIVACY_DATA_MAP.md", "utf8");
  assert.equal(mobile.scripts["release:preflight"], "node scripts/verify-store-readiness.mjs");
  assert.match(preflight, /nativeReleaseEnvironmentFailures/);
  assert.match(environment, /EAS_PROJECT_ID/);
  assert.match(preflight, /NSCameraUsageDescription/);
  assert.match(preflight, /blockedPermissions/);
  assert.match(privacy, /App Store privacy questionnaire/);
  assert.match(privacy, /Push notification token/);
});

test("production build enforces a cycle-safe budget and smoke-tests the worker", async () => {
  const vite = await readFile("vite.config.ts", "utf8");
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const budget = await readFile("scripts/check-build-budget.mjs", "utf8");
  const workerSmoke = await readFile("scripts/check-built-worker.mjs", "utf8");
  assert.doesNotMatch(vite, /codeSplitting:/);
  assert.doesNotMatch(vite, /name: "vendor-/);
  assert.match(vite, /native route graph still code-splits/);
  assert.match(vite, /process\.env\.PUBLIC_RELEASE_SHA/);
  assert.match(packageJson.scripts.build, /check-build-budget\.mjs/);
  assert.match(packageJson.scripts.build, /clean-build-output\.mjs/);
  assert.match(packageJson.scripts.build, /check-built-worker\.mjs/);
  assert.equal(packageJson.scripts.preview, "nitro preview");
  assert.match(budget, /650 \* 1024/);
  assert.match(budget, /200 \* 1024/);
  assert.match(budget, /gzipSync/);
  assert.match(budget, /static chunk cycle/);
  assert.match(workerSmoke, /generic HTTPError payload/);
  assert.match(workerSmoke, /content-security-policy/);
  assert.match(workerSmoke, /process\.env\.PUBLIC_RELEASE_SHA/);
});
