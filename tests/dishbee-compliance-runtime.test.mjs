import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const runtimeMigration=await readFile(
  new URL("../supabase/migrations/20261004071500_dishbee_compliance_runtime.sql",import.meta.url),
  "utf8",
);
const locationMigration=await readFile(
  new URL("../supabase/migrations/20261005082000_omniqora_location_links.sql",import.meta.url),
  "utf8",
);
const receiver=await readFile(
  new URL("../src/routes/api/integrations/dishbee.ts",import.meta.url),
  "utf8",
);
const platform=await readFile(
  new URL("../supabase/functions/omniqora-platform/index.ts",import.meta.url),
  "utf8",
);

test("Dishbee compliance runtime is tenant scoped and stores only token hashes",()=>{
  assert.match(runtimeMigration,/dishbee_runtime_connections/);
  assert.match(runtimeMigration,/token_hash text not null/);
  assert.match(runtimeMigration,/dishbee_tenant_id uuid not null/);
  assert.match(runtimeMigration,/dishbee_runtime_locations/);
  assert.match(runtimeMigration,/ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(runtimeMigration,/runtime_token text/i);
});

test("Dishbee receiver is idempotent and projects specialist compliance records",()=>{
  assert.match(receiver,/eventKey/);
  assert.match(receiver,/dishbee_runtime_events/);
  assert.match(receiver,/duplicate:true/);
  assert.match(receiver,/temperature_logs/);
  assert.match(receiver,/cleaning_completions/);
  assert.match(receiver,/goods_in_logs/);
  assert.match(receiver,/waste_entries/);
  assert.match(receiver,/incidents/);
  assert.match(receiver,/corrective_actions/);
  assert.match(receiver,/recipes/);
  assert.match(receiver,/tenant_mismatch/);
  assert.match(receiver,/dishbee_location_not_mapped/);
});

test("Omniqora provisioning binds explicit Haccora locations and Dishbee runtime",()=>{
  assert.match(locationMigration,/omniqora_location_links/);
  assert.match(platform,/action:z\.literal\("provision_location"\)/);
  assert.match(platform,/action:z\.literal\("bind_dishbee_runtime"\)/);
  assert.match(platform,/dishbee_runtime_connections/);
  assert.match(platform,/dishbee_runtime_locations/);
  assert.match(platform,/ensureDishbeeServiceActor/);
  assert.match(platform,/system_actor:true/);
  assert.match(platform,/x-omniqora-provisioning-secret/);
});

test("No location mapping is inferred from name in the Dishbee runtime bind",()=>{
  const bind=platform.slice(
    platform.indexOf('if(i.action==="bind_dishbee_runtime")'),
    platform.indexOf('if(i.action==="validate_projection")'),
  );
  assert.match(bind,/dishbeeLocationId/);
  assert.match(bind,/haccoraLocationId/);
  assert.doesNotMatch(bind,/\.eq\("name"/);
});
