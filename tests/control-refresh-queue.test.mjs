import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/refresh-queue.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { createRefreshQueue } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("a burst during a slow read triggers one serial trailing refresh", async () => {
  const gate = deferred();
  let calls = 0;
  let concurrent = 0;
  let peak = 0;
  const queue = createRefreshQueue(async () => {
    calls += 1;
    concurrent += 1;
    peak = Math.max(peak, concurrent);
    if (calls === 1) await gate.promise;
    concurrent -= 1;
  });
  const first = queue.request();
  await Promise.resolve();
  assert.equal(calls, 1);
  for (let i = 0; i < 100; i++) assert.equal(queue.request(), first);
  gate.resolve();
  await first;
  assert.equal(calls, 2);
  assert.equal(peak, 1);
});

test("disposing a queue suppresses trailing and future requests", async () => {
  const gate = deferred();
  let calls = 0;
  const queue = createRefreshQueue(async () => {
    calls += 1;
    await gate.promise;
  });
  const first = queue.request();
  await Promise.resolve();
  queue.request();
  queue.dispose();
  gate.resolve();
  await first;
  await queue.request();
  assert.equal(calls, 1);
});

test("the queue recovers after a failed read", async () => {
  let calls = 0;
  const queue = createRefreshQueue(async () => {
    calls += 1;
    if (calls === 1) throw new Error("offline");
  });
  await assert.rejects(queue.request(), /offline/);
  await queue.request();
  assert.equal(calls, 2);
});

test("control centre uses the shared queue and reports live connection failures", async () => {
  const route = await readFile(
    new URL("../src/routes/app.control-centre.tsx", import.meta.url),
    "utf8",
  );
  assert.match(route, /createRefreshQueue\(load\)/);
  assert.match(route, /queue\.dispose\(\)/);
  assert.match(route, /refreshQueue\.current\?\.request\(\)/);
  assert.match(route, /status === "SUBSCRIBED"/);
  assert.match(route, /status === "CHANNEL_ERROR"/);
  assert.match(route, /window\.removeEventListener\("online", scheduleRefresh\)/);
  assert.match(route, /filter: \x60organization_id=eq\.\$\{organizationId\}\x60/);
});
