import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const calendar = {};
vm.runInNewContext(compile(await read("supabase/functions/_shared/inspection-period.ts")), {
  exports: calendar,
});
const route = await read("supabase/functions/omniqora-platform/index.ts");
const start = route.indexOf("async function evidence(");
const end = route.indexOf("async function sha256Hex", start);
assert.ok(start >= 0 && end > start);
const exports = {};
vm.runInNewContext(compile(route.slice(start, end) + "\nexport { evidence };"), {
  exports,
  ...calendar,
  COUNTRY_CODE: "GB",
  LOCALE: "en-GB",
  TIMEZONE: "Europe/London",
});

function fakeDatabase(results = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      const query = {
        then(resolve, reject) {
          const result = results[table] ?? { count: 4, error: null };
          return (
            result === "throw" ? Promise.reject(new Error("offline")) : Promise.resolve(result)
          ).then(resolve, reject);
        },
      };
      for (const method of ["select", "eq", "neq", "gte", "lt", "lte", "in"]) {
        query[method] = (...args) => {
          calls.push([table, method, ...args]);
          return query;
        };
      }
      return query;
    },
  };
}

test("AI evidence uses exact confirmed UK calendar counts and current statuses", async () => {
  const db = fakeDatabase({ checks: { count: 0, error: null } });
  const result = await exports.evidence(
    db,
    "synthetic-organisation",
    "actor_visible_organization",
    new Date("2026-03-29T12:00:00Z"),
  );
  assert.equal(result.complete, true);
  assert.equal(result.openChecks, 0);
  assert.equal(result.calendarDate, "2026-03-29");
  assert.equal(result.temperatureWindow.from, "2026-03-23");
  assert.equal(result.temperatureWindow.to, "2026-03-29");
  assert.equal(result.scope, "actor_visible_organization");
  const has = (expected) =>
    db.calls.some((call) => JSON.stringify(call) === JSON.stringify(expected));
  assert.ok(has(["checks", "gte", "created_at", "2026-03-29T00:00:00.000Z"]));
  assert.ok(has(["checks", "lt", "created_at", "2026-03-29T23:00:00.000Z"]));
  assert.ok(has(["temperature_logs", "in", "status", ["out_of_range", "alert"]]));
  assert.ok(has(["site_safe_methods", "eq", "status", "active"]));
  assert.ok(has(["training_records", "lte", "certificate_valid_to", "2026-04-28"]));
  assert.equal(
    db.calls.filter(
      ([, method, field, value]) =>
        method === "eq" && field === "organization_id" && value === "synthetic-organisation",
    ).length,
    6,
  );
});

test("missing, errored or invalid counts stay unknown instead of becoming zero", async () => {
  const result = await exports.evidence(
    fakeDatabase({
      checks: { count: null, error: null },
      corrective_actions: { count: 0, error: { message: "unavailable" } },
      temperature_logs: "throw",
      incidents: { count: -1, error: null },
      training_records: { count: 1.5, error: null },
      site_safe_methods: { count: 0, error: null },
    }),
    "synthetic-organisation",
    "connected_organization",
    new Date("2026-11-27T12:00:00Z"),
  );
  assert.equal(result.complete, false);
  assert.equal(result.unavailableEvidence.length, 5);
  assert.equal(result.openChecks, null);
  assert.equal(result.openCorrectiveActions, null);
  assert.equal(result.temperatureExceptions7d, null);
  assert.equal(result.openIncidents, null);
  assert.equal(result.trainingDue30d, null);
  assert.equal(result.adoptedSafeMethods, 0);
});

test("user-initiated AI reviews use caller RLS and reject incomplete evidence before dispatch", () => {
  const block = route.slice(
    route.indexOf('if(i.action==="ai_start")'),
    route.indexOf('const local=await db.from("omniqora_ai_runs")'),
  );
  assert.match(route, /return\{client,user,organizationId,role\}/);
  assert.match(block, /evidence\(a\.client,a\.organizationId,"actor_visible_organization"\)/);
  assert.ok(block.indexOf("if(!ev.complete)") < block.indexOf("await intelligence("));
  assert.match(block, /evidence_unavailable/);
  assert.match(block, /zero is not proof of absence/);
  assert.match(block, /reviewRequired:true/);
});
