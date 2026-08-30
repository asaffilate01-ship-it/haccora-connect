import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("production deployment archives and reconciles the live migration ledger", async () => {
  const [workflow, verifier] = await Promise.all([
    read(".github/workflows/production-supabase-deploy.yml"),
    read("scripts/verify-remote-migration-ledger.mjs"),
  ]);

  assert.match(workflow, /production-migration-list-before\.txt/);
  assert.match(workflow, /production-migration-list\.txt/);
  assert.match(workflow, /MIGRATION_TARGET: production/);
  assert.match(workflow, /verify-remote-migration-ledger\.mjs/);
  assert.match(workflow, /actions\/upload-artifact@[a-f0-9]{40}/);
  assert.match(verifier, /MIGRATION_TARGET/);
  assert.match(verifier, /MIGRATION_LIST_FILE/);
  assert.match(verifier, /target: migrationTarget/);
  assert.match(verifier, /`\$\{migrationTarget\}-migration-ledger\.json`/);
});

test("production scheduler invokes every protected dispatcher at the required cadence", async () => {
  const workflow = await read(".github/workflows/production-dispatch.yml");

  assert.match(workflow, /cron: "\*\/5 \* \* \* \*"/);
  assert.match(workflow, /cron: "2,17,32,47 \* \* \* \*"/);
  assert.match(workflow, /secrets\.CRON_SECRET/);
  assert.match(workflow, /vars\.SUPABASE_URL/);
  assert.doesNotMatch(workflow, /SERVICE_ROLE|SUPABASE_ACCESS_TOKEN/);
  for (const functionName of [
    "file-scan",
    "operations-dispatch",
    "integration-dispatch",
    "notification-dispatch",
  ]) {
    assert.match(workflow, new RegExp(functionName));
  }
  assert.match(workflow, /case "\$status"/);
  assert.match(workflow, /2\?\?/);
});
