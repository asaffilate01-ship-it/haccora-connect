import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/routes/app.alerts.tsx", import.meta.url), "utf8");

test("web alert reads and writes use recipient, organisation and premises scope", () => {
  const queries = source.split(/supabase\s*\.from\("alerts"\)/).slice(1);
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.match(query, /\.eq\("organization_id", organizationId\)/);
    assert.match(query, /\.eq\("user_id", userId\)/);
    assert.match(query, /\.or\(scope\)/);
  }
  assert.match(source, /location_id\.eq\.\$\{locationId\},location_id\.is\.null/);
  assert.match(source, /user\.role === "inspector"/);
});

test("alert filters and pagination use server totals rather than the current page", () => {
  assert.match(source, /const PAGE_SIZE = 50/);
  assert.match(source, /\.range\(offset, offset \+ PAGE_SIZE - 1\)/);
  assert.match(source, /if \(filter === "unread"\) query = query\.is\("read_at", null\)/);
  assert.match(source, /if \(filter === "critical"\) query = query\.eq\("severity", "critical"\)/);
  assert.match(source, /count: "exact", head: true/);
  assert.match(source, /unreadCount\.count === null/);
  assert.match(source, /list\.status === 416/);
  assert.match(source, /loadedKey === viewKey/);
  assert.doesNotMatch(source, /All clear/);
});

test("read status requires a confirmed write against visible unread records", () => {
  assert.match(source, /ids\.some\(\(id\) => !visibleIds\.has\(id\)\)/);
  assert.match(source, /\.in\("id", ids\)/);
  assert.match(source, /\.is\("read_at", null\)\s*\.select\("id,read_at"\)/);
  assert.match(source, /ids\.some\(\(id\) => !confirmed\.has\(id\)\)/);
  assert.match(source, /writeLock\.current/);
  assert.match(source, /Read status is not resolution/);
  assert.doesNotMatch(source, /markAllRead/);
});

test("web alert refreshes are coalesced and retired subscriptions are cleaned up", () => {
  assert.match(source, /createRefreshQueue\(load\)/);
  assert.match(source, /queue\.dispose\(\)/);
  assert.match(source, /request !== requestId\.current/);
  assert.match(source, /filter: \x60user_id=eq\.\$\{userId\}\x60/);
  assert.match(source, /status === "SUBSCRIBED"/);
  assert.match(source, /window\.removeEventListener\("online", scheduleRefresh\)/);
  assert.match(source, /removeChannel\(channel\)/);
});
