import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/routes/app.today.tsx", import.meta.url), "utf8");

test("shift totals are scoped to the active organisation and premises", () => {
  const queries = source.split("supabase\n          .from(").slice(1);
  assert.equal(queries.length, 6);
  for (const query of queries) {
    assert.match(query, /\.eq\("organization_id", organizationId\)/);
    assert.match(query, /\.eq\("location_id", locationId\)/);
  }
});

test("both daily check counts share the same UK calendar cohort", () => {
  const queries = source.split("supabase\n          .from(").slice(1, 3);
  for (const query of queries) {
    assert.match(query, /\.gte\("created_at", period\.start\)/);
    assert.match(query, /\.lt\("created_at", period\.end\)/);
  }
  assert.match(source, /operationalDay\(new Date\(day \+ "T12:00:00Z"\), "Europe\/London"\)/);
  assert.match(source, /window\.setInterval\(checkDay, 60_000\)/);
  assert.match(source, /window\.addEventListener\("focus", checkDay\)/);
});

test("failed, stale and empty shift summaries do not display misleading completion", () => {
  assert.match(source, /result\.error \|\| result\.count === null/);
  assert.match(source, /request !== requestId\.current/);
  assert.match(source, /const available = !loading && !loadError && loadedDay === day/);
  assert.match(source, /totalChecks \? Math\.round\(.+\) : null/);
  assert.match(source, /available && completion !== null/);
  assert.match(source, /No visible exceptions in this summary/);
  assert.match(source, /Evidence unavailable/);
});
