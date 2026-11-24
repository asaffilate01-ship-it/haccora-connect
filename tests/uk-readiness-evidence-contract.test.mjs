import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/routes/app.readiness.tsx", import.meta.url), "utf8");

test("readiness evidence is scoped to the current organisation and site", () => {
  const queries = source.split('supabase\n            .from("').slice(1);
  assert.equal(queries.length, 8);
  for (const query of queries) {
    assert.match(query, /\.eq\("organization_id", organizationId\)/);
    assert.match(query, /\.eq\("location_id", locationId\)/);
  }
  assert.match(source, /request !== requestId\.current/);
});

test("readiness uses real profile, completed-check and signed-diary evidence", () => {
  assert.match(source, /\.select\("reviewed_at,serves_ppds"\)/);
  assert.match(source, /profile\.data\?\.reviewed_at/);
  assert.match(source, /\.eq\("status", "completed"\)/);
  assert.doesNotMatch(source, /\.eq\("status", "done"\)/);
  assert.match(source, /\.not\("signed_off_at", "is", null\)/);
  assert.match(source, /\.not\("signed_off_by", "is", null\)/);
  assert.match(source, /operationalDate\(new Date\(\), "Europe\/London"\)/);
});

test("incomplete evidence never produces a displayed coverage percentage", () => {
  assert.match(source, /result\.error \|\| result\.count === null/);
  assert.match(source, /setSnapshot\(EMPTY\)/);
  assert.match(source, /const unavailable = loading \|\| !!error/);
  assert.match(source, /unavailable \? "—" :/);
  assert.match(source, /applicable: snapshot\.servesPpds !== false/);
});
