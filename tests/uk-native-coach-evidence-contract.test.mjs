import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../mobile/app/coach.tsx", import.meta.url), "utf8");

test("native coach scopes evidence to the selected organisation and premises", () => {
  const queries = source.split(/supabase\s*\n\s*\.from\(/).slice(1);
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.match(query, /\.eq\("organization_id", organizationId\)/);
    assert.match(query, /\.eq\("location_id", locationId\)/);
  }
  assert.match(source, /if \(!organizationId \|\| !locationId\)/);
  assert.match(source, /role === "inspector"/);
  assert.match(source, /serviceStatus !== "active"/);
});

test("native coach uses UK date bounds and refreshes on return to the screen", () => {
  assert.match(source, /operationalDay\(new Date\(day \+ "T12:00:00Z"\), "Europe\/London"\)/);
  assert.match(source, /\.lt\("created_at", period\.end\)/);
  assert.match(source, /\.lt\("logged_at", period\.end\)/);
  assert.match(source, /useFocusEffect\(/);
  assert.match(source, /subscription\.remove\(\)/);
  assert.match(source, /clearInterval\(timer\)/);
  assert.match(source, /\.in\("status", \["out_of_range", "alert"\]\)/);
});

test("native coach never presents failed evidence as zero or a reassuring priority", () => {
  assert.match(source, /openChecks\.count === null/);
  assert.match(source, /excursions\.count === null/);
  assert.match(source, /if \(!active\) return/);
  assert.match(source, /available \? checks : "—"/);
  assert.match(source, /\(available \? priorities : \[\]\)\.map/);
  assert.match(source, /Retry loading/);
  assert.doesNotMatch(source, /No urgent evidence gaps found/);
});
