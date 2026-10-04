import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL("../.github/workflows/production-supabase-deploy.yml", import.meta.url),
  "utf8",
);

test("production Supabase deploy is protected and verifies the Omniqora bridge function", () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /PRODUCTION_SUPABASE_PROJECT_REF/);
  assert.match(workflow, /confirm_project_ref/);
  assert.match(workflow, /supabase db push --dry-run/);
  assert.match(workflow, /supabase functions deploy/);
  assert.match(workflow, /omniqora-platform/);
  assert.match(workflow, /production-release-evidence\/functions-list\.txt/);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY/);
});
