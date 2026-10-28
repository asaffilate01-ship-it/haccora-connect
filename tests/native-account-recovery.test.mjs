import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";

function moduleAt(path, require) {
  const exports = {};
  const source = readFileSync(new URL("../" + path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, { exports, require, console });
  return exports;
}
const cache = moduleAt("mobile/lib/workspace-cache.ts", () => ({}));
const copy = {
  loginTitle: "Sign in",
  email: "Email",
  password: "Password",
  signIn: "Sign in",
  signingIn: "Signing in…",
  loginError: "Sign in failed",
};
const tick = async () => {
  for (let i = 0; i < 15; i++) await Promise.resolve();
};
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
function harness(
  path,
  {
    initial = null,
    rpc = async () => ({ data: null, error: true }),
    storage = new Map(),
    signIn = async () => ({ error: null }),
    brokenStorage = false,
    screenSession = { session: null },
  } = {},
) {
  const states = [],
    refs = [],
    effects = [];
  let cursor = 0,
    refCursor = 0,
    first = true,
    authChange;
  const react = {
    createContext: () => ({ Provider: "Provider" }),
    useContext: () => ({}),
    useState(initial) {
      const i = cursor++;
      if (!(i in states)) states[i] = initial;
      return [
        states[i],
        (v) => {
          states[i] = typeof v === "function" ? v(states[i]) : v;
        },
      ];
    },
    useRef(initial) {
      return refs[refCursor++] ?? (refs[refCursor - 1] = { current: initial });
    },
    useEffect(fn) {
      if (first) effects.push(fn);
    },
  };
  const supabase = {
    rpc,
    auth: {
      getSession: async () => ({ data: { session: initial } }),
      onAuthStateChange(fn) {
        authChange = fn;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signInWithPassword: signIn,
    },
  };
  const jsx = (type, props) => ({ type, props });
  const required = (name) => {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name === "./workspace-cache") return cache;
    if (name === "./supabase" || name === "@/lib/supabase") return { supabase };
    if (name === "@/lib/session") return { useSession: () => screenSession };
    if (name === "@/lib/native-language")
      return { useNativeLanguage: () => ({ copy, language: "en", setLanguage() {} }) };
    if (name === "@react-native-async-storage/async-storage")
      return {
        default: {
          async getItem(k) {
            if (brokenStorage) throw Error("storage");
            return storage.get(k) ?? null;
          },
          async setItem(k, v) {
            if (brokenStorage) throw Error("storage");
            storage.set(k, v);
          },
          async removeItem(k) {
            if (brokenStorage) throw Error("storage");
            storage.delete(k);
          },
        },
      };
    if (name === "./offline-queue")
      return { flush: async () => {}, startOfflineSync: () => () => {} };
    if (name === "./push")
      return {
        configureNotificationNavigation: () => () => {},
        syncPushNotifications: async () => {},
        registerPushNotifications: async () => {},
      };
    if (name === "expo-router") return { Redirect: "Redirect", router: { replace() {} } };
    if (name === "react-native")
      return {
        Pressable: "Pressable",
        View: "View",
        Text: "Text",
        TextInput: "TextInput",
        StyleSheet: { create: (x) => x },
      };
    return {};
  };
  const mod = moduleAt(path, required);
  const component = mod.SessionProvider ?? mod.default;
  const render = () => {
    cursor = 0;
    refCursor = 0;
    const tree = component({ children: null });
    first = false;
    return tree;
  };
  render();
  const cleanups = effects.map((f) => f());
  return {
    render,
    value: () => render().props.value,
    auth: (next) => authChange("SIGNED_IN", next),
    cleanup: () => cleanups.forEach((f) => f?.()),
    storage,
  };
}
const user = (id) => ({ user: { id, email: id + "@example.test", user_metadata: {} } });
const live = (id) => ({
  data: { organization_id: "org-" + id, location_id: "site-" + id, role: "staff" },
  error: null,
});
const nodes = (t) =>
  !t || typeof t !== "object"
    ? []
    : Array.isArray(t)
      ? t.flatMap(nodes)
      : [t, ...nodes(t.props?.children)];
const text = (t) =>
  t == null
    ? ""
    : typeof t !== "object"
      ? String(t)
      : Array.isArray(t)
        ? t.map(text).join(" ")
        : text(t.props?.children);

test("cache rejects another account, malformed and legacy records", () => {
  assert.equal(
    cache.decodeWorkspaceCache(
      JSON.stringify({ userId: "A", context: { organizationId: "org-A" } }),
      "B",
    ),
    null,
  );
  for (const raw of ["{", "null", "[]", JSON.stringify({ organizationId: "legacy" })])
    assert.equal(cache.decodeWorkspaceCache(raw, "A"), null);
  assert.notEqual(cache.workspaceCacheKey("A"), cache.workspaceCacheKey("B"));
});
test("offline startup cannot restore another user's workspace", async () => {
  const storage = new Map([
    ["haccora-workspace-context-v1", JSON.stringify({ organizationId: "old" })],
    [
      cache.workspaceCacheKey("A"),
      JSON.stringify({ userId: "A", context: { organizationId: "org-A" } }),
    ],
  ]);
  const h = harness("mobile/lib/session.tsx", { initial: user("B"), storage });
  await tick();
  assert.equal(h.value().workspaceReady, false);
  assert.equal(h.value().workspaceError, true);
  assert.equal(h.value().loading, false);
  assert.equal(h.value().organizationId, null);
  h.cleanup();
});
test("same-account offline context survives but platform privilege does not", async () => {
  const storage = new Map([
    [
      cache.workspaceCacheKey("A"),
      JSON.stringify({
        userId: "A",
        context: { organizationId: "org-A", role: "staff", platformRole: "owner" },
      }),
    ],
  ]);
  const h = harness("mobile/lib/session.tsx", { initial: user("A"), storage });
  await tick();
  assert.equal(h.value().workspaceReady, true);
  assert.equal(h.value().organizationId, "org-A");
  assert.ok(!h.value().platformRole);
  h.cleanup();
});
test("late workspace responses cannot overwrite a switched account or signed-out state", async () => {
  const slow = deferred();
  let active = "A";
  const h = harness("mobile/lib/session.tsx", {
    initial: user("A"),
    rpc: (name) =>
      name === "get_my_platform_context"
        ? Promise.resolve({ data: null })
        : active === "A"
          ? slow.promise
          : Promise.resolve(live("B")),
  });
  await tick();
  active = "B";
  h.auth(user("B"));
  await tick();
  assert.equal(h.value().organizationId, "org-B");
  slow.resolve(live("A"));
  await tick();
  assert.equal(h.value().organizationId, "org-B");
  h.auth(null);
  await tick();
  assert.equal(h.value().workspaceReady, false);
  assert.equal(h.value().organizationId, null);
  h.cleanup();
});
test("storage failure cannot strand a valid live workspace in loading", async () => {
  const h = harness("mobile/lib/session.tsx", {
    initial: user("A"),
    rpc: async () => live("A"),
    brokenStorage: true,
  });
  await tick();
  assert.equal(h.value().workspaceReady, true);
  assert.equal(h.value().loading, false);
  assert.equal(h.value().workspaceError, false);
  h.cleanup();
});
test("rejected sign-in recovers and duplicate taps submit only once", async () => {
  const pending = deferred();
  let calls = 0;
  const h = harness("mobile/app/login.tsx", {
    signIn: () => {
      calls++;
      return pending.promise;
    },
  });
  let inputs = nodes(h.render()).filter((n) => n.type === "TextInput");
  inputs[0].props.onChangeText("staff@example.test");
  inputs[1].props.onChangeText("test-only-password");
  const button = nodes(h.render()).find(
    (n) => n.type === "Pressable" && n.props.onPress && n.props.disabled === false,
  );
  const first = button.props.onPress();
  await button.props.onPress();
  assert.equal(calls, 1);
  pending.reject(Error("network unavailable"));
  await first;
  assert.match(text(h.render()), /Sign in failed/);
  assert.equal(
    nodes(h.render()).find(
      (n) => n.type === "Pressable" && n.props.accessibilityState?.busy !== undefined,
    ).props.accessibilityState.busy,
    false,
  );
  h.cleanup();
});

test("rejected workspace requests settle into retry state", async () => {
  const h = harness("mobile/lib/session.tsx", {
    initial: user("A"),
    rpc: async () => {
      throw Error("offline");
    },
  });
  await tick();
  assert.equal(h.value().workspaceReady, false);
  assert.equal(h.value().workspaceError, true);
  assert.equal(h.value().loading, false);
  h.cleanup();
});
test("workspace failure hides creation fields and exposes a retry", () => {
  let retries = 0;
  const h = harness("mobile/app/onboarding.tsx", {
    screenSession: {
      session: user("A"),
      loading: false,
      workspaceReady: false,
      workspaceError: true,
      refreshWorkspace: () => {
        retries++;
      },
    },
  });
  const tree = h.render();
  assert.equal(nodes(tree).filter((n) => n.type === "TextInput").length, 0);
  const retry = nodes(tree).find((n) => n.type === "Pressable");
  retry.props.onPress();
  assert.equal(retries, 1);
  h.cleanup();
});

test("UK native onboarding cannot offer revoked self-service creation", () => {
  const h = harness("mobile/app/onboarding.tsx", {
    screenSession: {
      session: user("A"),
      loading: false,
      workspaceReady: false,
      workspaceError: false,
    },
  });
  assert.match(text(h.render()), /Approval-only access/);
  assert.equal(nodes(h.render()).filter((n) => n.type === "TextInput").length, 0);
  assert.doesNotMatch(
    readFileSync(new URL("../mobile/app/onboarding.tsx", import.meta.url), "utf8"),
    /bootstrap_my_organization/,
  );
  h.cleanup();
});
