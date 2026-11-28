import { demoEmails, demoPasswordFor } from "../scripts/demo-client-config.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const seed = await readFile(new URL("../scripts/seed-demo-client.mjs", import.meta.url), "utf8");
const config = await readFile(
  new URL("../scripts/demo-client-config.mjs", import.meta.url),
  "utf8",
);
const envExample = await readFile(new URL("../.env.demo.example", import.meta.url), "utf8");
const playbook = await readFile(
  new URL("../docs/DEMO-CLIENT-TEST-PLAYBOOK.md", import.meta.url),
  "utf8",
);
const access = await readFile(
  new URL("../scripts/check-demo-role-access.mjs", import.meta.url),
  "utf8",
);
const platformMigration = await readFile(
  new URL(
    "../supabase/migrations/20260807190000_platform_operator_and_demo_role_access.sql",
    import.meta.url,
  ),
  "utf8",
);

test("demo seed has explicit environment safety interlocks", () => {
  assert.match(config, /DEMO_SEED_CONFIRM/);
  assert.match(config, /DEMO_ALLOWED_SUPABASE_URL/);
  assert.match(config, /Refusing to seed or verify while a production environment is selected/);
});

test("demo seed does not contain a committed password or service key", () => {
  assert.doesNotMatch(seed, /sb_secret_[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(seed, /eyJ[A-Za-z0-9_-]{40,}/);
  assert.match(envExample, /replace-with-a-unique-16-character-password/);
  assert.match(envExample, /SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_WITH_DEMO_KEY/);
});

test("demo client covers the primary operational journey", () => {
  for (const table of [
    "checks",
    "temperature_logs",
    "cleaning_tasks",
    "goods_in_logs",
    "recipes",
    "expiry_items",
    "training_records",
    "documents",
    "assets",
    "asset_check_schedules",
  ]) {
    assert.match(seed, new RegExp(`upsert\\(\\"${table}\\"`), `${table} must be seeded`);
  }
});

test("demo seed covers every tenant role, a SaaS owner and an isolation tenant", () => {
  for (const identity of [
    "platformOwner",
    "platformSupport",
    "platformAuditor",
    "owner",
    "manager",
    "chef",
    "staff",
    "inspector",
    "isolationOwner",
  ]) {
    assert.match(seed, new RegExp(`users\\.${identity}|${identity}: await ensureUser`));
  }
  assert.match(seed, /upsert\(\s*"platform_operators"/);
  assert.match(seed, /upsert\("inspector_access_grants"/);
  assert.match(seed, /ISOLATION_ORGANIZATION_ID/);
});

test("demo access runner signs in with publishable auth and checks tenant isolation", () => {
  assert.match(access, /signInWithPassword/);
  assert.match(access, /publishableKey/);
  assert.match(access, /SaaS owner does not bypass tenant RLS/);
  assert.match(access, /SaaS support/);
  assert.match(access, /SaaS auditor/);
  assert.match(access, /financial visibility matches its platform role/);
  assert.match(access, /get_platform_customers/);
  assert.match(access, /cannot call the SaaS operator overview/);
  assert.match(access, /ISOLATION_ORGANIZATION_ID/);
});

test("platform operators are out-of-band, audited and do not receive tenant bypass", () => {
  assert.match(platformMigration, /Never inferred from sign-up metadata or tenant membership/);
  assert.match(platformMigration, /platform_overview_viewed/);
  assert.match(platformMigration, /get_platform_overview/);
  assert.match(platformMigration, /get_platform_customers/);
  assert.doesNotMatch(platformMigration, /platform.*can_read_organization/i);
});

test("playbook tests every seeded role plus offline behaviour", () => {
  assert.match(playbook, /SaaS owner journey/);
  assert.match(playbook, /Tenant admin journey/);
  assert.match(playbook, /Staff journey/);
  assert.match(playbook, /Manager journey/);
  assert.match(playbook, /Chef journey/);
  assert.match(playbook, /Inspector journey/);
  assert.match(playbook, /Isolation-owner journey/);
  assert.match(playbook, /flight mode/i);
  assert.match(playbook, /APNs\/FCM/);
});

test("demo seed satisfies tenant approval before premises and membership inserts", () => {
  assert.match(seed, /access_approved_at: now\.toISOString\(\)/);
  assert.match(seed, /access_approved_by: users\.platformOwner\.id/);
  assert.match(seed, /access_approval_type: "trial"/);
  const organizations = seed.indexOf('await upsert("organizations"');
  const subscriptions = seed.indexOf('"subscriptions",');
  const premises = seed.indexOf('await upsert("locations"');
  const members = seed.indexOf('await upsert("organization_memberships"');
  assert.ok(organizations >= 0 && organizations < subscriptions);
  assert.ok(subscriptions < premises && premises < members);
});

test("demo provisioning does not adopt unverified or revoked identities", () => {
  assert.match(seed, /existing\.app_metadata\?\.haccora_demo_seed !== true/);
  assert.match(seed, /existing\.user_metadata\?\.haccora_demo_revoked === true/);
  assert.match(seed, /app_metadata: \{ haccora_demo_seed: true \}/);
  assert.match(seed, /Refusing to reset an unverified or revoked demo identity/);
});

test("demo owner override stays separate from platform and isolation identities", () => {
  const env = {
    DEMO_EMAIL_DOMAIN: "demo.example.test",
    DEMO_PASSWORD: "private-operator-test-passphrase",
    DEMO_OWNER_EMAIL: "demo@example.test",
    DEMO_OWNER_PASSWORD: "owner-test-unique",
  };
  const identities = demoEmails(env);
  assert.equal(identities.owner, "demo@example.test");
  assert.equal(demoPasswordFor(identities.owner, env), env.DEMO_OWNER_PASSWORD);
  assert.equal(demoPasswordFor(identities.platformOwner, env), env.DEMO_PASSWORD);
  assert.equal(demoPasswordFor(identities.isolationOwner, env), env.DEMO_PASSWORD);
  assert.throws(() => demoEmails({ ...env, DEMO_OWNER_EMAIL: identities.platformOwner }));
  assert.throws(() => demoPasswordFor(identities.owner, { ...env, DEMO_OWNER_PASSWORD: "" }));
  assert.throws(() =>
    demoPasswordFor(identities.owner, { ...env, DEMO_OWNER_PASSWORD: env.DEMO_PASSWORD }),
  );
});
