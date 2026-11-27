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

test("failed and malformed reads never look like a confirmed empty queue", () => {
  for (const [data, error] of [
    [null, null],
    [[], { message: "network" }],
    [undefined, null],
    [[null], null],
    [[{ id: "a1" }], null],
  ]) {
    assert.equal(classifyCorrectiveActionRead(data, error).kind, "unavailable");
  }
});

test("confirmed empty and valid action reads have distinct states", () => {
  assert.equal(classifyCorrectiveActionRead([], null).kind, "empty");
  const result = classifyCorrectiveActionRead([action], null);
  assert.equal(result.kind, "ready");
  assert.equal(result.actions[0].id, "a1");
  assert.equal(classifyCorrectiveActionRead([{ ...action, evidence: null }], null).kind, "ready");
});

test("inspector and unresolved roles cannot change corrective actions", () => {
  for (const role of [null, "inspector", "platform_auditor"]) {
    assert.equal(canChangeCorrectiveAction(role), false);
  }
  for (const role of ["owner", "manager", "chef", "staff"]) {
    assert.equal(canChangeCorrectiveAction(role), true);
  }
});

test("native page scopes, retires stale reads, exposes retry and avoids a false all-clear", () => {
  assert.match(page, /\.eq\("organization_id", organizationId\)/);
  assert.match(page, /\.eq\("location_id", locationId\)/);
  assert.match(page, /useFocusedEvidence\(load\)/);
  assert.match(page, /isCurrent\(\)/);
  assert.match(page, /status === "error"/);
  assert.match(page, /status === "ready" && rows\.length === 0/);
  assert.match(page, /No safety clearance can be inferred/);
  assert.match(page, /onPress=\{refresh\}/);
  assert.match(page, /\{canEdit && \(/);
  assert.match(page, /Photo uploaded; action not updated/);
  assert.doesNotMatch(page, /All clear/);
});
