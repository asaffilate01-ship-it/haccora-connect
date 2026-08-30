import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("production workflow configuration is verified without committing secret values", async () => {
  const [workflow, documentation] = await Promise.all([
    read(".github/workflows/production-configuration-preflight.yml"),
    read("docs/github-production-configuration.md"),
  ]);

  for (const key of [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "PRODUCTION_SUPABASE_PROJECT_REF",
    "SUPABASE_ACCESS_TOKEN",
    "PRODUCTION_SUPABASE_DB_PASSWORD",
    "CRON_SECRET",
    "ROLE_ACCEPTANCE_PASSWORD",
    "ROLE_ACCEPTANCE_PLATFORM_OWNER_EMAIL",
    "ROLE_ACCEPTANCE_OWNER_EMAIL",
    "ROLE_ACCEPTANCE_MANAGER_EMAIL",
    "ROLE_ACCEPTANCE_CHEF_EMAIL",
    "ROLE_ACCEPTANCE_STAFF_EMAIL",
    "ROLE_ACCEPTANCE_INSPECTOR_EMAIL",
    "ROLE_ACCEPTANCE_ISOLATION_OWNER_EMAIL",
  ]) {
    assert.match(workflow, new RegExp(key));
    assert.ok(documentation.includes(`\`${key}\``));
  }

  assert.match(workflow, /environment: production/);
  assert.match(workflow, /secrets\.SUPABASE_ACCESS_TOKEN/);
  assert.match(workflow, /vars\.SUPABASE_URL/);
  assert.match(workflow, /dbjbhemmtdkzulsxfvmi/);
  assert.match(workflow, /\*\@example\.test/);
  assert.doesNotMatch(workflow, /service[_-]role/i);
  assert.match(documentation, /must not be copied into source control/);
});
