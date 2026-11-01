import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("native UK PPDS versions are scoped to authenticated organisation and premises", async () => {
  const page = await read("mobile/app/ppds.tsx");
  assert.match(page, /useSession\(\)/);
  assert.match(page, /\.eq\("organization_id", organizationId\)/);
  assert.match(page, /\.eq\("location_id", locationId\)/);
  assert.match(page, /if \(result\.error\)/);
  assert.match(page, /accessibilityRole="alert"/);
  assert.match(page, /No label is assumed current/);
  assert.match(page, /not proof that the ingredient specification remains unchanged/);
});

test("native allergen lookup does not mistake failed reads for an empty allergen list", async () => {
  const page = await read("mobile/app/allergens.tsx");
  assert.match(page, /\.eq\("organization_id", organizationId\)/);
  assert.match(page, /location_id\.eq\./);
  assert.match(page, /if \(result\.error\)/);
  assert.match(page, /loadError \?/);
  assert.match(page, /Do not assume any allergen declaration is current/);
  assert.match(page, /row\.flagged/);
  assert.doesNotMatch(page, /"No allergens declared in this saved recipe/);
  assert.match(page, /requestVersion\.current \+= 1/);
});

test("mobile review surfaces have an explicit retry and no implied allergen-free label", async () => {
  const [ppds, allergens] = await Promise.all([
    read("mobile/app/ppds.tsx"),
    read("mobile/app/allergens.tsx"),
  ]);
  for (const source of [ppds, allergens]) {
    assert.match(source, /Refresh/);
    assert.match(source, /onPress=\{\(\) => void load\(\)\}/);
    assert.match(source, /Redirect href="\/login"/);
  }
  assert.match(ppds, /not an allergen-free claim/);
  assert.match(allergens, /Do not assume allergen-free/);
});
