import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("native and web evidence validation use identical reviewed helpers", async () => {
  for (const name of ["safe-method-review.ts", "evidence-pages.ts"]) {
    assert.equal(await read("mobile/lib/" + name), await read("src/lib/" + name));
  }
});

test("native safe methods require scoped evidence and current management attestations", async () => {
  const source = await read("mobile/app/safe-methods.tsx");
  assert.match(source, /\.eq\("organization_id", organizationId\)/);
  assert.match(source, /\.eq\("location_id", locationId\)/);
  assert.match(source, /templates\.count !== templates\.data\.length/);
  assert.match(source, /adopted\.count !== adopted\.data\.length/);
  assert.match(source, /safeMethodReviewCurrent\(method, data\.profile, adoption, reviewDay\)/);
  assert.match(source, /operationalDate\(new Date\(\), "Europe\/London"\)/);
  assert.match(source, /Review evidence unavailable/);
  assert.match(source, /Site profile required/);
  assert.match(source, /role === "inspector"/);
});

test("native allergen lookup scopes and pages recipes without claiming absence", async () => {
  const source = await read("mobile/app/allergens.tsx");
  assert.match(source, /readEvidencePages<Recipe>/);
  assert.match(source, /\.eq\("organization_id", organizationId\)/);
  assert.match(source, /location_id\.eq\.\$\{locationId\},location_id\.is\.null/);
  assert.match(source, /\.range\(from, to\)/);
  assert.match(source, /<FlatList/);
  assert.match(source, /Array\.isArray\(row\.allergens\)/);
  assert.match(source, /unknown\.length > 0/);
  assert.match(source, /This is not a guarantee of absence/);
  assert.match(source, /Allergen evidence unavailable/);
  assert.doesNotMatch(source, /inactiveTag/);
});

test("focused evidence retires stale requests and refreshes after foreground return", async () => {
  const source = await read("mobile/lib/use-focused-evidence.ts");
  assert.match(source, /useFocusEffect\(/);
  assert.match(source, /active && request === requestId/);
  assert.match(source, /if \(isCurrent\(\)\) setState/);
  assert.match(source, /subscription\.remove\(\)/);
  assert.match(source, /requestId \+= 1/);
  assert.match(source, /status: "error", data: null/);
});
