import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/ppds-integrity.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(js, { exports }, { filename: "ppds-integrity.js" });
const { assessPpdsIntegrity } = exports;

const ingredient = {
  id: "milk",
  name: "Milk powder",
  ingredient_statement: "Milk powder",
  allergens: ["Milk"],
  may_contain: [],
  specification_version: "2",
  reviewed_at: "2026-10-10T10:00:00.000Z",
};
const label = {
  allergens: ["Milk"],
  ingredient_statement: "Milk powder",
  source_snapshot: {
    ingredient_ids: ["milk"],
    may_contain: [],
    specifications: [{ id: "milk", version: "2", reviewed_at: "2026-10-10T10:00:00.000Z" }],
  },
};
const assess = (ingredients = [ingredient], ids = ["milk"], snapshot = label) =>
  assessPpdsIntegrity(ingredients, ids, snapshot);

test("matched approved ingredient snapshot remains current", () => {
  const result = assess();
  assert.equal(result.stale, false);
  assert.equal(result.missing.length, 0);
});

test("new or removed recipe ingredients invalidate a controlled PPDS label", () => {
  const newIngredient = {
    ...ingredient,
    id: "egg",
    name: "Egg",
    ingredient_statement: "Egg",
    allergens: ["Eggs"],
  };
  assert.equal(assess([ingredient, newIngredient], ["milk", "egg"]).stale, true);
  assert.equal(assess([ingredient], []).stale, true);
});

test("supplier version, review date, allergens, and may-contain drift invalidate label", () => {
  assert.equal(assess([{ ...ingredient, specification_version: "3" }]).stale, true);
  assert.equal(assess([{ ...ingredient, reviewed_at: "2026-10-15T10:00:00Z" }]).stale, true);
  assert.equal(assess([{ ...ingredient, allergens: ["Eggs", "Milk"] }]).stale, true);
  assert.equal(assess([{ ...ingredient, may_contain: ["Peanuts"] }]).stale, true);
  assert.equal(
    assess([{ ...ingredient, ingredient_statement: "Skimmed milk powder" }]).stale,
    true,
  );
});

test("missing supplier evidence and historical incomplete snapshots fail closed", () => {
  assert.equal(assess([{ ...ingredient, reviewed_at: null }]).missing.length, 1);
  assert.equal(assess([], ["milk"]).stale, true);
  assert.equal(assess([ingredient], ["milk"], { ...label, source_snapshot: {} }).stale, true);
  assert.equal(assess([ingredient], ["milk"], null).stale, true);
});

test("first-week setup is premises-scoped and checks real method attestations", async () => {
  const route = await readFile(
    new URL("../src/routes/app.get-started.tsx", import.meta.url),
    "utf8",
  );
  assert.match(route, /select\("location_id,jurisdiction,business_type,reviewed_at"\)/);
  assert.match(route, /\.eq\("location_id", user\.locationId\)/);
  assert.match(route, /safeMethodReviewCurrent\(/);
  assert.match(route, /profile\.data\?\.reviewed_at \? profile\.data : null/);
  const review = await readFile(
    new URL("../src/lib/safe-method-review.ts", import.meta.url),
    "utf8",
  );
  assert.match(review, /controls\.managementConfirmed !== true/);
  assert.match(review, /controls\.templateVersion !== method\.version/);
  assert.match(route, /Progress unavailable/);
  assert.doesNotMatch(route, /\.from\("site_compliance_profiles"\)\s*\.select\("id"/);
});

test("safe methods require on-premises documented management responses", async () => {
  const route = await readFile(
    new URL("../src/routes/app.safe-methods.tsx", import.meta.url),
    "utf8",
  );
  assert.match(route, /site_compliance_profiles/);
  assert.match(route, /\.eq\("location_id", user\.locationId\)/);
  assert.match(route, /selected\.prompts\.every/);
  assert.match(route, /acknowledged/);
  assert.match(route, /templateVersion/);
  assert.match(route, /jurisdiction/);
  assert.match(route, /managementConfirmed: true/);
});

test("site safe-method reviews are captured by an append-only server trigger", async () => {
  const sql = await readFile(
    new URL(
      "../supabase/migrations/20261015223000_safe_method_review_evidence.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(sql, /site_safe_method_review_events/);
  assert.match(sql, /validate_site_safe_method_activation/);
  assert.match(sql, /Premises-specific management review required/);
  assert.match(sql, /new\.controls->>'managementConfirmed'/);
  assert.match(sql, /Every safe method prompt requires an actual site procedure/);
  assert.match(sql, /security definer set search_path=public,pg_temp/);
  assert.match(sql, /after insert or update on public.site_safe_methods/);
  assert.match(sql, /to_jsonb\(old\), to_jsonb\(new\)/);
  assert.match(sql, /before update or delete on public.site_safe_method_review_events/);
  assert.match(sql, /grant select on public.site_safe_method_review_events to authenticated/);
  assert.doesNotMatch(
    sql,
    /grant (insert|update|delete) on public.site_safe_method_review_events/i,
  );
});

test("recipe quantities and units invalidate PPDS drafts when formulation changes", () => {
  const formulation = [{ ingredient_id: "milk", quantity: 100, unit: "g" }];
  const current = {
    ...label,
    source_snapshot: { ...label.source_snapshot, formulation },
  };
  assert.equal(assessPpdsIntegrity([ingredient], ["milk"], current, formulation).stale, false);
  assert.equal(assessPpdsIntegrity([ingredient], ["milk"], label, formulation).stale, true);
  for (const change of [
    [{ ingredient_id: "milk", quantity: 200, unit: "g" }],
    [{ ingredient_id: "milk", quantity: 100, unit: "ml" }],
  ]) {
    assert.equal(assessPpdsIntegrity([ingredient], ["milk"], current, change).stale, true);
  }
});

test("PPDS drafts require complete current evidence and confirmed persistence", async () => {
  const route = await readFile(new URL("../src/routes/app.ppds.tsx", import.meta.url), "utf8");
  assert.match(route, /readEvidencePages\(/);
  assert.match(route, /\.range\(from, to\)/);
  assert.match(route, /if \(!isCurrent\(\)\) return null/);
  assert.match(route, /const fresh = await load\(\)/);
  assert.match(route, /JSON\.stringify\(freshLinks\) !== JSON\.stringify\(oldLinks\)/);
  assert.match(route, /if \(versionError\) throw new Error/);
  assert.match(route, /if \(error \|\| !data\) throw new Error\("Label version not confirmed"\)/);
  assert.match(route, /!supplierReviewed/);
  assert.match(route, /writeLock\.current/);
  assert.match(route, /Draft only — not approved for printing/);
  assert.doesNotMatch(route, /\.from\("recipe_ingredients"\)\s*\.upsert\(/);
});
