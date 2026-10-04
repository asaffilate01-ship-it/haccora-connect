import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/20261004013000_omniqora_platform_bridge.sql", import.meta.url),
  "utf8",
);
const fn = await readFile(
  new URL("../supabase/functions/omniqora-platform/index.ts", import.meta.url),
  "utf8",
);

test("Omniqora connector secrets are server-only and projections are review gated", () => {
  assert.match(migration, /encrypted_control_plane_key/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(
    migration,
    /REVOKE ALL ON public\.omniqora_connections FROM PUBLIC,anon,authenticated/,
  );
  assert.match(migration, /status text NOT NULL DEFAULT 'received'/);
  assert.match(fn, /OMNIQORA_PROVISIONING_SECRET/);
  assert.match(fn, /OMNIQORA_SYNC_SECRET/);
  assert.match(fn, /decryptSecret/);
  assert.match(fn, /reviewRequired:true/);
  assert.doesNotMatch(fn, /VITE_OMNIQORA.*KEY/);
});

test("AI calls are tenant scoped, entitled and do not send raw Haccora records", () => {
  assert.match(fn, /haccora\.ai-copilot/);
  assert.match(fn, /productKey:"haccora"/);
  assert.match(fn, /internalTenantId/);
  assert.match(fn, /evidence\(/);
  assert.doesNotMatch(fn, /select\("\*"\).*checks/);
  assert.match(fn, /never certify legal compliance or a hygiene rating/);
});
