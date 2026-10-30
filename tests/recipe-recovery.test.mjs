import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";
function load(path, require = () => ({}), extra = {}, suffix = "") {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL("../" + path, import.meta.url), "utf8") + suffix, {
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
const lib = load("src/lib/recipe-input.ts");
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
  for (let i = 0; i < 25; i++) await Promise.resolve();
};
function harness({
  form = true,
  allowed = true,
  readError = false,
  deleteRows = [],
  insertError = null,
  replayPatch = {},
  authId = "staff",
} = {}) {
  const values = [],
    refs = [],
    effects = [],
    inserts = [],
    filters = [];
  let cursor = 0,
    rc = 0,
    initial = true,
    saved = 0,
    saving = false,
    deletes = 0;
  let user = { id: "staff", organizationId: "org", locationId: null, role: "manager" };
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState: (v) => {
      const i = cursor++;
      if (!(i in values)) values[i] = v;
      return [
        values[i],
        (x) => {
          values[i] = typeof x === "function" ? x(values[i]) : x;
        },
      ];
    },
    useRef: (v) => {
      const i = rc++;
      return refs[i] ?? (refs[i] = { current: v });
    },
    useCallback: (f) => f,
    useEffect: (f) => {
      if (initial) effects.push(f);
    },
  };
  const mod = load(
    "src/routes/app.recipes.tsx",
    (name) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "@tanstack/react-router") return { createFileRoute: () => (v) => v };
      if (name === "@/lib/i18n") return { useI18n: () => ({ lang: "en", t: (x) => x }) };
      if (name === "@/lib/auth") return { useAuth: () => ({ user }) };
      if (name === "@/lib/permissions") return { can: () => allowed };
      if (name === "@/lib/recipe-input") return lib;
      if (name === "lucide-react") return {};
      if (name.includes("supabase"))
        return {
          supabase: {
            auth: { getUser: async () => ({ data: { user: { id: authId } }, error: null }) },
            from: (table) => {
              assert.equal(table, "recipes");
              let deleting = false,
                payload;
              const q = {
                eq: (key, value) => {
                  filters.push([key, value]);
                  return q;
                },
                order: () => q,
                delete: () => {
                  deleting = true;
                  deletes++;
                  return q;
                },
                select: () => (deleting ? Promise.resolve({ data: deleteRows, error: null }) : q),
                range: async () => ({
                  data: [{ id: "r1", name: "Soup", allergens: [], price_eur: 5, cost_eur: 1 }],
                  error: readError ? {} : null,
                }),
                insert: (p) => {
                  payload = p;
                  inserts.push(p);
                  return q;
                },
                single: async () => ({
                  data: insertError ? null : { id: "r1", ...payload },
                  error: insertError,
                }),
                maybeSingle: async () => ({
                  data: { id: "r1", ...inserts.at(-1), ...replayPatch },
                  error: null,
                }),
              };
              return q;
            },
          },
        };
      throw Error(name);
    },
    { crypto: { randomUUID: () => "submission-1" }, confirm: () => true },
    "\nexport { RecipeForm };",
  );
  const render = () => {
    cursor = 0;
    rc = 0;
    const tree = form
      ? mod.RecipeForm({
          saving,
          setSaving: (v) => {
            saving = v;
          },
          onSaved: () => saved++,
          onClose: () => {},
        })
      : mod.Route.component();
    initial = false;
    return tree;
  };
  render();
  effects.forEach((f) => f());
  const fill = (cost = "1.25", price = "5.50") => {
    for (const [id, value] of [
      ["recipe-name", "Soup"],
      ["recipe-cost", cost],
      ["recipe-price", price],
    ])
      nodes(render())
        .find((n) => n.props?.id === id)
        .props.onChange({ target: { value } });
  };
  return {
    render,
    fill,
    inserts,
    filters,
    saved: () => saved,
    deletes: () => deletes,
    setUser: (v) => {
      user = v;
    },
    submit: () =>
      nodes(render())
        .find((n) => n.type === "form")
        .props.onSubmit({ preventDefault() {} }),
  };
}
test("recipe amounts reject blank, negative, excessive precision and overflow", () => {
  for (const value of ["", " ", "-1", "1.234", "Infinity", "1e3", "100000000"])
    assert.equal(lib.recipeMoney(value), null);
  assert.equal(lib.recipeMoney("0"), 0);
  assert.equal(lib.recipeMoney("12,50"), 12.5);
});
test("failed reads show retry information instead of an empty register", async () => {
  const h = harness({ form: false, readError: true });
  await tick();
  assert.match(text(h.render()), /could not be loaded/);
  assert.doesNotMatch(text(h.render()), /No recipes yet/);
});
test("zero-row delete retains recipe and surfaces unconfirmed deletion", async () => {
  const h = harness({ form: false });
  await tick();
  const button = nodes(h.render()).find((n) => n.props?.["aria-label"] === "Delete recipe");
  button.props.onClick();
  button.props.onClick();
  await tick();
  assert.equal(h.deletes(), 1);
  assert.match(text(h.render()), /Deletion could not be confirmed/);
  assert.match(text(h.render()), /Soup/);
  assert.ok(h.filters.some(([k, v]) => k === "organization_id" && v === "org"));
});
test("failed save preserves entered values and reuses retry id", async () => {
  const h = harness({ insertError: { code: "network" } });
  h.fill();
  await h.submit();
  assert.equal(h.saved(), 0);
  assert.match(text(h.render()), /Save could not be confirmed/);
  assert.equal(nodes(h.render()).find((n) => n.props?.id === "recipe-name").props.value, "Soup");
  await h.submit();
  assert.equal(h.inserts.length, 2);
  assert.equal(h.inserts[0].idempotency_key, h.inserts[1].idempotency_key);
});
test("concurrent submit saves once and requires a confirmed row", async () => {
  const h = harness();
  h.fill();
  const first = h.submit();
  const second = h.submit();
  await Promise.all([first, second]);
  assert.equal(h.inserts.length, 1);
  assert.equal(h.saved(), 1);
});
test("duplicate-key retry confirms only the exact same submission", async () => {
  const good = harness({ insertError: { code: "23505" } });
  good.fill();
  await good.submit();
  assert.equal(good.saved(), 1);
  for (const key of ["organization_id", "created_by", "idempotency_key"])
    assert.ok(good.filters.some(([k]) => k === key));
  for (const replayPatch of [
    { name: "Changed" },
    { organization_id: "other" },
    { created_by: "other" },
    { idempotency_key: "other" },
  ]) {
    const h = harness({ insertError: { code: "23505" }, replayPatch });
    h.fill();
    await h.submit();
    assert.equal(h.saved(), 0);
  }
});
test("invalid amounts, absent permission and changed authenticated user prevent inserts", async () => {
  for (const options of [{ allowed: false }, { authId: "other" }, {}]) {
    const h = harness(options);
    h.fill(Object.keys(options).length ? "1" : "");
    await h.submit();
    assert.equal(h.inserts.length, 0);
    assert.equal(h.saved(), 0);
  }
});
test("account change during authentication prevents stale submission", async () => {
  const h = harness();
  h.fill();
  const pending = h.submit();
  h.setUser({ id: "other", organizationId: "other-org", role: "manager" });
  h.render();
  await pending;
  assert.equal(h.inserts.length, 0);
  assert.equal(h.saved(), 0);
});
