import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");

const [migration, customerRoute, operatorRoute, platformAdmin, appShell, platform] =
  await Promise.all([
    read("supabase/migrations/20260816030000_support_case_operations.sql"),
    read("src/routes/app.support.tsx"),
    read("src/routes/platform-support.tsx"),
    read("supabase/functions/platform-admin/index.ts"),
    read("src/routes/app.tsx"),
    read("src/routes/platform.tsx"),
  ]);

test("support cases and messages are durable tenant-scoped records", () => {
  assert.match(migration, /CREATE TABLE public\.support_cases/i);
  assert.match(migration, /CREATE TABLE public\.support_case_messages/i);
  assert.match(migration, /organization_id = public\.current_organization_id\(\)/);
  assert.match(migration, /NOT is_internal/);
  assert.match(migration, /public\.is_platform_operator\(auth\.uid\(\), NULL\)/);
  assert.match(
    migration,
    /REVOKE ALL ON public\.support_cases, public\.support_case_messages FROM anon, authenticated/i,
  );
  assert.doesNotMatch(
    migration,
    /GRANT (?:INSERT|UPDATE|DELETE|ALL) ON public\.support_cases[^\n]*authenticated/i,
  );
});

test("customer case creation and replies use bounded security-definer functions", () => {
  assert.match(migration, /FUNCTION public\.create_support_case\(/i);
  assert.match(migration, /FUNCTION public\.support_add_case_message\(/i);
  assert.match(
    migration,
    /char_length\(btrim\(COALESCE\(p_message, ''\)\)\) NOT BETWEEN 10 AND 4000/,
  );
  assert.match(migration, /support_case\.status IN \('open','in_progress','pending_customer'\)/);
  assert.match(migration, />= 20 THEN/);
  assert.match(customerRoute, /\.rpc\("create_support_case"/);
  assert.match(customerRoute, /\.rpc\("support_add_case_message"/);
  assert.match(customerRoute, /not an emergency or regulatory reporting channel/i);
  assert.match(customerRoute, /Never include passwords or full payment-card details/i);
});

test("platform support mutations require active operator scope and AAL2", () => {
  assert.match(migration, /operator\.role IN \('platform_owner','platform_support'\)/);
  assert.match(migration, /auth\.jwt\(\) ->> 'aal'.*'aal2'/s);
  assert.match(platformAdmin, /action: z\.literal\("update_support_case"\)/);
  assert.match(platformAdmin, /role === "platform_support"/);
  assert.match(platformAdmin, /"platform_manage_support_case"/);
  assert.match(operatorRoute, /mfaLevel !== "aal2"/);
  assert.match(operatorRoute, /action: "update_support_case"/);
});

test("support activity is audited without copying message content into audit metadata", () => {
  assert.match(migration, /'platform_support_case_updated'/);
  assert.match(migration, /'message_added', p_message IS NOT NULL/);
  assert.match(migration, /'internal_note', p_message IS NOT NULL AND p_internal/);
  const auditInsert = migration.match(
    /INSERT INTO public\.platform_audit_events[\s\S]*?\);\nEND;/,
  )?.[0];
  assert.ok(auditInsert);
  assert.doesNotMatch(auditInsert, /'message',\s*p_message/);
});

test("customer and platform support queues are discoverable from their shells", () => {
  assert.match(appShell, /to: "\/app\/support"/);
  assert.match(appShell, /prefix: "\/app\/support"/);
  assert.match(platform, /to="\/platform-support"/);
  assert.match(operatorRoute, /Internal note — hidden from the customer/);
  assert.match(operatorRoute, /\.from\("support_case_messages"\)/);
});
