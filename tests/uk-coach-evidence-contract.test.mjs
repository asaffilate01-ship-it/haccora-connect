import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/routes/app.coach.tsx", import.meta.url), "utf8");

test("coach uses exact daily counts and consistent UK operational-day boundaries", () => {
  assert.match(source, /operationalDate\(now, "Europe\/London", index - 6\)/);
  assert.match(source, /periods\.map\(\(period\) =>/);
  assert.match(source, /count: "exact" as const, head: true/);
  assert.match(source, /\.gte\("completed_at", period\.start\)/);
  assert.match(source, /\.lt\("completed_at", period\.end\)/);
  assert.doesNotMatch(source, /\.select\("completed_at"\)/);
});

test("coach queries only evidence for the selected workspace and location", () => {
  const queries = source.split(/supabase\s*\n\s*\.from\(/).slice(1);
  assert.equal(queries.length, 7);
  for (const query of queries) {
    assert.match(query, /\.eq\("organization_id", organizationId\)/);
    assert.match(query, /\.eq\("location_id", locationId\)/);
  }
  assert.match(source, /\.eq\("status", "active"\)/);
  assert.match(source, /\.in\("status", \["out_of_range", "alert"\]\)/);
});

test("coach hides priorities and totals when evidence is stale or incomplete", () => {
  assert.match(source, /const available = !loading && !error && loadedDay === day/);
  assert.match(source, /request !== requestId\.current/);
  assert.match(source, /result\.error \|\| result\.count === null/);
  assert.match(source, /if \(!available\) return \[\]/);
  assert.match(source, /value \?\? "—"/);
  assert.match(source, /No priorities found in this view/);
  assert.doesNotMatch(source, /No urgent evidence gaps found/);
});
