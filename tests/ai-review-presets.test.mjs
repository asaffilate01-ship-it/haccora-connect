import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/ai-review-presets.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { aiReviewPresets, reviewQuestionValid, readableReviewAnswer } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);

test("every guided review maps to a supported runtime kind and valid draft question", () => {
  const expected = [
    "compliance_question",
    "inspection_readiness",
    "allergen_review",
    "corrective_action_review",
    "haccp_review",
    "regulatory_question",
  ];
  assert.deepEqual(aiReviewPresets.map((preset) => preset.kind), expected);
  for (const preset of aiReviewPresets) {
    assert.ok(reviewQuestionValid(preset.prompt));
    assert.ok(preset.label.length > 0);
  }
});

test("draft validation enforces the runtime question limits", () => {
  for (const value of ["", "   ", "123456789", "a".repeat(3001)]) {
    assert.equal(reviewQuestionValid(value), false);
  }
  for (const value of [" 1234567890 ", "a".repeat(3000)]) {
    assert.equal(reviewQuestionValid(value), true);
  }
});

test("AI display extracts only supported answer fields instead of arbitrary objects", () => {
  assert.equal(readableReviewAnswer("Draft"), "Draft");
  assert.equal(readableReviewAnswer({ answer: "Evidence draft", debug: "hidden" }), "Evidence draft");
  assert.equal(readableReviewAnswer({ summary: "Review" }), "Review");
  for (const value of [null, [], 42, { debug: "hidden" }, { answer: { text: "hidden" } }]) {
    assert.equal(readableReviewAnswer(value), "");
  }
});

test("AI workspace separates draft preparation, sharing confirmation and human review", async () => {
  const route = await readFile(
    new URL("../src/routes/app.ai-assistant.tsx", import.meta.url),
    "utf8",
  );
  assert.match(route, /setQuestion\(preset\.prompt\)/);
  assert.match(route, /!confirmed \|\|/);
  assert.match(route, /setConfirmed\(false\)/);
  assert.match(route, /organisation-scoped evidence summary/);
  assert.match(route, /The summary may cover more than the selected site/);
  assert.match(route, /Reported review activity/);
  assert.match(route, /This interface does not approve or execute proposed actions/);
  assert.match(route, /!Array\.isArray\(payload\.steps\)/);
  assert.doesNotMatch(route, /JSON\.stringify\(result, null, 2\)/);
});
