import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = async (filename) => readFile(new URL(filename, import.meta.url), "utf8");

test("supplier specification changes require a manager and an immutable pending proposal", async () => {
  const sql = await read("../supabase/migrations/20261015232000_ingredient_change_approval.sql");
  assert.match(sql, /create table public\.ingredient_change_requests/);
  assert.match(sql, /create unique index ingredient_change_requests_one_pending/);
  assert.match(sql, /where status = 'pending'/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /public\.can_manage_organization\(organization_id\)/);
  assert.match(sql, /requested_by = auth\.uid\(\)/);
  assert.match(sql, /grant select, insert on public\.ingredient_change_requests to authenticated/);
  assert.doesNotMatch(
    sql,
    /grant (update|delete) on public\.ingredient_change_requests to authenticated/i,
  );
});

test("atomic review rechecks scope and ingredient versions before any approved mutation", async () => {
  const sql = await read("../supabase/migrations/20261015232000_ingredient_change_approval.sql");
  assert.match(sql, /create or replace function public\.review_ingredient_change/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public, pg_temp/);
  assert.match(sql, /for update/g);
  assert.match(sql, /v_request\.organization_id/);
  assert.match(sql, /v_request\.expected_version/);
  assert.match(sql, /raise exception 'Supplier specification changed since the proposal/);
  assert.match(sql, /set ingredient_statement = btrim/);
  assert.match(sql, /reviewed_at = now\(\)/);
  assert.match(sql, /previous_snapshot = v_previous/);
  assert.match(sql, /applied_snapshot = v_current/);
  assert.match(sql, /grant execute on function public\.review_ingredient_change/);
});

test("supplier review UI shows impacted recipes and requires explicit decision notes", async () => {
  const source = await read("../src/components/ppds/IngredientChangeReview.tsx");
  const ppds = await read("../src/routes/app.ppds.tsx");
  assert.match(source, /ingredient_change_requests/);
  assert.match(source, /expected_version: selected\.specification_version/);
  assert.match(source, /review_ingredient_change/);
  assert.match(source, /reviewNote\.trim\(\)\.length < 12/);
  assert.match(source, /affectedRecipes/);
  assert.match(source, /linked recipes require re-verification/);
  assert.match(source, /Existing PPDS labels may become out of date/);
  assert.match(ppds, /<IngredientChangeReview/);
  assert.match(ppds, /recipeLinks=\{links\}/);
  assert.match(ppds, /onApplied=\{\(\) => void load\(\)\}/);
});

test("all three mobile security advisories have fixed dependency versions", async () => {
  const packageJson = JSON.parse(await read("../mobile/package.json"));
  const lock = JSON.parse(await read("../mobile/package-lock.json"));
  const patched = {
    compression: "1.8.2",
    "shell-quote": "1.11.0",
    "source-map-js": "1.2.2",
  };
  for (const [name, version] of Object.entries(patched)) {
    assert.equal(packageJson.overrides[name], version);
    assert.equal(lock.packages["node_modules/" + name]?.version, version);
  }
});
