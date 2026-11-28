import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../src/lib/workspace-navigation.ts", import.meta.url),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { isWorkspaceRoute, matchesWorkspaceSearch, restoreWorkspaceGroups } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);

test("navigation matches complete path segments without highlighting adjacent routes", () => {
  assert.equal(isWorkspaceRoute("/app/haccp", "/app/haccp"), true);
  assert.equal(isWorkspaceRoute("/app/haccp-flows", "/app/haccp"), false);
  assert.equal(isWorkspaceRoute("/app/haccp/review", "/app/haccp"), true);
  assert.equal(isWorkspaceRoute("/app/coach", "/app", true), false);
});

test("search matches all terms across tool labels, groups and routes", () => {
  assert.equal(matchesWorkspaceSearch("food safety", "Food safety", "Safe methods"), true);
  assert.equal(matchesWorkspaceSearch("quick log", "/app/quick-log"), true);
  assert.equal(matchesWorkspaceSearch("billing", "Staff induction"), false);
});

test("navigation preferences ignore malformed data, unknown groups and duplicates", () => {
  assert.deepEqual(restoreWorkspaceGroups(["food", null, "unknown", "food"], ["food"]), ["food"]);
  assert.deepEqual(restoreWorkspaceGroups("food", ["food"]), []);
});

test("workspace search is role-filtered and uses accessible dialog and command components", async () => {
  const shell = await readFile(new URL("../src/routes/app.tsx", import.meta.url), "utf8");
  const native = await readFile(new URL("../mobile/app/more.tsx", import.meta.url), "utf8");
  assert.match(shell, /paletteGroups = visibleGroups/);
  assert.match(shell, /<DialogTitle>Find a workspace tool/);
  assert.match(shell, /<CommandMenu shouldFilter=\{false\} loop>/);
  assert.match(shell, /onCloseAutoFocus/);
  assert.match(shell, /routeDenied \?/);
  assert.match(shell, /i\.to !== "\/app\/ai-assistant" \|\| canOpenAi\(user\.role\)/);
  assert.match(native, /if \(!role \|\| !roles\.includes\(role\)\) return false/);
  assert.match(native, /accessibilityLabel="Search workspace tools"/);
  assert.match(native, /keyboardShouldPersistTaps="handled"/);
});

test("food safety terminology and punctuation find the same tools on web and native", async () => {
  assert.equal(matchesWorkspaceSearch("EHO", "Inspection", "/app/inspection"), true);
  assert.equal(matchesWorkspaceSearch("Natasha’s Law", "PPDS", "/app/ppds"), true);
  assert.equal(matchesWorkspaceSearch("goods-in", "Receiving", "/app/goodsin"), true);
  assert.equal(matchesWorkspaceSearch("invoice", "Training", "/app/training"), false);

  const nativeSource = await readFile(
    new URL("../mobile/lib/workspace-search.ts", import.meta.url),
    "utf8",
  );
  assert.ok(source.includes(nativeSource.trim()));
});
