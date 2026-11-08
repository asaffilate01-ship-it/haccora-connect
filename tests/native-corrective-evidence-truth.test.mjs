import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const helper = readFileSync(
  new URL("../mobile/lib/corrective-action-read.ts", import.meta.url),
  "utf8",
);
const page = readFileSync(new URL("../mobile/app/actions.tsx", import.meta.url), "utf8");
const parsedPage = ts.transpileModule(page, {
  fileName: "actions.tsx",
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
  reportDiagnostics: true,
});
assert.equal(
  (parsedPage.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  ).length,
  0,
);

const output = ts.transpileModule(helper, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.deepEqual(
  (output.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  ),
  [],
);
const exports = {};
vm.runInNewContext(output.outputText, { exports });
const { classifyCorrectiveActionRead, canChangeCorrectiveAction } = exports;
const action = {
  id: "a1",
  description: "Review cold storage exception",
  severity: "critical",
  status: "open",
  due_at: null,
  evidence: [],
};

test("failed and malformed reads cannot be mistaken for an empty queue", () => {
  for (const [data, error] of [
    [null, null],
    [[], { message: "network" }],
    [undefined, null],
    [[null], null],
    [[{ id: "a1" }], null],
  ]) {
    const result = classifyCorrectiveActionRead(data, error);
    assert.equal(result.kind, "unavailable");
    assert.equal(result.actions.length, 0);
  }
});

test("a confirmed successful empty read is distinct from a read failure", () => {
  const result = classifyCorrectiveActionRead([], null);
  assert.equal(result.kind, "empty");
  assert.equal(result.actions.length, 0);
});

test("valid actions retain attributable evidence without asserting compliance", () => {
  const result = classifyCorrectiveActionRead([action], null);
  assert.equal(result.kind, "ready");
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].id, "a1");
  assert.equal(result.actions[0].severity, "critical");
  assert.equal(classifyCorrectiveActionRead([{ ...action, evidence: null }], null).kind, "ready");
});

test("inspector and unresolved roles cannot change corrective actions", () => {
  assert.equal(canChangeCorrectiveAction("inspector"), false);
  assert.equal(canChangeCorrectiveAction(null), false);
  assert.equal(canChangeCorrectiveAction("staff"), true);
  assert.equal(canChangeCorrectiveAction("manager"), true);
});

test("native page guards stale reads and distinguishes evidence states", () => {
  assert.match(page, /requestVersion\.current/);
  assert.match(page, /\.eq\("organization_id", organizationId\)/);
  assert.match(page, /classifyCorrectiveActionRead\(data, error\)/);
  assert.match(page, /readState === "unavailable"/);
  assert.match(page, /readState === "empty"/);
  assert.match(page, /readState === "loading"/);
  assert.match(page, /readState === "ready"/);
  assert.match(page, /No safety clearance can be inferred/);
  assert.match(page, /Retry records/);
  assert.match(page, /\{canEdit && \(\s*<View style=\{styles\.actions\}>/);
  assert.match(page, /Photo uploaded; action not updated/);
  assert.doesNotMatch(page, /All clear/);
});
