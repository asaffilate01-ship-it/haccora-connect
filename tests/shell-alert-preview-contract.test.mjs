import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("header alert preview counts and retrieves only the current recipient's site alerts", async () => {
  const source = await read("src/lib/use-alert-preview.ts");
  assert.match(source, /count: "exact"/);
  assert.match(source, /\.eq\("organization_id", organizationId\)/);
  assert.match(source, /\.eq\("user_id", userId\)/);
  assert.match(source, /location_id\.eq\.\$\{locationId\},location_id\.is\.null/);
  assert.match(source, /\.is\("read_at", null\)/);
  assert.match(source, /\.limit\(8\)/);
  assert.match(source, /total: result\.count/);
});

test("alert preview discards stale responses and suppresses unverified counts", async () => {
  const source = await read("src/lib/use-alert-preview.ts");
  assert.match(source, /preview\?\.key === key/);
  assert.match(source, /if \(!active\) return/);
  assert.match(source, /result\.count === null/);
  assert.match(source, /!navigator\.onLine/);
  assert.match(source, /createRefreshQueue/);
  assert.match(source, /queue\.dispose\(\)/);
  assert.match(source, /filter: \x60user_id=eq\.\$\{userId\}\x60/);
  assert.match(source, /window\.removeEventListener\("online", schedule\)/);
});

test("header uses authorised destinations and opens the personal alert inbox", async () => {
  const source = await read("src/routes/app.tsx");
  const preview = source.slice(
    source.indexOf("const canViewAlerts"),
    source.indexOf("if (!hydrated || !user"),
  );
  assert.match(preview, /canAccess\(user\.role, "alerts", user\.inspectorScopes\)/);
  assert.match(preview, /visibleFlat\.some\(\(item\) => item\.to === candidate\)/);
  assert.match(source, /\{canViewAlerts && \(/);
  assert.match(source, /alertPreview\.total > 99/);
  const bell = source.slice(
    source.indexOf("{/* Notifications */}"),
    source.indexOf("{/* User menu */}"),
  );
  assert.match(bell, /to="\/app\/alerts"/);
  assert.doesNotMatch(bell, /to="\/app\/inspection"/);
  assert.match(bell, /Unread alerts unavailable/);
  assert.match(bell, /fixed inset-x-4/);
});
