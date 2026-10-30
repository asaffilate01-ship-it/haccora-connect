import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
const compile = (path) =>
  ts.transpileModule(readFileSync(new URL("../" + path, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
const day = {};
vm.runInNewContext(compile("src/lib/operational-day.ts"), { exports: day, Date, Intl });
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
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
function harness(respond = () => ({ count: 0, error: null })) {
  const states = [],
    refs = [],
    effects = [],
    requests = [];
  let cursor = 0,
    rc = 0,
    initial = true,
    user = { id: "staff", organizationId: "org", locationId: "site" };
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState: (v) => {
      const i = cursor++;
      if (!(i in states)) states[i] = typeof v === "function" ? v() : v;
      return [
        states[i],
        (x) => {
          states[i] = typeof x === "function" ? x(states[i]) : x;
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
  const exports = {};
  vm.runInNewContext(compile("src/routes/app.today.tsx"), {
    exports,
    Date,
    Intl,
    require: (name) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "@tanstack/react-router")
        return { createFileRoute: () => (v) => v, Link: "link" };
      if (name === "lucide-react") return {};
      if (name === "@/lib/auth") return { useAuth: () => ({ user }) };
      if (name === "@/lib/operational-day") return day;
      if (name.includes("supabase"))
        return {
          supabase: {
            from: (table) => {
              const request = { table, filters: [] };
              requests.push(request);
              const q = new Proxy(
                {},
                {
                  get: (_, key) =>
                    key === "then"
                      ? (resolve, reject) =>
                          Promise.resolve()
                            .then(() => respond(request, requests.indexOf(request)))
                            .then(resolve, reject)
                      : (...args) => {
                          request.filters.push([key, ...args]);
                          return q;
                        },
                },
              );
              return q;
            },
          },
        };
      throw Error(name);
    },
  });
  const render = () => {
    cursor = 0;
    rc = 0;
    const tree = exports.Route.component();
    initial = false;
    return tree;
  };
  const first = render();
  effects.forEach((f) => f());
  return {
    first,
    render,
    requests,
    setUser: (v) => {
      user = v;
    },
    refresh: () =>
      nodes(render())
        .find((n) => n.props?.["aria-label"] === "Refresh today summary")
        .props.onClick(),
  };
}
test("loading and failed reads never show operational counts or recommendations", async () => {
  for (const respond of [
    () => Promise.reject(Error("network")),
    () => ({ count: null, error: null }),
    () => ({ count: 0, error: {} }),
  ]) {
    const h = harness(respond);
    assert.doesNotMatch(text(h.first), /Review closing routines|0 completed/);
    await tick();
    assert.match(text(h.render()), /Some compliance records could not be loaded/);
    assert.doesNotMatch(
      text(h.render()),
      /Review closing routines|No attention signals|0 completed/,
    );
  }
});
test("all queries are tenant and site scoped and daily queries have both bounds", async () => {
  const h = harness();
  await tick();
  assert.equal(h.requests.length, 7);
  for (const q of h.requests) {
    assert.ok(q.filters.some((f) => f[0] === "eq" && f[1] === "organization_id" && f[2] === "org"));
    assert.ok(q.filters.some((f) => f[0] === "eq" && f[1] === "location_id" && f[2] === "site"));
  }
  for (const q of h.requests.slice(0, 4)) {
    assert.ok(q.filters.some((f) => f[0] === "gte"));
    assert.ok(q.filters.some((f) => f[0] === "lt"));
  }
  assert.ok(h.requests[6].filters.some((f) => f[0] === "lt" && f[1] === "created_at"));
});
test("older unfinished checks contribute to attention and next action", async () => {
  const h = harness((_, i) => ({ count: i === 6 ? 3 : 0, error: null }));
  await tick();
  const tree = h.render();
  assert.match(text(tree), /3 attention signals/);
  assert.match(text(tree), /Review unfinished checks/);
  assert.equal(nodes(tree).filter((n) => n.props?.role === "progressbar").length, 0);
});
test("completion compares completed and unfinished checks from the same creation day", async () => {
  const h = harness((_, i) => ({ count: i === 0 ? 3 : i === 1 ? 1 : 0, error: null }));
  await tick();
  assert.equal(
    nodes(h.render()).find((n) => n.props?.role === "progressbar").props["aria-valuenow"],
    75,
  );
});
test("account switch hides loaded counts immediately", async () => {
  const h = harness();
  await tick();
  assert.match(text(h.render()), /Review closing routines/);
  h.setUser({ id: "other", organizationId: "other", locationId: "other" });
  assert.doesNotMatch(text(h.render()), /Review closing routines|No attention signals/);
});
test("failed refresh hides previously successful counts and allows retry", async () => {
  let fail = false;
  const h = harness(() => (fail ? Promise.reject(Error("offline")) : { count: 2, error: null }));
  await tick();
  fail = true;
  h.refresh();
  await tick();
  assert.doesNotMatch(text(h.render()), /14 attention signals|Review temperature exceptions/);
  fail = false;
  h.refresh();
  await tick();
  assert.match(text(h.render()), /Review temperature exceptions/);
});
