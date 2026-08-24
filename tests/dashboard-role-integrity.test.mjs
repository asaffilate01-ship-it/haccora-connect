import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("tenant dashboards use live premises and rota data without fabricated commercial claims", async () => {
  const [dashboard, copy] = await Promise.all([
    read("src/routes/app.index.tsx"),
    read("src/lib/i18n.tsx"),
  ]);

  assert.match(dashboard, /\.from\("locations"\)/);
  assert.match(dashboard, /\.from\("shifts"\)/);
  assert.match(dashboard, /londonDateISO\(\)/);
  assert.match(dashboard, /Open purchase orders/);
  assert.doesNotMatch(dashboard, /\.select\("total_eur"\)/);
  assert.doesNotMatch(dashboard, /t\("dash\.manager\.shiftBody"\)/);
  assert.doesNotMatch(dashboard, /t\("dash\.chef\.lineBody"\)/);
  assert.match(copy, /Compliance, team readiness and alerts across your active premises/);
  assert.doesNotMatch(copy, /Revenue, compliance and alerts across your network/);
});

test("tenant dashboards fail visibly instead of treating missing records as compliant", async () => {
  const [dashboard, liveMetrics] = await Promise.all([
    read("src/routes/app.index.tsx"),
    read("src/components/LiveMetrics.tsx"),
  ]);

  assert.match(dashboard, /function evidenceScore[\s\S]*return scores\.length[\s\S]*: null/);
  assert.match(dashboard, /Zero values are not confirmation that everything is clear/);
  assert.match(dashboard, /Tasks are temporarily unavailable/);
  assert.match(dashboard, /No tasks assigned yet/);
  assert.match(liveMetrics, /Live metrics are unavailable/);
  assert.match(liveMetrics, /role="alert"/);
});

test("inspection readiness counts the correct private and training evidence", async () => {
  const [inspection, evidenceExport] = await Promise.all([
    read("src/routes/app.inspection.tsx"),
    read("supabase/functions/inspection-export/index.ts"),
  ]);

  assert.match(inspection, /\.from\("health_register"\)/);
  assert.match(inspection, /\.from\("training_records"\)/);
  assert.match(inspection, /scopeByEvidence/);
  assert.match(inspection, /user\.inspectorScopes\.includes\(requiredScope\)/);
  assert.match(inspection, /Missing values are not being treated as compliant/);
  assert.doesNotMatch(inspection, /trainingDocs/);
  assert.match(evidenceExport, /\.from\("health_register"\)/);
  assert.match(evidenceExport, /Fitness-to-work records visible to this user/);
});

test("platform roles receive focused sections and cannot enter mismatched prospect tooling", async () => {
  const [platform, prospects, browserConfig] = await Promise.all([
    read("src/routes/platform.tsx"),
    read("src/routes/platform-prospects.tsx"),
    read("playwright.config.ts"),
  ]);

  for (const label of [
    "Overview",
    "Customers",
    "Sales & enquiries",
    "Service health",
    "Team & audit",
  ]) {
    assert.match(platform, new RegExp(label.replace(/[&]/g, "&")));
  }
  assert.match(platform, /Platform owner dashboard/);
  assert.match(platform, /Support operations dashboard/);
  assert.match(platform, /Platform assurance dashboard/);
  assert.match(platform, /activeSection === "customers"/);
  assert.match(platform, /activeSection === "operations"/);
  assert.match(platform, /canManageProspects &&/);
  assert.match(platform, /if \(typeof pence !== "number"\) return "—"/);
  assert.match(platform, /aria-label="Prospects"/);
  assert.match(platform, /hidden sm:inline">Sign out/);
  assert.match(platform, /overflow-x-auto/);
  assert.match(browserConfig, /Galaxy Tab S9/);
  assert.match(prospects, /else if \(!canEdit\) void navigate\(\{ to: "\/platform" \}\)/);
  assert.match(prospects, /loading \|\| !platformRole \|\| !canEdit/);
});

test("native dashboards are role-focused and never show false all-clear data", async () => {
  const dashboard = await read("mobile/app/dashboard.tsx");

  for (const label of ["BUSINESS OVERVIEW", "SHIFT CONTROL", "KITCHEN CONTROL", "MY SHIFT"]) {
    assert.match(dashboard, new RegExp(label));
  }
  assert.match(dashboard, /dataState.*"loading".*"ready".*"error"/s);
  assert.match(dashboard, /Dashboard data is unavailable/);
  assert.match(dashboard, /No routine, alert or corrective action has been assumed clear/);
  assert.match(dashboard, /return total \? Math\.round\(\(today\.done \/ total\) \* 100\) : 0/);
  assert.match(dashboard, /const quickTools = QUICK_TOOLS\.filter/);
});
