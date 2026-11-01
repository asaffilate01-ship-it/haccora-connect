import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/operational-label.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(js, { exports }, { filename: "operational-label.js" });
const { validIsoDay, labelBlockers, premisesDate } = exports;

const recipe = {
  id: "recipe1",
  name: "Verified workspace recipe",
  flagged: false,
  updated_at: "2026-10-20T10:00:00Z",
  organization_id: "org1",
  location_id: "site1",
};
const valid = {
  organizationId: "org1",
  locationId: "site1",
  canPrint: true,
  active: true,
  evidenceAvailable: true,
  recipe,
  kind: "prep",
  useBy: "2026-11-04",
  reviewed: true,
  today: "2026-11-01",
};

test("real recipe, scoped operator and reviewed future date can prepare operational label", () => {
  assert.deepEqual(Array.from(labelBlockers(valid)), []);
  assert.deepEqual(Array.from(labelBlockers({ ...valid, recipe: { ...recipe, location_id: null } })), []);
});

test("arbitrary demo products, cross-premises records and flagged recipes cannot print", () => {
  assert.ok(labelBlockers({ ...valid, recipe: null }).includes("product"));
  assert.ok(labelBlockers({ ...valid, recipe: { ...recipe, organization_id: "other" } }).includes("product"));
  assert.ok(labelBlockers({ ...valid, recipe: { ...recipe, location_id: "other" } }).includes("product"));
  assert.ok(labelBlockers({ ...valid, recipe: { ...recipe, flagged: true } }).includes("product"));
  assert.ok(labelBlockers({ ...valid, recipe: { ...recipe, updated_at: "" } }).includes("product"));
});

test("unavailable data, missing permissions and frozen account fail closed", () => {
  assert.ok(labelBlockers({ ...valid, evidenceAvailable: false }).includes("evidence"));
  assert.ok(labelBlockers({ ...valid, canPrint: false }).includes("permission"));
  assert.ok(labelBlockers({ ...valid, active: false }).includes("inactive"));
  assert.ok(labelBlockers({ ...valid, organizationId: null }).includes("workspace"));
});

test("allergen labels are not issued from generic recipe records", () => {
  assert.ok(labelBlockers({ ...valid, kind: "allergen" }).includes("unsupported"));
  assert.ok(labelBlockers({ ...valid, reviewed: false }).includes("review"));
});

test("date validation rejects imaginary, incomplete and past dates", () => {
  assert.equal(validIsoDay("2026-02-30"), false);
  assert.equal(validIsoDay("2026-11-02"), true);
  assert.equal(validIsoDay("2026-11-2"), false);
  assert.ok(labelBlockers({ ...valid, useBy: "2026-02-30" }).includes("date"));
  assert.ok(labelBlockers({ ...valid, useBy: "2026-10-31" }).includes("expired"));
});

test("premises time zone handles local day boundaries rather than a UTC assumption", () => {
  const now = new Date("2026-07-01T22:30:00Z");
  assert.equal(premisesDate(now, "Europe/London"), "2026-07-01");
  assert.equal(premisesDate(now, "Europe/Berlin"), "2026-07-02");
});

test("print screen has no demo catalogue or invented shelf life and must persist before printing", async () => {
  const page = await readFile(new URL("../src/routes/app.labels.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /CATALOG|shelfDays|House bolognese|Caesar dressing|none declared/);
  assert.match(page, /\.from\("recipes"\)/);
  assert.match(page, /\.from\("label_prints"\)\.insert\(/);
  assert.match(page, /\.eq\("organization_id", user\.organizationId\)/);
  assert.match(page, /labelBlockers\(/);
  assert.match(page, /reviewed/);
  assert.match(page, /window\.print\(\)/);
  assert.match(page, /\.select\("id"\)\.single\(\)/);
});
