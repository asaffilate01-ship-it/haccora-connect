import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/20261004071500_dishbee_compliance_runtime.sql", import.meta.url),
  "utf8",
);
const owner = await readFile(
  new URL("../supabase/migrations/20261004200500_dishbee_runtime_owner_setup.sql", import.meta.url),
  "utf8",
);
const route = await readFile(
  new URL("../src/routes/api/integrations/dishbee.ts", import.meta.url),
  "utf8",
);

test("Dishbee runtime stores only a token hash and maps tenant/location boundaries", () => {
  assert.match(migration, /token_hash text not null/);
  assert.match(migration, /dishbee_tenant_id uuid not null/);
  assert.match(migration, /dishbee_location_id uuid not null/);
  assert.match(migration, /haccora_location_id uuid not null/);
  assert.doesNotMatch(migration, /raw_token|bearer_token|access_token/);
});

test("tenant owner setup requires MFA and owner role", () => {
  assert.match(owner, /aal2/);
  assert.match(owner, /organization owner required/);
  assert.match(owner, /has_org_role\(p_organization,array\['owner'\]/);
  assert.match(owner, /get_my_dishbee_runtime/);
});

test("Dishbee ingestion validates bearer, tenant mapping and idempotency", () => {
  assert.match(route, /authorization/);
  assert.match(route, /sha256\(token\)/);
  assert.match(route, /tenant_mismatch/);
  assert.match(route, /dishbee_runtime_locations/);
  assert.match(route, /event_key/);
  assert.match(route, /duplicate: ?true/);
});

test("Dishbee compliance events project into specialist Haccora records", () => {
  for (const table of [
    "temperature_logs",
    "cleaning_completions",
    "haccp_flow_runs",
    "waste_entries",
    "goods_in_logs",
    "recipes",
    "incidents",
    "corrective_actions",
  ])
    assert.match(route, new RegExp(table));
});
