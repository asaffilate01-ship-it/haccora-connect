import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const migration = await read("../supabase/migrations/20260806008000_qr_asset_history.sql");
const webList = await read("../src/routes/app.assets.tsx");
const webDetail = await read("../src/routes/app.assets.$assetId.tsx");
const nativeScan = await read("../mobile/app/scan-asset.tsx");
const nativeDetail = await read("../mobile/app/assets/[assetId].tsx");
const invitation = await read("../supabase/functions/inspector-invite/index.ts");
const notifications = await read("../supabase/functions/notification-dispatch/index.ts");

test("equipment QR tokens are unique and do not grant public access", () => {
  assert.match(migration, /assets_qr_token_unique/);
  assert.match(migration, /revoke all on public\.asset_events from anon/i);
  assert.match(migration, /has_valid_inspector_grant\(organization_id, 'equipment', location_id\)/);
});

test("equipment history is attributable, server timestamped and immutable", () => {
  assert.match(migration, /new\.recorded_at := clock_timestamp\(\)/);
  assert.match(migration, /new\.recorded_by := auth\.uid\(\)/);
  assert.match(migration, /Equipment history is append-only/);
  assert.match(migration, /revoke update, delete on public\.asset_events from authenticated/);
  assert.match(migration, /capture_audit_event/);
});

test("staff can contribute but master data and inspector access remain scoped", () => {
  assert.match(migration, /can_contribute_to_organization/);
  assert.match(migration, /is_manager_or_owner/);
  assert.match(invitation, /"equipment"/);
  assert.match(webDetail, /user\?\.role === "inspector"/);
});

test("web produces printable labels and a persistent detail timeline", () => {
  assert.match(webList, /renderQrDataUrl/);
  assert.match(webList, /Print QR labels/);
  assert.match(webDetail, /Complete history/);
  assert.match(webDetail, /asset_events/);
});

test("native camera validates labels and queues history offline", () => {
  assert.match(nativeScan, /CameraView/);
  assert.match(nativeScan, /This is not a Haccora equipment label/);
  assert.match(nativeDetail, /enqueue\("asset_events"/);
  assert.match(nativeDetail, /securely queued for sync/i);
});

test("equipment service dates produce multichannel due reminders", () => {
  assert.match(notifications, /equipment_service_due/);
  assert.match(notifications, /Equipment check or service is due/);
  assert.match(notifications, /nativeRoute: "\/assets"/);
});
