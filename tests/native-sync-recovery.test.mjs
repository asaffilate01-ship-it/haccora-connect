import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";
function load(path, require) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL("../" + path, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, { exports, require });
  return exports;
}
const copy = load("mobile/lib/sync-copy.ts", () => ({}));
const tick = async () => {
  for (let i = 0; i < 15; i++) await Promise.resolve();
};
const nodes = (t) =>
  !t || typeof t !== "object"
    ? []
    : Array.isArray(t)
      ? t.flatMap(nodes)
      : [t, ...nodes(t.props?.children)];
const text = (t) =>
  t == null || typeof t === "boolean"
    ? ""
    : typeof t !== "object"
      ? String(t)
      : Array.isArray(t)
        ? t.map(text).join(" ")
        : text(t.props?.children);
function harness({
  list = async () => [],
  flush = async () => {},
  online = true,
  role = "staff",
} = {}) {
  const state = [],
    refs = [],
    effects = [];
  let cursor = 0,
    refCursor = 0,
    first = true;
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState(v) {
      const i = cursor++;
      if (!(i in state)) state[i] = v;
      return [
        state[i],
        (v) => {
          state[i] = v;
        },
      ];
    },
    useRef(v) {
      const i = refCursor++;
      return refs[i] ?? (refs[i] = { current: v });
    },
    useCallback: (f) => f,
    useEffect: (f) => {
      if (first) effects.push(f);
    },
  };
  const mod = load("mobile/app/sync.tsx", (name) => {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name === "react-native")
      return {
        Pressable: "button",
        ScrollView: "scroll",
        View: "view",
        Text: "text",
        StyleSheet: { create: (v) => v },
      };
    if (name === "expo-router") return { Redirect: "redirect" };
    if (name === "@react-native-community/netinfo")
      return { useNetInfo: () => ({ isConnected: online }) };
    if (name === "@/lib/session")
      return {
        useSession: () => ({
          session: { user: { id: "A" } },
          workspaceReady: true,
          role,
          loading: false,
        }),
      };
    if (name === "@/lib/native-language") return { useNativeLanguage: () => ({ language: "en" }) };
    if (name === "@/lib/sync-copy") return copy;
    if (name === "@/lib/offline-queue") return { flush, listQueuedEvidence: list };
    throw Error(name);
  });
  const render = () => {
    cursor = 0;
    refCursor = 0;
    const tree = mod.default();
    first = false;
    return tree;
  };
  render();
  const cleanups = effects.map((f) => f());
  return { render, cleanup: () => cleanups.forEach((f) => f?.()) };
}
test("unreadable queue shows recovery instead of a false empty state", async () => {
  let fail = true;
  const h = harness({
    list: async () => {
      if (fail) throw Error("broken");
      return [];
    },
  });
  await tick();
  assert.match(text(h.render()), /could not be read/);
  assert.doesNotMatch(text(h.render()), /No records queued/);
  fail = false;
  const refresh = nodes(h.render()).find((n) => n.type === "button" && text(n) === "Refresh queue");
  refresh.props.onPress();
  await tick();
  assert.match(text(h.render()), /No records queued/);
  h.cleanup();
});
test("retry prevents duplicate uploads and preserves the visible conflict", async () => {
  let finish,
    calls = 0;
  const wait = new Promise((r) => {
    finish = r;
  });
  const h = harness({
    list: async () => [
      {
        id: "job-1",
        table: "checks",
        queuedAt: "2026-10-28T10:00:00Z",
        attempts: 2,
        state: "conflict",
      },
    ],
    flush: () => {
      calls++;
      return wait;
    },
  });
  await tick();
  const button = nodes(h.render()).find((n) => n.type === "button" && text(n) === "Retry uploads");
  const first = button.props.onPress();
  await button.props.onPress();
  assert.equal(calls, 1);
  finish();
  await first;
  assert.match(text(h.render()), /Conflict/);
  assert.match(text(h.render()), /job-1/);
  assert.doesNotMatch(text(h.render()), /No records queued/);
  h.cleanup();
});
test("offline and inspector access cannot trigger an upload retry", async () => {
  let calls = 0;
  const offline = harness({
    online: false,
    flush: async () => {
      calls++;
    },
  });
  await tick();
  const button = nodes(offline.render()).find(
    (n) => n.type === "button" && text(n) === "Retry uploads",
  );
  assert.equal(button.props.disabled, true);
  await button.props.onPress();
  assert.equal(calls, 0);
  offline.cleanup();
  const inspector = harness({ role: "inspector" });
  await tick();
  assert.match(text(inspector.render()), /read-only/);
  assert.equal(
    nodes(inspector.render()).filter((n) => n.type === "button" && text(n) === "Retry uploads")
      .length,
    0,
  );
  inspector.cleanup();
});
