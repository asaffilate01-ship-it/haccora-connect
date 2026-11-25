import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("native inspection evidence is scoped and failed counts never become zero records", () => {
  const source = read("mobile/app/inspection-readiness.tsx");
  assert.match(source, /workspaceReady/);
  assert.match(source, /serviceStatus !== "active"/);
  assert.match(source, /\.eq\("organization_id", organizationId\)/);
  assert.match(source, /\.eq\("location_id", locationId\)/);
  assert.match(source, /result\.error \|\| result\.count === null/);
  assert.match(source, /No readiness totals are shown/);
  assert.match(source, /operationalDate\(now, "Europe\/London", -89\)/);
  assert.match(source, /if \(!active\) return/);
});

test("native PPDS history does not imply current label approval", () => {
  const source = read("mobile/app/ppds.tsx");
  assert.match(source, /\.eq\("organization_id", organizationId\)/);
  assert.match(source, /\.eq\("location_id", locationId\)/);
  assert.match(source, /if \(loadError \|\| !data\)/);
  assert.match(source, /historical records, not approved current labels/);
  assert.match(source, /does not mean allergen-free/);
  assert.match(source, /Current recipe not verified/);
  assert.match(source, /if \(!active\) return/);
});
