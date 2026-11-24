import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = await readFile(new URL("../src/routes/app.ppds.tsx", import.meta.url), "utf8");

test("PPDS evidence is scoped, complete and unavailable during loading", () => {
  assert.match(route, /<PpdsWorkspace/);
  assert.match(route, /request !== requestId\.current/);
  assert.match(route, /result\.count !== result\.data\.length/);
  assert.match(route, /const unavailable = loading \|\| !!loadError/);
  assert.match(route, /Retry evidence loading/);
  assert.match(route, /actionLock\.current/);
});

test("label generation refreshes and revalidates evidence before allocating a version", () => {
  const generate = route.slice(
    route.indexOf("const generate ="),
    route.indexOf("const attachIngredient ="),
  );
  assert.match(generate, /const evidence = await load\(\)/);
  assert.match(generate, /assessPpdsIntegrity\(current, ids, null\)/);
  assert.match(generate, /if \(last\.error\) throw last\.error/);
  assert.match(generate, /evidenceRequest !== requestId\.current/);
  assert.match(generate, /\.select\("id"\)\s*\.single\(\)/);
  assert.match(generate, /Check the full ingredient order and printed label before use/);
});

test("reattaching an ingredient does not overwrite existing recipe quantities", () => {
  const attach = route.slice(route.indexOf("const attachIngredient ="));
  assert.match(attach, /existing recipe quantity has been preserved/);
  assert.match(attach, /\.from\("recipe_ingredients"\)\s*\.insert\(/);
  assert.doesNotMatch(attach, /\.upsert\(/);
});
