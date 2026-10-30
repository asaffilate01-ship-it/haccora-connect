import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";
function load(path, require = () => ({}), extra = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL("../" + path, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    { exports, require, ...extra },
  );
  return exports;
}
const lib = load("src/lib/label-draft.ts");
const recipe = {
  id: "r1",
  name: "Kitchen soup",
  allergens: ["celery"],
  flagged: false,
  organization_id: "org",
  updated_at: "2026-10-30T08:00:00Z",
};
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
const tick = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
function harness({ allowed = true, rows = [recipe], fail = false, fresh = recipe } = {}) {
  const values = [],
    refs = [],
    effects = [],
    printed = [];
  let user = { id: "staff", organizationId: "org", role: "staff" };
  let cursor = 0,
    rc = 0,
    initial = true,
    closes = 0,
    prints = 0;
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState: (v) => {
      const i = cursor++;
      if (!(i in values)) values[i] = v;
      return [
        values[i],
        (x) => {
          values[i] = x;
        },
      ];
    },
    useRef: (v) => refs[rc] ?? (refs[rc++] = { current: v }),
    useCallback: (f) => f,
    useEffect: (f) => {
      if (initial) effects.push(f);
    },
  };
  // Advance the ref cursor on every render, including existing references.
  react.useRef = (v) => {
    const i = rc++;
    return refs[i] ?? (refs[i] = { current: v });
  };
  const mod = load(
    "src/routes/app.labels.tsx",
    (name) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "@tanstack/react-router") return { createFileRoute: () => (v) => v };
      if (name === "@/lib/i18n") return { useI18n: () => ({ lang: "en" }) };
      if (name === "@/lib/auth") return { useAuth: () => ({ user }) };
      if (name === "@/lib/permissions") return { can: () => allowed };
      if (name === "@/lib/label-draft")
        return { ...lib, renderLabelDocument: (_doc, lines) => printed.push(lines) };
      if (name.includes("supabase"))
        return {
          supabase: {
            from: (table) => {
              assert.equal(table, "recipes");
              const q = {
                select: () => q,
                eq: () => q,
                order: () => q,
                range: async () => ({ data: rows, error: fail ? {} : null }),
                maybeSingle: async () => ({ data: fresh, error: null }),
              };
              return q;
            },
          },
        };
      throw Error(name);
    },
    {
      window: {
        open: () => ({
          document: {},
          opener: {},
          close: () => closes++,
          focus: () => {},
          print: () => prints++,
        }),
      },
    },
  );
  const render = () => {
    cursor = 0;
    rc = 0;
    const tree = mod.Route.component();
    initial = false;
    return tree;
  };
  render();
  effects.forEach((f) => f());
  const fill = () => {
    nodes(render())
      .find((n) => n.type === "select")
      .props.onChange({ target: { value: "r1" } });
    const dates = nodes(render()).filter((n) => n.type === "input" && n.props.type === "date");
    dates[0].props.onChange({ target: { value: "2026-10-30" } });
    dates[1].props.onChange({ target: { value: "2026-10-31" } });
    nodes(render())
      .find((n) => n.type === "input" && n.props.type === "checkbox")
      .props.onChange({ target: { checked: true } });
  };
  return {
    render,
    setUser: (value) => {
      user = value;
    },
    fill,
    printed,
    prints: () => prints,
    closes: () => closes,
  };
}
test("dates require real calendar dates and never infer shelf life", () => {
  for (const date of ["", "2026-02-30", "2026-13-01", "30/10/2026"])
    assert.equal(lib.validLabelDate(date), false);
  assert.equal(lib.validLabelDates("2026-10-30", "2026-10-29"), false);
  assert.equal(lib.validLabelDates("2026-10-30", "2026-10-30"), true);
});
test("flagged, foreign-tenant and malformed recipes fail closed", () => {
  assert.equal(lib.readyLabelRecipe(recipe, "org"), true);
  for (const patch of [
    { flagged: true },
    { organization_id: "other" },
    { allergens: null },
    { updated_at: "bad" },
  ])
    assert.equal(lib.readyLabelRecipe({ ...recipe, ...patch }, "org"), false);
  assert.equal(lib.sameLabelRecipe(recipe, { ...recipe, allergens: ["milk"] }), false);
});
test("failed recipe reads never appear as an empty register", async () => {
  const h = harness({ fail: true });
  await tick();
  assert.match(text(h.render()), /could not be loaded/);
  assert.doesNotMatch(text(h.render()), /No recipes found/);
});
test("draft printing verifies current recipe and never writes operational print history", async () => {
  const h = harness();
  await tick();
  h.fill();
  const button = nodes(h.render()).find(
    (n) => n.type === "button" && text(n) === "Print review draft",
  );
  assert.equal(button.props.disabled, false);
  button.props.onClick();
  button.props.onClick();
  await tick();
  assert.equal(h.prints(), 1);
  assert.equal(h.printed.length, 1);
  assert.match(h.printed[0].join(" "), /DRAFT — NOT FOR FOOD USE/);
});
test("changed or missing source recipe closes preview and requires renewed review", async () => {
  for (const fresh of [null, { ...recipe, flagged: true }, { ...recipe, name: "Changed" }]) {
    const h = harness({ fresh });
    await tick();
    h.fill();
    nodes(h.render())
      .find((n) => n.type === "button" && text(n) === "Print review draft")
      .props.onClick();
    await tick();
    assert.equal(h.prints(), 0);
    assert.equal(h.closes(), 1);
    assert.match(text(h.render()), /changed or is no longer available/);
  }
});
test("insufficient permissions prevent printing even through direct handler invocation", async () => {
  const h = harness({ allowed: false });
  await tick();
  h.fill();
  const button = nodes(h.render()).find(
    (n) => n.type === "button" && text(n) === "Print review draft",
  );
  assert.equal(button.props.disabled, true);
  button.props.onClick();
  await tick();
  assert.equal(h.prints(), 0);
});
test("print document inserts recipe data as text, never HTML", () => {
  const elements = [];
  const doc = {
    head: { appendChild: () => {} },
    body: { replaceChildren: () => {}, appendChild: () => {} },
    createElement: (tag) => {
      const e = { tag, appendChild: () => {} };
      elements.push(e);
      return e;
    },
  };
  lib.renderLabelDocument(doc, ["<img src=x onerror=alert(1)>"]);
  assert.equal(elements.find((e) => e.tag === "p").textContent, "<img src=x onerror=alert(1)>");
  assert.ok(elements.every((e) => !("innerHTML" in e)));
});

test("account switch while a source check is pending closes the draft", async () => {
  const h = harness();
  await tick();
  h.fill();
  nodes(h.render())
    .find((n) => n.type === "button" && text(n) === "Print review draft")
    .props.onClick();
  h.setUser({ id: "other", organizationId: "other-org", role: "staff" });
  h.render();
  await tick();
  assert.equal(h.prints(), 0);
  assert.equal(h.closes(), 1);
});
