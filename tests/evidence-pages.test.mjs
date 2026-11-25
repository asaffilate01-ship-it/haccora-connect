import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/evidence-pages.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { readEvidencePages } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);

const key = (row) => row.id;
const dataset = (n) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));

test("evidence paging retrieves large datasets without repeated or unnecessary final requests", async () => {
  const rows = dataset(1251);
  const calls = [];
  const result = await readEvidencePages(async (from, to) => {
    calls.push([from, to]);
    return { data: rows.slice(from, to + 1), count: rows.length, error: null };
  }, key);
  assert.deepEqual(result, rows);
  assert.deepEqual(calls, [
    [0, 499],
    [500, 999],
    [1000, 1499],
  ]);
});

test("evidence paging handles empty data and a lower provider page limit", async () => {
  const empty = await readEvidencePages(async () => ({ data: [], count: 0, error: null }), key);
  assert.deepEqual(empty, []);
  const rows = dataset(640);
  const result = await readEvidencePages(
    async (from) => ({ data: rows.slice(from, from + 200), count: rows.length, error: null }),
    key,
  );
  assert.deepEqual(result, rows);
});

test("evidence paging rejects changing counts, duplicates, errors and missing rows", async () => {
  await assert.rejects(
    readEvidencePages(
      async (from) => ({ data: dataset(1), count: from ? 3 : 2, error: null }),
      key,
    ),
    /count changed/,
  );
  await assert.rejects(
    readEvidencePages(async () => ({ data: dataset(1), count: 2, error: null }), key),
    /Duplicate/,
  );
  await assert.rejects(
    readEvidencePages(async () => ({ data: [], count: 1, error: null }), key),
    /incomplete/,
  );
  await assert.rejects(
    readEvidencePages(async () => ({ data: null, count: null, error: "offline" }), key),
    /unavailable/,
  );
  await assert.rejects(
    readEvidencePages(async () => ({ data: [], count: 10001, error: null }), key),
    /review limit/,
  );
});

test("superseded evidence requests stop and never return a partial dataset", async () => {
  let current = true;
  let calls = 0;
  await assert.rejects(
    readEvidencePages(
      async () => {
        calls += 1;
        current = false;
        return { data: dataset(1), count: 2, error: null };
      },
      key,
      () => current,
    ),
    /superseded/,
  );
  assert.equal(calls, 1);
});
