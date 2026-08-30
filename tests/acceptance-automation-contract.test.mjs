import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("tenant preference persistence supports safe authenticated CRUD", async () => {
  const [migration, script, stagingWorkflow, productionWorkflow, evidence, packageJson] =
    await Promise.all([
      read("supabase/migrations/20260830150000_allow_preference_cleanup.sql"),
      read("scripts/check-demo-role-persistence.mjs"),
      read(".github/workflows/staging-rehearsal.yml"),
      read(".github/workflows/production-role-persistence.yml"),
      read("scripts/generate-staging-evidence.mjs"),
      read("package.json"),
    ]);

  assert.match(migration, /grant delete on table public\.user_experience_preferences/i);
  assert.match(script, /requireDemoEnvironment/);
  assert.match(script, /snapshotPreference/);
  assert.match(script, /restorePreference/);
  assert.match(script, /new authenticated session/);
  assert.match(script, /other tenant/);
  assert.match(script, /Platform owner cannot write tenant-scoped preferences/);
  assert.match(script, /HACCORA_DESIGNATED_TEST_ACCOUNTS_ONLY/);
  assert.doesNotMatch(script, /serviceKey|service[_-]?role/i);
  assert.match(stagingWorkflow, /npm run demo:persistence/);
  assert.match(stagingWorkflow, /DEMO_PERSISTENCE_PASSED=true/);
  assert.match(productionWorkflow, /environment: production/);
  assert.match(productionWorkflow, /secrets\.ROLE_ACCEPTANCE_PASSWORD/);
  assert.match(productionWorkflow, /npm run roles:persistence/);
  assert.match(evidence, /DEMO_PERSISTENCE_PASSED/);
  assert.match(evidence, /demo-role-persistence\.txt/);
  assert.match(packageJson, /"demo:persistence"/);
});

test("Lovable Stripe lifecycle evidence is payment-state safe and credential protected", async () => {
  const [script, workflow, packageJson] = await Promise.all([
    read("scripts/check-payment-lifecycle-state.mjs"),
    read(".github/workflows/payment-lifecycle-acceptance.yml"),
    read("package.json"),
  ]);

  assert.match(script, /HACCORA_PAYMENT_STATE_OBSERVATION/);
  assert.match(script, /get_platform_credit_control_cases/);
  assert.match(script, /payment_failed/);
  assert.match(script, /access_restricted/);
  assert.match(script, /payment_restored/);
  assert.doesNotMatch(script, /service[_-]?role/i);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /secrets\.ROLE_ACCEPTANCE_PASSWORD/);
  assert.match(workflow, /PAYMENT_ACCEPTANCE_CONFIRM: HACCORA_PAYMENT_STATE_OBSERVATION/);
  assert.match(packageJson, /"payments:acceptance"/);
});
