import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(file, "utf8");

test("workspace chrome uses live tenant context instead of a demo breadcrumb", async () => {
  const [shell, copy] = await Promise.all([read("src/routes/app.tsx"), read("src/lib/i18n.tsx")]);

  assert.match(shell, /const workspaceLabel = \[user\?\.organizationName, user\?\.location\]/);
  assert.match(shell, /\{workspaceLabel \|\| "Haccora workspace"\}/);
  assert.doesNotMatch(copy, /"app\.tag": "Riverside Kitchen · London"/);
});

test("inspector temperature evidence is read-only without leaking database errors", async () => {
  const temperature = await read("src/routes/app.temperature.tsx");

  assert.match(temperature, /const canWrite = user\?\.role !== "inspector"/);
  assert.match(temperature, /Inspector access can review temperature history/);
  assert.match(temperature, /The reading could not be saved\. Check your access and try again\./);
  assert.doesNotMatch(temperature, /setErr\(error\.message\)/);
});

test("web sign-in resolves workspace context before role routing", async () => {
  const auth = await read("src/lib/auth.tsx");

  assert.match(auth, /const authenticatedUser = await fetchAuthUser/);
  assert.match(auth, /setUser\(authenticatedUser\)/);
});

test("native operational entry points reject inspector deep links", async () => {
  const files = [
    "mobile/app/temperature.tsx",
    "mobile/app/checks.tsx",
    "mobile/app/quick-log.tsx",
    "mobile/app/cleaning.tsx",
    "mobile/app/diary.tsx",
  ];

  for (const file of files) {
    const source = await read(file);
    assert.match(source, /role === "inspector"/);
    assert.match(source, /<Redirect href="\/inspection-readiness" \/>/);
  }
});

test("production Supabase deployment is protected and inventories every function", async () => {
  const workflow = await read(".github/workflows/production-supabase-deploy.yml");

  assert.match(workflow, /environment: production/);
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN/);
  assert.match(workflow, /PRODUCTION_SUPABASE_DB_PASSWORD/);
  assert.match(workflow, /supabase db push --dry-run --linked/);
  assert.match(workflow, /supabase db push --linked --include-all/);
  assert.match(workflow, /supabase functions deploy --project-ref/);
  for (const name of [
    "billing",
    "contact",
    "file-scan",
    "inspection-export",
    "inspector-invite",
    "integration-admin",
    "integration-dispatch",
    "notification-dispatch",
    "operations-dispatch",
    "operations-health",
    "platform-admin",
    "platform-readiness",
    "privacy-requests",
    "security-center",
    "sensor-ingest",
    "sensor-provision",
    "team-invite",
  ]) {
    assert.match(workflow, new RegExp(`\\b${name}\\b`));
  }
});
