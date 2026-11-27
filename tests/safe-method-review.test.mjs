import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/safe-method-review.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { safeMethodNextReview, safeMethodReviewCurrent } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);

const method = { version: "2", prompts: ["How do you monitor the control?"] };
const profile = { jurisdiction: "england", business_type: "restaurant" };
const adoption = {
  status: "active",
  review_due_at: "2027-02-28",
  controls: {
    answers: { 0: "Staff check and record the control at every shift." },
    templateVersion: "2",
    jurisdiction: "england",
    businessType: "restaurant",
    reviewedAt: "2026-08-31T10:00:00.000Z",
    reviewedBy: "manager",
    managementConfirmed: true,
  },
};

test("six-month review dates clamp to the target month including leap years", () => {
  assert.equal(safeMethodNextReview("2026-08-31"), "2027-02-28");
  assert.equal(safeMethodNextReview("2027-08-31"), "2028-02-29");
  assert.equal(safeMethodNextReview("2026-11-30"), "2027-05-30");
  assert.throws(() => safeMethodNextReview("2026-02-30"), RangeError);
});

test("current reviews require matching method and business profile", () => {
  const today = "2026-11-27";
  assert.equal(safeMethodReviewCurrent(method, profile, adoption, today), true);
  assert.equal(
    safeMethodReviewCurrent({ ...method, version: "3" }, profile, adoption, today),
    false,
  );
  assert.equal(
    safeMethodReviewCurrent(method, { ...profile, business_type: "cafe" }, adoption, today),
    false,
  );
  assert.equal(safeMethodReviewCurrent(method, null, adoption, today), false);
});

test("review evidence rejects incomplete answers, missing confirmation and expired dates", () => {
  const today = "2026-11-27";
  const cases = [
    { ...adoption, review_due_at: "2026-11-26" },
    { ...adoption, review_due_at: null },
    { ...adoption, review_due_at: "2027-02-30" },
    { ...adoption, controls: { ...adoption.controls, managementConfirmed: false } },
    { ...adoption, controls: { ...adoption.controls, answers: { 0: "short" } } },
    { ...adoption, controls: { ...adoption.controls, answers: { 0: 123 } } },
    { ...adoption, controls: { ...adoption.controls, reviewedAt: "unknown" } },
    { ...adoption, controls: { ...adoption.controls, reviewedBy: "" } },
  ];
  for (const item of cases) {
    assert.equal(safeMethodReviewCurrent(method, profile, item, today), false);
  }
});

test("safe-method form rechecks sources and confirms the returned save", async () => {
  const route = await readFile(
    new URL("../src/routes/app.safe-methods.tsx", import.meta.url),
    "utf8",
  );
  assert.match(route, /request !== requestId\.current/);
  assert.match(route, /templates\.count !== templates\.data\.length/);
  assert.match(route, /const fresh = await load\(\)/);
  assert.match(route, /JSON\.stringify\(freshAdoption\)/);
  assert.match(route, /writeLock\.current/);
  assert.match(route, /setAcknowledged\(false\)/);
  assert.match(route, /\.select\("id,template_id,status,review_due_at,adopted_by,controls"\)/);
  assert.match(route, /data\.adopted_by !== user\.id/);
  assert.match(route, /safeMethodNextReview\(operationalDate\(reviewedAt, "Europe\/London"\)\)/);
});
