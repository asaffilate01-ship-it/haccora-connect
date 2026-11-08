import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const page = readFileSync(new URL("../mobile/app/alerts.tsx", import.meta.url), "utf8");

test("native alert inbox parses as TSX", () => {
  const output = ts.transpileModule(page, {
    fileName: "alerts.tsx",
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.equal(errors.length, 0);
});

test("missing alert evidence is not reported as confirmed empty", () => {
  assert.match(page, /readState === "unavailable"/);
  assert.match(page, /readState === "loading"/);
  assert.match(page, /readState === "ready"/);
  assert.match(page, /error \|\| !Array\.isArray\(data\)/);
  assert.match(page, /requestVersion\.current/);
  assert.match(page, /Retry alert records/);
  assert.doesNotMatch(page, /All clear/);
});

test("native alert acknowledgements require a server-confirmed record or a refreshed read", () => {
  assert.match(page, /\.update\(\{ read_at: new Date\(\)\.toISOString\(\) \}\)/);
  assert.match(page, /\.select\("id"\)/);
  assert.match(page, /\.maybeSingle\(\)/);
  assert.match(page, /if \(error \|\| !data\?\.id\)/);
  assert.match(page, /Read status not confirmed/);
  assert.match(page, /latest 100 records/);
  assert.match(page, /food-safety clearance/);
});
