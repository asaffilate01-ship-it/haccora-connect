import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const shell = read("src/routes/app.tsx");
const launcher = read("src/routes/app.quick-log.tsx");

test("operational shell and Quick Log parse as TSX", () => {
  for (const [name, source] of [["app.tsx", shell], ["app.quick-log.tsx", launcher]]) {
    const diagnostics = ts.transpileModule(source, {
      fileName: name,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
      reportDiagnostics: true,
    }).diagnostics ?? [];
    const errors = diagnostics.filter((entry) => entry.category === ts.DiagnosticCategory.Error);
    assert.equal(errors.length, 0, errors.map((entry) => entry.messageText).join("\n"));
  }
});

test("inspector read-only scopes never expose or render operational Quick Log", () => {
  assert.match(shell, /INSPECTOR_OPERATIONAL_PATHS/);
  assert.match(shell, /user\.role !== "inspector"/);
  assert.match(shell, /user\.role === "inspector"/);
  assert.match(shell, /navigate\(\{ to: "\/app\/inspection", replace: true \}\)/);
  assert.match(launcher, /if \(user\.role === "inspector"\)/);
  assert.match(launcher, /View inspection evidence/);
});

test("UK navigation keeps visible labels, role-specific mobile tabs and server-bound role access", () => {
  assert.match(shell, /function isVisibleForRole\(/);
  assert.match(shell, /canAccess\(user\.role, item\.nav, user\.inspectorScopes\)/);
  assert.match(shell, /role === "inspector"\s*\? \["\/app\/inspection"/);
  assert.match(shell, /\(t\(i\.key\) \|\| i\.key\)\.toLowerCase\(\)/);
  assert.ok((shell.match(/\{t\(key\) \|\| key\}/g) ?? []).length >= 4);
});

test("Quick Log shows permitted action groups, not a blanket record-all launcher", () => {
  assert.match(launcher, /canAccess\(user\.role, item\.nav, user\.inspectorScopes\)/);
  assert.match(launcher, /can\(user\.role, item\.action, user\.actionPermissions\)/);
  assert.match(launcher, /nav: "labels"/);
  assert.match(launcher, /section: "record"/);
  assert.match(launcher, /section: "review"/);
  assert.match(launcher, /A record is complete only when its destination confirms saving/);
  assert.match(launcher, /Premises:/);
  assert.match(launcher, /min-h-20/);
});
