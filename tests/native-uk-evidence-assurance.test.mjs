import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("native food-safety evidence is refreshed on focus and discards superseded responses", async () => {
  const hook = await read("mobile/lib/compliance-evidence.ts");
  assert.match(hook, /useFocusEffect/);
  assert.match(hook, /active = false/);
  assert.match(hook, /status: "error", data: null/);
  for (const name of ["inspection-readiness", "ppds", "safe-methods"]) {
    const route = await read("mobile/app/" + name + ".tsx");
    assert.match(route, /useSession/);
    assert.match(route, /workspaceReady/);
    assert.match(route, /session\.user\.id/);
    assert.match(route, /useComplianceEvidence\(load\)/);
    assert.match(route, /\.eq\("organization_id", organizationId\)/);
    assert.match(route, /\.eq\("location_id", locationId\)/);
    assert.match(route, /onRefresh=/);
  }
});

test("native inspection counts fail closed and labels are historical, not approved", async () => {
  const [readiness, ppds, methods, page] = await Promise.all([
    read("mobile/app/inspection-readiness.tsx"),
    read("mobile/app/ppds.tsx"),
    read("mobile/app/safe-methods.tsx"),
    read("mobile/components/compliance-list.tsx"),
  ]);
  assert.match(readiness, /result\.error \|\| result\.count === null/);
  assert.match(readiness, /Zero does not establish compliance/);
  assert.match(ppds, /if \(error \|\| !data\)/);
  assert.match(ppds, /history does not verify/);
  assert.match(methods, /result\.count !== result\.data\.length/);
  assert.match(methods, /due > Date\.now\(\)/);
  assert.match(page, /Retry loading/);
  assert.match(page, /accessibilityRole="alert"/);
});
