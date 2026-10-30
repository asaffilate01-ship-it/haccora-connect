import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";

function load(path, require = () => ({})) {
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
const input = load("mobile/lib/evidence-input.ts");
function queueHarness() {
  const index = new Map(),
    secure = new Map(),
    inserted = [];
  let user = "A",
    online = false,
    nextId = 0,
    networkFailure = false,
    storageFailure = false;
  let upload = async () => ({ error: null });
  let lookup = async () => ({ data: null, error: null });
  const filters = [];

  const modules = {
    "@react-native-async-storage/async-storage": {
      default: {
        getItem: async (k) => index.get(k) ?? null,
        setItem: async (k, v) => {
          index.set(k, v);
        },
      },
    },
    "expo-secure-store": {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device",
      getItemAsync: async (k) => secure.get(k) ?? null,
      setItemAsync: async (k, v) => {
        if (storageFailure) throw Error("storage");
        secure.set(k, v);
      },
      deleteItemAsync: async (k) => secure.delete(k),
    },
    "expo-crypto": { randomUUID: () => `job-${++nextId}` },
    "@react-native-community/netinfo": {
      default: {
        fetch: async () => {
          if (networkFailure) throw Error("offline");
          return { isConnected: online };
        },
        addEventListener: () => () => {},
      },
    },
    "react-native": { Platform: { OS: "ios" } },
    "./supabase": {
      supabase: {
        auth: {
          getSession: async () => ({
            data: { session: user ? { user: { id: user } } : null },
            error: null,
          }),
        },
        from: (table) => ({
          select: () => {
            const query = {
              eq: (key, value) => {
                filters.push([key, value]);
                return query;
              },
              maybeSingle: () => lookup(),
            };
            return query;
          },
          insert: async (payload) => {
            inserted.push({ table, payload });
            return upload(payload);
          },
        }),
      },
    },
  };
  const api = load("mobile/lib/offline-queue.ts", (name) => modules[name]);
  return {
    api,
    index,
    secure,
    inserted,
    filters,
    lookup: (fn) => {
      lookup = fn;
    },
    setUser: (v) => {
      user = v;
    },
    online: () => {
      online = true;
    },
    failNetwork: () => {
      networkFailure = true;
    },
    failStorage: () => {
      storageFailure = true;
    },
    upload: (fn) => {
      upload = fn;
    },
  };
}
const evidence = (user_id) => ({
  user_id,
  organization_id: "org-" + user_id,
  title: "Opening check",
});
test("decimal parser rejects blank/non-decimal values and preserves real zero", () => {
  for (const raw of ["", " ", "0x10", "1e2", "Infinity", "1,2,3", "--1"])
    assert.equal(input.decimalInput(raw), null, raw);
  for (const [raw, expected] of [
    ["0", 0],
    ["-18,5", -18.5],
    [" 4.2 ", 4.2],
    [".5", 0.5],
  ])
    assert.equal(input.decimalInput(raw), expected);
});
test("a durable local save succeeds even when background network sync fails", async () => {
  const h = queueHarness();
  h.failNetwork();
  assert.equal(await h.api.enqueue("checks", evidence("A")), "job-1");
  await assert.rejects(h.api.flush());
  assert.equal((await h.api.getQueueStatus()).pending, 1);
  assert.equal(h.secure.size, 1);
});
test("wrong-account enqueue and failed secure storage never report successful saving", async () => {
  const h = queueHarness();
  await assert.rejects(h.api.enqueue("checks", evidence("B")));
  assert.equal(h.secure.size, 0);
  h.failStorage();
  await assert.rejects(h.api.enqueue("checks", evidence("A")));
  assert.equal(h.index.size, 0);
});
test("uploads and status belong to the current account while other evidence is retained", async () => {
  const h = queueHarness();
  await h.api.enqueue("checks", evidence("A"));
  await h.api.flush();
  h.setUser("B");
  await h.api.enqueue("checks", evidence("B"));
  await h.api.flush();
  h.online();
  await h.api.flush();
  assert.equal(h.inserted.length, 1);
  assert.equal(h.inserted[0].payload.user_id, "B");
  assert.equal((await h.api.getQueueStatus()).pending, 0);
  h.setUser("A");
  assert.equal((await h.api.getQueueStatus()).pending, 1);
});
test("uniqueness conflicts and thrown requests retain evidence until a confirmed upload", async () => {
  const h = queueHarness();
  await h.api.enqueue("checks", evidence("A"));
  await h.api.flush();
  h.online();
  h.upload(async () => ({ error: { code: "23505" } }));
  await h.api.flush();
  assert.equal((await h.api.getQueueStatus()).failed, 1);
  h.upload(async () => {
    throw Error("lost response");
  });
  await h.api.flush();
  assert.equal((await h.api.getQueueStatus()).pending, 1);
  h.upload(async () => ({ error: null }));
  await h.api.flush();
  assert.equal((await h.api.getQueueStatus()).pending, 0);
  assert.equal(h.secure.size, 0);
});
test("an account change during a batch prevents the next account-mismatched upload", async () => {
  const h = queueHarness();
  await h.api.enqueue("checks", evidence("A"));
  await h.api.enqueue("checks", evidence("A"));
  await h.api.flush();
  h.online();
  h.upload(async () => {
    h.setUser("B");
    return { error: null };
  });
  await h.api.flush();
  assert.equal(h.inserted.length, 1);
  h.setUser("A");
  assert.equal((await h.api.getQueueStatus()).pending, 1);
});

test("lost-response replay clears only after a scoped exact server match", async () => {
  const h = queueHarness();
  await h.api.enqueue("checks", { ...evidence("A"), answers: { b: [1, null], a: true } });
  await h.api.flush();
  h.online();
  h.upload(async () => ({ error: { code: "23505" } }));
  h.lookup(async () => ({
    data: { ...h.inserted.at(-1).payload, id: "server-id", answers: { a: true, b: [1, null] } },
    error: null,
  }));
  await h.api.flush();
  assert.equal((await h.api.getQueueStatus()).pending, 0);
  assert.equal(h.secure.size, 0);
  assert.deepEqual(h.filters, [
    ["idempotency_key", "job-1"],
    ["organization_id", "org-A"],
    ["user_id", "A"],
  ]);
});

test("mismatched, missing, inaccessible and failed lookups retain conflicts", async () => {
  for (const scenario of [
    "changed",
    "missing",
    "forbidden",
    "throws",
    "wrong-org",
    "wrong-user",
    "wrong-key",
    "missing-field",
    "type-changed",
  ]) {
    const h = queueHarness();
    await h.api.enqueue("checks", { ...evidence("A"), value: 4 });
    await h.api.flush();
    h.online();
    h.upload(async () => ({ error: { code: "23505" } }));
    h.lookup(async () => {
      if (scenario === "throws") throw Error("network");
      const data = { ...h.inserted.at(-1).payload };
      if (scenario === "changed") data.title = "Different evidence";
      if (scenario === "wrong-org") data.organization_id = "org-B";
      if (scenario === "wrong-user") data.user_id = "B";
      if (scenario === "wrong-key") data.idempotency_key = "other";
      if (scenario === "missing-field") delete data.title;
      if (scenario === "type-changed") data.value = "4";
      return {
        data: scenario === "missing" ? null : data,
        error: scenario === "forbidden" ? { code: "42501" } : null,
      };
    });
    await h.api.flush();
    assert.equal((await h.api.listQueuedEvidence())[0].state, "conflict", scenario);
    assert.equal(h.secure.size, 1, scenario);
  }
});

test("account change during verification cannot acknowledge evidence", async () => {
  const h = queueHarness();
  await h.api.enqueue("checks", evidence("A"));
  await h.api.flush();
  h.online();
  h.upload(async () => ({ error: { code: "23505" } }));
  h.lookup(async () => {
    h.setUser("B");
    return { data: h.inserted.at(-1).payload, error: null };
  });
  await h.api.flush();
  h.setUser("A");
  assert.equal((await h.api.getQueueStatus()).pending, 1);
});

const nodes = (t) =>
  !t || typeof t !== "object"
    ? []
    : Array.isArray(t)
      ? t.flatMap(nodes)
      : [t, ...nodes(t.props?.children)];
function formHarness(file, enqueue) {
  const values = [],
    refs = [],
    alerts = [];
  let cursor = 0,
    refCursor = 0;
  const jsx = (type, props) => ({ type, props });
  let copy = {};
  try {
    copy = load("mobile/lib/native-copy.ts").nativeCopy.en;
  } catch {}
  const mod = load("mobile/app/" + file + ".tsx", (name) => {
    if (name === "react")
      return {
        useState: (v) => {
          const i = cursor++;
          if (!(i in values)) values[i] = v;
          return [
            values[i],
            (next) => {
              values[i] = next;
            },
          ];
        },
        useRef: (v) => {
          const i = refCursor++;
          return refs[i] ?? (refs[i] = { current: v });
        },
      };
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name === "react-native")
      return {
        Alert: { alert: (...v) => alerts.push(v) },
        Pressable: "button",
        TextInput: "input",
        Text: "text",
        View: "view",
        StyleSheet: { create: (v) => v },
      };
    if (name === "expo-router") return { Redirect: "redirect" };
    if (name === "@/lib/session")
      return {
        useSession: () => ({
          session: { user: { id: "A" } },
          workspaceReady: true,
          organizationId: "org-A",
          locationId: "site-A",
          role: "staff",
          loading: false,
        }),
      };
    if (name === "@/lib/native-language") return { useNativeLanguage: () => ({ copy }) };
    if (name === "@/lib/evidence-input") return input;
    if (name === "@/lib/offline-queue") return { enqueue };
    throw Error("Unexpected dependency " + name);
  });
  const render = () => {
    cursor = 0;
    refCursor = 0;
    return mod.default();
  };
  return {
    render,
    alerts,
    fields: () => nodes(render()).filter((n) => n.type === "input"),
    button: () => nodes(render()).find((n) => n.type === "button"),
  };
}
test("temperature form rejects blank reading/limits but queues an explicit zero", async () => {
  const jobs = [];
  const h = formHarness("temperature", async (table, payload) => {
    jobs.push({ table, payload });
  });
  h.fields()[0].props.onChangeText("Fridge");
  await h.button().props.onPress();
  assert.equal(jobs.length, 0);
  h.fields()[3].props.onChangeText("0");
  h.fields()[1].props.onChangeText(" ");
  await h.button().props.onPress();
  assert.equal(jobs.length, 0);
  h.fields()[1].props.onChangeText("0");
  await h.button().props.onPress();
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].payload.reading, 0);
});
test("checks suppress duplicate taps and retain input after storage failure", async () => {
  let reject,
    calls = 0;
  const promise = new Promise((_, r) => {
    reject = r;
  });
  const h = formHarness("checks", () => {
    calls++;
    return promise;
  });
  h.fields()[0].props.onChangeText("Opening");
  const button = h.button();
  const first = button.props.onPress();
  await button.props.onPress();
  assert.equal(calls, 1);
  reject(Error("storage"));
  await first;
  assert.equal(h.fields()[0].props.value, "Opening");
  assert.equal(h.button().props.disabled, false);
  assert.match(h.alerts.at(-1)[0], /Not saved/);
});

test("cleaning and equipment evidence use their own author fields", async () => {
  const h = queueHarness();
  await h.api.enqueue("cleaning_completions", { completed_by: "A", organization_id: "org-A" });
  await h.api.enqueue("asset_events", { recorded_by: "A", organization_id: "org-A" });
  await h.api.flush();
  await assert.rejects(
    h.api.enqueue("asset_events", { recorded_by: "B", organization_id: "org-B" }),
  );
  assert.equal((await h.api.getQueueStatus()).pending, 2);
});

test("recovery summaries expose only current-account metadata", async () => {
  const h = queueHarness();
  await h.api.enqueue("checks", { ...evidence("A"), note: "private evidence" });
  await h.api.flush();
  const [item] = await h.api.listQueuedEvidence();
  assert.equal(item.id, "job-1");
  assert.equal(item.state, "pending");
  assert.equal(item.payload, undefined);
  assert.equal(item.note, undefined);
  h.setUser("B");
  assert.equal((await h.api.listQueuedEvidence()).length, 0);
});
test("duplicate or malformed index data fails closed without rewriting storage", async () => {
  for (const value of ['["job-1","job-1"]', "{}", "[null]", "broken", ""]) {
    const h = queueHarness();
    h.index.set("haccora-offline-queue-v1", value);
    await assert.rejects(h.api.listQueuedEvidence());
    await assert.rejects(h.api.enqueue("checks", evidence("A")));
    assert.equal(h.index.get("haccora-offline-queue-v1"), value);
  }
});
test("damaged or mismatched secure records cannot be uploaded or discarded", async () => {
  for (const mutate of [
    (job) => {
      job.payload.idempotency_key = "other";
    },
    (job) => {
      job.table = "users";
    },
    (job) => {
      job.attempts = -1;
    },
    (job) => {
      job.queuedAt = "invalid";
    },
  ]) {
    const h = queueHarness();
    await h.api.enqueue("checks", evidence("A"));
    await h.api.flush();
    const key = "haccora-offline-job-job-1";
    const job = JSON.parse(h.secure.get(key));
    mutate(job);
    const damaged = JSON.stringify(job);
    h.secure.set(key, damaged);
    h.online();
    await assert.rejects(h.api.flush());
    assert.equal(h.inserted.length, 0);
    assert.equal(h.secure.get(key), damaged);
    assert.equal(h.index.get("haccora-offline-queue-v1"), '["job-1"]');
  }
});
test("conflict summaries use a safe state instead of raw provider error text", async () => {
  const h = queueHarness();
  await h.api.enqueue("checks", evidence("A"));
  await h.api.flush();
  h.online();
  h.upload(async () => ({ error: { code: "23505", message: "sensitive backend context" } }));
  await h.api.flush();
  const [item] = await h.api.listQueuedEvidence();
  assert.equal(item.state, "conflict");
  assert.equal(item.attempts, 1);
  assert.doesNotMatch(JSON.stringify(item), /sensitive|lastError/);
});

test("large retry counts never discard failed evidence", async () => {
  const h = queueHarness();
  await h.api.enqueue("checks", evidence("A"));
  await h.api.flush();
  const key = "haccora-offline-job-job-1";
  const job = JSON.parse(h.secure.get(key));
  job.attempts = 10000;
  h.secure.set(key, JSON.stringify(job));
  h.online();
  h.upload(async () => ({ error: { code: "network" } }));
  await h.api.flush();
  assert.equal((await h.api.listQueuedEvidence())[0].attempts, 10001);
  assert.equal((await h.api.getQueueStatus()).pending, 1);
});

test("Postgres UTC formatting confirms the same instant without truncating precision", async () => {
  for (const [actual, pending] of [
    ["2026-10-30T12:00:00.12+00:00", 0],
    ["2026-10-30T12:00:00.120001+00:00", 1],
  ]) {
    const h = queueHarness();
    await h.api.enqueue("temperature_logs", {
      ...evidence("A"),
      logged_at: "2026-10-30T12:00:00.120Z",
    });
    await h.api.flush();
    h.online();
    h.upload(async () => ({ error: { code: "23505" } }));
    h.lookup(async () => ({
      data: { ...h.inserted.at(-1).payload, logged_at: actual },
      error: null,
    }));
    await h.api.flush();
    assert.equal((await h.api.getQueueStatus()).pending, pending);
  }
});
