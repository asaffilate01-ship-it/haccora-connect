import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";
const nodes = (v) =>
  !v || typeof v !== "object"
    ? []
    : Array.isArray(v)
      ? v.flatMap(nodes)
      : [v, ...nodes(v.props?.children)];
const text = (v) =>
  v == null
    ? ""
    : typeof v !== "object"
      ? String(v)
      : Array.isArray(v)
        ? v.map(text).join(" ")
        : text(v.props?.children);
function harness(allowed) {
  let prints = 0;
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(new URL("../src/routes/app.labels.tsx", import.meta.url), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      },
    ).outputText,
    {
      exports,
      window: { print: () => prints++ },
      require: (name) => {
        if (name === "@tanstack/react-router") return { createFileRoute: () => (v) => v };
        if (name === "react")
          return { useState: (v) => [v, () => {}], useCallback: (v) => v, useEffect: () => {} };
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
        if (name === "@/lib/i18n") return { useI18n: () => ({ lang: "en" }) };
        if (name === "@/lib/auth")
          return { useAuth: () => ({ user: { id: "staff", role: "staff" } }) };
        if (name === "@/lib/permissions") return { can: () => allowed };
        if (name.includes("supabase"))
          return {
            supabase: {
              from: () => {
                throw Error("Sample must not write operational evidence");
              },
            },
          };
        return {};
      },
    },
  );
  return { tree: exports.Route.component(), prints: () => prints };
}
test("sample labels carry a warning and printing never creates operational evidence", () => {
  const h = harness(true);
  assert.match(text(h.tree), /SAMPLE — NOT FOR FOOD USE/);
  assert.match(text(h.tree), /shelf lives are examples/);
  const button = nodes(h.tree).find((n) => n.type === "button" && text(n).includes("Print sample"));
  assert.ok(button);
  button.props.onClick();
  assert.equal(h.prints(), 1);
});
test("sample printing still respects permission even if the handler is invoked", () => {
  const h = harness(false);
  const button = nodes(h.tree).find((n) => n.type === "button" && n.props.disabled);
  assert.ok(button);
  button.props.onClick();
  assert.equal(h.prints(), 0);
});
