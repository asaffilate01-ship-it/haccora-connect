import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const dayModule = {};
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(new URL("../src/lib/operational-day.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText,
  { exports: dayModule, Date, Intl },
);

// Exercise the actual components' async transitions without live credentials.
// JSX remains a tree so no browser or auth bypass is added to the application.
function harness(file, component, respond) {
  const state = [],
    refs = [],
    effects = [];
  let cursor = 0,
    refCursor = 0,
    first = true;
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in state)) state[i] = initial;
      return [
        state[i],
        (value) => {
          state[i] = typeof value === "function" ? value(state[i]) : value;
        },
      ];
    },
    useRef(initial) {
      const i = refCursor++;
      return (refs[i] ??= { current: initial });
    },
    useCallback: (fn) => fn,
    useEffect: (fn) => {
      if (first) effects.push(fn);
    },
  };
  const jsx = (type, props) => ({ type, props });
  const query = (table) => {
    const request = { table, mutation: false, head: false };
    const chain = new Proxy(
      {},
      {
        get: (_, key) => {
          if (key === "then")
            return (resolve, reject) =>
              Promise.resolve()
                .then(() => respond(request))
                .then(resolve, reject);
          return (...args) => {
            if (key === "update") request.mutation = true;
            if (key === "select" && args[1]?.head) request.head = true;
            return chain;
          };
        },
      },
    );
    return chain;
  };
  const channel = { on: () => channel, subscribe: () => channel };
  const supabase = {
    from: query,
    rpc: () => Promise.resolve({ data: [] }),
    channel: () => channel,
    removeChannel() {},
  };
  const exports = {};
  const source =
    readFileSync(new URL("../" + file, import.meta.url), "utf8") +
    `\nexport { ${component} as UnderTest };`;
  const output = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const mockRequire = (name) => {
    if (name === "@/lib/operational-day") return dayModule;
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name.includes("/supabase/")) return { supabase };
    if (name === "@/lib/auth")
      return {
        useAuth: () => ({
          user: { id: "staff-fixture", name: "Test User", role: "staff", location: "Test kitchen" },
        }),
      };
    if (name === "@/lib/i18n") return { useI18n: () => ({ lang: "en", t: (key) => key }) };
    if (name === "@tanstack/react-router")
      return { createFileRoute: () => (value) => value, Link: "a" };
    return new Proxy({}, { get: (_, key) => key });
  };
  vm.runInNewContext(output, {
    exports,
    require: mockRequire,
    Date,
    Set,
    Map,
    Promise,
    Intl,
    setInterval: () => 1,
    clearInterval() {},
  });
  const render = () => {
    cursor = 0;
    refCursor = 0;
    const tree = exports.UnderTest();
    first = false;
    return tree;
  };
  const tree = render();
  const cleanups = effects.map((effect) => effect());
  return { tree, render, cleanup: () => cleanups.forEach((fn) => fn?.()) };
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  if (Array.isArray(tree)) return tree.map(text).join(" ");
  return text(tree.props?.children);
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
const success = () => ({ data: [], count: 0, error: null });

test("alerts distinguish query failures from confirmed empty data and recover on retry", async () => {
  let fail = true;
  const h = harness("src/routes/app.index.tsx", "ActionsCard", () =>
    fail ? { data: null, error: { message: "offline" } } : success(),
  );
  await settle();
  let tree = h.render();
  assert.match(text(tree), /Alerts could not be loaded/);
  assert.doesNotMatch(text(tree), /No open alerts/);
  fail = false;
  nodes(tree)
    .find((node) => node.type === "button")
    .props.onClick();
  await settle();
  tree = h.render();
  assert.doesNotMatch(text(tree), /Alerts could not be loaded/);
  assert.ok(nodes(tree).some((node) => node.props?.className?.includes("text-success")));
  h.cleanup();
});

test("rejected metrics requests expose recovery instead of an endless spinner", async () => {
  const h = harness("src/components/LiveMetrics.tsx", "LiveMetrics", () =>
    Promise.reject(new Error("network")),
  );
  await settle();
  const tree = h.render();
  assert.equal(tree.props.role, "alert");
  assert.match(text(tree), /Live metrics are unavailable/);
  const retry = nodes(tree).find(
    (node) => node.type === "button" || node.type === "ActionButton",
  );
  assert.ok(retry, "The failure state must expose a retry action");
  assert.equal(retry.props.type, "button");
  assert.equal(typeof retry.props.onClick, "function");
  h.cleanup();
});

test("missing count is unknown, never a confirmed zero", async () => {
  const h = harness("src/components/LiveMetrics.tsx", "LiveMetrics", () => ({
    data: null,
    count: null,
    error: null,
  }));
  await settle();
  assert.equal(h.render().props.role, "alert");
  h.cleanup();
});

test("dashboard hides operational cards while loading and after a rejected request", async () => {
  const h = harness("src/routes/app.index.tsx", "Dashboard", () =>
    Promise.reject(new Error("offline")),
  );
  assert.ok(!nodes(h.tree).some((node) => node.type?.name === "StaffView"));
  await settle();
  const tree = h.render();
  assert.match(text(tree), /Dashboard data is unavailable/);
  assert.ok(!nodes(tree).some((node) => node.type?.name === "StaffView"));
  h.cleanup();
});

test("zero-row check updates surface an error and never report success", async () => {
  const h = harness("src/routes/app.index.tsx", "Dashboard", (request) =>
    request.mutation ? { data: null, error: null } : success(),
  );
  await settle();
  const view = nodes(h.render()).find((node) => node.type?.name === "StaffView");
  assert.ok(view);
  await view.props.done("missing-or-forbidden");
  assert.match(text(h.render()), /check could not be saved/);
  h.cleanup();
});

test("an alerts response arriving after unmount cannot overwrite state", async () => {
  let resolve;
  const response = new Promise((done) => {
    resolve = done;
  });
  const h = harness("src/routes/app.index.tsx", "ActionsCard", () => response);
  await settle();
  h.cleanup();
  resolve(success());
  await settle();
  assert.doesNotMatch(text(h.render()), /No open alerts/);
});

test("capped dashboard tasks disclose the server total and link to all checks", async () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    title: "Check " + i,
    kind: "opening",
    status: "pending",
    created_at: new Date().toISOString(),
    user_id: "staff-fixture",
  }));
  const h = harness("src/routes/app.index.tsx", "Dashboard", (request) =>
    request.table === "checks" ? { data: rows, count: 35, error: null } : success(),
  );
  await settle();
  const tree = h.render();
  assert.match(text(tree), /Showing 20 of 35 checks created today/);
  assert.ok(
    nodes(tree).some(
      (node) => node.props?.to === "/app/checks" && text(node).includes("Open all checks"),
    ),
  );
  h.cleanup();
});
