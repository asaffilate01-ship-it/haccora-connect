import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/ai-review-poll-delay.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { aiReviewPollDelay } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);

test("AI review polling increases the delay on consecutive failures and caps it at one minute", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 100].map(aiReviewPollDelay), [
    3500, 7000, 14000, 28000, 56000, 60000, 60000,
  ]);
});

test("reset and invalid failure counts return the normal polling interval", () => {
  for (const value of [0, -1, Number.NaN, Infinity, 0.5]) {
    assert.equal(aiReviewPollDelay(value), 3500);
  }
});
