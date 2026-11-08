import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../src/routes/app.today.tsx", import.meta.url), "utf8");

test("Today uses the UK premises operational day rather than the viewer's midnight", () => {
  assert.match(page, /operationalDay\(new Date\(\), "Europe\/London"\)/);
  assert.doesNotMatch(page, /setHours\(0, 0, 0, 0\)/);
  for (const column of ["completed_at", "created_at", "logged_at"]) {
    assert.match(page, new RegExp('\\.gte\\("' + column + '", day\\.start\\)'));
    assert.match(page, new RegExp('\\.lt\\("' + column + '", day\\.end\\)'));
  }
});

test("Today refuses missing counts and recovers without showing an invented all-clear", () => {
  assert.match(page, /typeof result\.count !== "number"/);
  assert.match(page, /if \(loading\)\s*\{\s*return \(/);
  assert.match(page, /if \(loadError\)\s*\{\s*return \(/);
  assert.match(page, /Retry today's records/);
  assert.match(page, /requestVersion\.current/);
  assert.match(page, /No open exceptions recorded/);
  assert.doesNotMatch(page, /const \[since\]/);
});
