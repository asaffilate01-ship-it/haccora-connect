import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const migration = await read(
  "supabase/migrations/20260808190000_native_evidence_and_push_hardening.sql",
);
const dispatcher = await read("supabase/functions/notification-dispatch/index.ts");
const upload = await read("mobile/lib/evidence-upload.ts");
const documents = await read("mobile/app/documents.tsx");
const push = await read("mobile/lib/push.ts");
const session = await read("mobile/lib/session.tsx");

test("native evidence uploads preserve security and audit metadata", () => {
  assert.match(upload, /Crypto\.digest\(Crypto\.CryptoDigestAlgorithm\.SHA256, bytes\)/);
  assert.match(upload, /mime_type: mimeType/);
  assert.match(upload, /file_size: bytes\.byteLength/);
  assert.match(upload, /sha256/);
  assert.match(upload, /file_url: null/);
  assert.match(upload, /Only PDF, JPG, PNG, WebP or CSV/);
});

test("native evidence downloads remain scan-gated and time limited", () => {
  assert.match(documents, /get_document_scan_status/);
  assert.match(documents, /scanStatus !== "clean"/);
  assert.match(documents, /createSignedUrl\(row\.storage_path, 5 \* 60\)/);
  assert.match(documents, /External evidence links must use HTTPS/);
  assert.match(documents, /archived_at: new Date\(\)\.toISOString\(\)/);
  assert.match(documents, /\.is\("archived_at", null\)/);
});

test("push permission is requested only from an explicit user action", () => {
  assert.match(push, /options\.requestPermission/);
  assert.match(push, /syncPushNotifications/);
  assert.match(push, /rpc\("get_my_context"\)/);
  assert.match(push, /\.eq\("organization_id", organizationId\)/);
  assert.match(push, /data\?\.push_enabled === false/);
  assert.match(session, /syncPushNotifications/);
  assert.doesNotMatch(session, /registerPushNotifications/);
});

test("reused physical-device tokens move to the current authenticated tenant", () => {
  assert.match(migration, /on conflict \(token\) do update set/);
  assert.match(migration, /user_id = excluded\.user_id/);
  assert.match(migration, /organization_id = excluded\.organization_id/);
  assert.match(migration, /not public\.can_read_organization\(v_org_id\)/);
});

test("Expo tickets are reconciled and stale tokens are disabled", () => {
  assert.match(migration, /create table if not exists public\.expo_push_receipts/);
  assert.match(migration, /revoke all on public\.expo_push_receipts from anon, authenticated/);
  assert.match(dispatcher, /push\/getReceipts/);
  assert.match(dispatcher, /expo_push_receipts/);
  assert.match(dispatcher, /DeviceNotRegistered/);
  assert.match(dispatcher, /\.eq\("organization_id", row\.organization_id\)/);
  assert.match(dispatcher, /\.eq\("user_id", row\.user_id\)/);
});
