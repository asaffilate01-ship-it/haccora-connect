import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
const load = (path, require = () => ({})) => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL("../" + path, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    { exports, require, URL, Date, Intl },
  );
  return exports;
};
const day = load("src/lib/operational-day.ts");
const lib = load("src/lib/supplier-document-review.ts", () => day);
const row = {
  id: "doc",
  title: "Supplier certificate",
  expires_at: "2026-12-31",
  issued_on: "2026-01-01",
  version: "1",
  storage_path: "org/file.pdf",
  file_url: null,
};
const flags = (patch) =>
  Array.from(lib.supplierDocumentFlags({ ...row, ...patch }, "2026-10-30", "2026-11-29"));
test("metadata distinguishes expired, upcoming, missing and malformed dates", () => {
  assert.deepEqual(flags({}), []);
  assert.ok(flags({ expires_at: "2026-10-29" }).includes("expired"));
  assert.ok(flags({ expires_at: "2026-10-30" }).includes("expiring"));
  assert.ok(flags({ expires_at: "2026-11-29" }).includes("expiring"));
  assert.ok(flags({ expires_at: null }).includes("missing-expiry"));
  assert.ok(flags({ expires_at: "2026-02-30" }).includes("invalid-date"));
  assert.ok(flags({ issued_on: "2027-01-01" }).includes("date-order"));
  assert.ok(flags({ issued_on: "2027-01-01" }).includes("future-issued"));
});
test("database timestamp expiry is accepted and offsets use the operational calendar", () => {
  assert.ok(!flags({ expires_at: "2026-12-31T23:59:59+00:00" }).includes("invalid-date"));
  assert.ok(flags({ expires_at: "2026-10-29T12:00:00Z" }).includes("expired"));
  assert.ok(flags({ expires_at: "2026-02-30T12:00:00Z" }).includes("invalid-date"));
});
test("source presence never treats unsafe links as usable evidence", () => {
  for (const file_url of [
    null,
    "javascript:alert(1)",
    "http://example.com",
    "https://user:pass@example.com",
  ])
    assert.ok(flags({ storage_path: null, file_url }).includes("missing-source"));
  assert.ok(
    !flags({ storage_path: null, file_url: "https://example.com/spec.pdf" }).includes(
      "missing-source",
    ),
  );
  assert.ok(flags({ version: " " }).includes("missing-version"));
});
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
function harness(respond = () => ({ data: [row], error: null })) {
  const states = [],
    refs = [],
    effects = [],
    queries = [];
  let i = 0,
    j = 0,
    first = true,
    user = { id: "staff", organizationId: "org", locationId: "site" };
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState: (v) => {
      const n = i++;
      if (!(n in states)) states[n] = v;
      return [
        states[n],
        (x) => {
          states[n] = typeof x === "function" ? x(states[n]) : x;
        },
      ];
    },
    useRef: (v) => {
      const n = j++;
      return refs[n] ?? (refs[n] = { current: v });
    },
    useCallback: (f) => f,
    useEffect: (f) => {
      if (first) effects.push(f);
    },
  };
  const mod = load("src/components/SupplierDocumentReview.tsx", (name) => {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name === "@tanstack/react-router") return { Link: "link" };
    if (name === "@/lib/auth") return { useAuth: () => ({ user }) };
    if (name === "@/lib/i18n") return { useI18n: () => ({ lang: "en" }) };
    if (name === "@/lib/operational-day") return day;
    if (name === "@/lib/supplier-document-review") return lib;
    if (name.includes("supabase"))
      return {
        supabase: {
          from: (table) => {
            assert.equal(table, "documents");
            const filters = [];
            queries.push(filters);
            const q = new Proxy(
              {},
              {
                get: (_, k) =>
                  k === "then"
                    ? (yes, no) => Promise.resolve().then(respond).then(yes, no)
                    : (...args) => {
                        filters.push([k, ...args]);
                        return q;
                      },
              },
            );
            return q;
          },
        },
      };
    throw Error(name);
  });
  const render = () => {
    i = 0;
    j = 0;
    const tree = mod.SupplierDocumentReview();
    first = false;
    return tree;
  };
  render();
  effects.forEach((f) => f());
  return {
    render,
    queries,
    setUser: (v) => {
      user = v;
    },
  };
}
test("failed requests show retry feedback instead of an empty register", async () => {
  for (const respond of [
    () => ({ data: null, error: {} }),
    () => Promise.reject(Error("offline")),
  ]) {
    const h = harness(respond);
    await tick();
    assert.match(text(h.render()), /could not be loaded/);
    assert.doesNotMatch(text(h.render()), /No supplier documents/);
  }
});
test("review queries only active tenant/site supplier documents with pagination", async () => {
  const h = harness();
  await tick();
  const q = h.queries[0];
  for (const [key, value] of [
    ["organization_id", "org"],
    ["location_id", "site"],
    ["category", "supplier"],
  ])
    assert.ok(q.some((f) => f[0] === "eq" && f[1] === key && f[2] === value));
  assert.ok(q.some((f) => f[0] === "is" && f[1] === "archived_at" && f[2] === null));
  assert.ok(q.some((f) => f[0] === "range" && f[1] === 0 && f[2] === 49));
  assert.match(text(h.render()), /Supplier certificate/);
  assert.equal(
    nodes(h.render()).filter((n) => n.type === "link" && n.props.to === "/app/documents").length,
    1,
  );
  h.setUser({ id: "other", organizationId: "other", locationId: "other" });
  assert.doesNotMatch(text(h.render()), /Supplier certificate/);
});
