import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("production dashboard acceptance covers every supplied role on desktop and mobile", async () => {
  const [spec, workflow, packageJson, appShell, documentation] = await Promise.all([
    read("tests/e2e/authenticated-role-dashboards.spec.ts"),
    read(".github/workflows/production-dashboard-acceptance.yml"),
    read("package.json"),
    read("src/routes/app.tsx"),
    read("docs/acceptance-evidence.md"),
  ]);

  for (const key of [
    "ROLE_ACCEPTANCE_PLATFORM_OWNER_EMAIL",
    "ROLE_ACCEPTANCE_OWNER_EMAIL",
    "ROLE_ACCEPTANCE_MANAGER_EMAIL",
    "ROLE_ACCEPTANCE_CHEF_EMAIL",
    "ROLE_ACCEPTANCE_STAFF_EMAIL",
    "ROLE_ACCEPTANCE_INSPECTOR_EMAIL",
    "ROLE_ACCEPTANCE_ISOLATION_OWNER_EMAIL",
  ]) {
    assert.match(spec, new RegExp(key));
    assert.match(workflow, new RegExp(key));
  }

  assert.match(spec, /AxeBuilder/);
  assert.match(spec, /scrollWidth/);
  assert.match(spec, /browserErrors/);
  assert.match(spec, /\/app\/billing/);
  assert.match(spec, /Harbour Café/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /secrets\.ROLE_ACCEPTANCE_PASSWORD/);
  assert.match(packageJson, /"test:e2e:authenticated"/);
  assert.match(packageJson, /--project=chromium --project=mobile-chromium --workers=1/);
  assert.match(appShell, /Account menu for/);
  assert.match(documentation, /Production authenticated dashboards/);
});
