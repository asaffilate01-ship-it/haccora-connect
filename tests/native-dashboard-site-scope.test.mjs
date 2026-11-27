import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../mobile/app/dashboard.tsx", import.meta.url), "utf8");

test("native dashboard counts are scoped to the selected premises and actor", () => {
  const queries = source.split("supabase\n          .from(").slice(1);
  assert.equal(queries.length, 5);
  for (const query of queries) {
    assert.match(query, /\.eq\("organization_id", organizationId\)/);
  }
  const siteQueries = queries.filter((query) => !query.startsWith('"alerts"'));
  for (const query of siteQueries) {
    assert.match(query, /\.eq\("location_id", locationId\)/);
  }
  const alerts = queries.find((query) => query.startsWith('"alerts"'));
  assert.match(alerts, /\.eq\("user_id", userId\)/);
  assert.match(alerts, /location_id\.eq\.\$\{locationId\},location_id\.is\.null/);
  assert.match(source, /key=\{/);
});

test("native dashboard refreshes only focused evidence and rejects unavailable counts", () => {
  assert.match(source, /useFocusEffect\(/);
  assert.match(source, /result\.error \|\| result\.count === null/);
  assert.match(source, /if \(!active\) return/);
  assert.match(source, /active = false/);
  assert.match(source, /const available = dataState === "ready" && network\.isConnected !== false/);
  assert.match(source, /AppState\.currentState !== "active"/);
  assert.match(source, /subscription\.remove\(\)/);
  assert.match(source, /clearInterval\(dayTimer\)/);
  assert.match(source, /RefreshControl/);
  assert.doesNotMatch(source, /Your scheduled checks are clear/);
});

test("daily counts share UK day boundaries and expired stock remains visible", () => {
  assert.match(source, /operationalDay\(now, "Europe\/London"\)/);
  const checks = source.split('supabase\n          .from("checks")').slice(1);
  assert.equal(checks.length, 2);
  for (const query of checks) {
    assert.match(query, /\.gte\("created_at", day\.start\)/);
    assert.match(query, /\.lt\("created_at", day\.end\)/);
  }
  assert.match(source, /Expiry due or overdue \(7 days\)/);
});
