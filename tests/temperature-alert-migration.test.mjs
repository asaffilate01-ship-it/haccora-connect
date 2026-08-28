import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/20260828090000_restore_tenant_temperature_alerts.sql";

test("latest temperature automation remains tenant-aware and idempotent", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const required of [
    "NEW.reading",
    "NEW.organization_id",
    "NEW.location_id",
    "public.organization_memberships",
    "membership.role IN ('owner', 'manager', 'chef')",
    "public.notification_outbox",
    "public.notification_preferences",
    "public.device_push_tokens",
    "ON CONFLICT (organization_id, idempotency_key)",
    "'temperature:' || NEW.id::text || ':activity'",
    "CREATE TRIGGER trg_temp_activity",
  ]) {
    assert.match(sql, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(sql, /NEW\.value_c/);
  assert.match(sql, /NEW\.status := 'out_of_range'/);
  assert.match(sql, /NEW\.status := 'in_range'/);
});
