import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../mobile/app/alerts.tsx", import.meta.url), "utf8");

test("native alert inbox reads and updates are scoped to personal site alerts", () => {
  const queries = source.split(/supabase\s*\.from\("alerts"\)/).slice(1);
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.match(query, /\.eq\("organization_id", organizationId\)/);
    assert.match(query, /\.eq\("user_id", userId\)/);
    assert.match(query, /\.or\(/);
  }
  assert.match(source, /location_id\.eq\.\$\{locationId\},location_id\.is\.null/);
  assert.match(source, /role === "inspector"/);
  assert.match(source, /key=\{/);
});

test("alert filters and counts are evaluated on the server, not a capped local sample", () => {
  assert.match(source, /if \(filter === "unread"\) query = query\.is\("read_at", null\)/);
  assert.match(source, /if \(filter === "critical"\) query = query\.eq\("severity", "critical"\)/);
  assert.match(source, /count: "exact", head: true/);
  assert.match(source, /Showing \{rows\.length\} of \{total\}/);
  assert.match(source, /list\.count === null/);
  assert.match(source, /count\.count === null/);
  assert.match(source, /const available = !refreshing && !error && loadedKey === viewKey/);
  assert.doesNotMatch(source, /All clear/);
});

test("marking read is bounded by visible unread IDs and confirmed by returned records", () => {
  assert.match(source, /ids\.some\(\(id\) => !visibleIds\.has\(id\)\)/);
  assert.match(source, /\.in\("id", ids\)/);
  assert.match(source, /\.is\("read_at", null\)\s*\.select\("id,read_at"\)/);
  assert.match(source, /ids\.some\(\(id\) => !confirmed\.has\(id\)\)/);
  assert.match(source, /writeLock\.current/);
  assert.match(source, /Not all read statuses were confirmed/);
  assert.match(source, /Read status is not resolution/);
  assert.doesNotMatch(source, /markAllRead/);
});

test("native alert subscriptions recover on focus and clean up when leaving the screen", () => {
  assert.match(source, /useFocusEffect\(/);
  assert.match(source, /filter: \x60user_id=eq\.\$\{userId\}\x60/);
  assert.match(source, /if \(!active \|\| !focused\.current\) return/);
  assert.match(source, /clearTimeout\(timer\)/);
  assert.match(source, /subscription\.remove\(\)/);
  assert.match(source, /removeChannel\(channel\)/);
  assert.match(source, /Live updates unavailable/);
});
