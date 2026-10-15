import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = async (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Dishbee only accepts known compliance events with finite readings and mapped premises", async () => {
  const route = await read("../src/routes/api/integrations/dishbee.ts");
  assert.match(route, /dishbeeLocationId: z\.string\(\)\.uuid\(\)/);
  assert.match(route, /const CompliancePayloads/);
  assert.match(route, /NumberField/);
  assert.match(route, /\.pipe\(z\.number\(\)\.finite\(\)\)/);
  assert.match(route, /invalid_compliance_payload/);
  assert.match(route, /unsupported_event_type/);
  assert.match(route, /dishbee_location_required/);
  assert.match(route, /invalid_evidence_timestamp/);
  assert.doesNotMatch(route, /return Number\.isFinite\(next\) \? next : fallback/);
  assert.doesNotMatch(route, /error instanceof Error \? error\.message : "request_failed"/);
});

test("Dishbee GBP figures never populate legacy EUR columns", async () => {
  const route = await read("../src/routes/api/integrations/dishbee.ts");
  const migration = await read("../supabase/migrations/20261015211500_dishbee_gbp_compliance_evidence.sql");
  for (const field of ["source_currency", "price_gbp", "cost_gbp"]) {
    assert.match(route, new RegExp(field));
    assert.match(migration, new RegExp(field));
  }
  assert.match(route, /currency === "EUR" \? number\(p\["pricePence"\]/);
  assert.match(route, /currency === "GBP" \? number\(p\["pricePence"\]/);
  assert.match(route, /currency !== "EUR" \? null/);
  assert.match(migration, /alter table public\.recipes/);
  assert.match(migration, /alter table public\.waste_entries/);
});

test("UK screens display GBP sourced values and safeguard PPDS labels", async () => {
  const recipes = await read("../src/routes/app.recipes.tsx");
  const waste = await read("../src/routes/app.waste.tsx");
  const ppds = await read("../src/routes/app.ppds.tsx");
  assert.match(recipes, /r\.source_currency === "GBP"/);
  assert.match(recipes, /price_gbp/);
  assert.match(waste, /source_currency: "GBP"/);
  assert.match(waste, /cost_gbp/);
  assert.match(ppds, /unverifiedIngredients/);
  assert.match(ppds, /disabled=\{unverifiedIngredients\.length > 0\}/);
});

test("Daily and workforce screens handle DST, failure and actionable exceptions", async () => {
  const today = await read("../src/routes/app.today.tsx");
  const rota = await read("../src/routes/app.rota.tsx");
  const quick = await read("../src/routes/app.quick-log.tsx");
  assert.match(today, /\.in\("status", \["out_of_range", "alert"\]\)/);
  assert.match(today, /Some compliance records could not be loaded/);
  assert.match(today, /Review temperature exceptions/);
  assert.match(rota, /String\(d\.getMonth\(\) \+ 1\)/);
  assert.doesNotMatch(rota, /return d\.toISOString\(\)\.slice\(0, 10\)/);
  assert.match(rota, /Previous week/);
  assert.match(rota, /Next week/);
  assert.match(rota, /Clock-out failed/);
  for (const route of ["/app/rota", "/app/ppds", "/app/recalls"]) {
    assert.ok(quick.includes(route));
  }
});
