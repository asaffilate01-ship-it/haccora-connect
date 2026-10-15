import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("batch identity is bound to a premises, supplier and accepted goods-in receipt", async () => {
  const sql = await read("../supabase/migrations/20261016010000_batch_sale_recall_traceability.sql");
  assert.match(sql, /create table public\.traceability_batches/);
  assert.match(sql, /foreign key \(ingredient_id, organization_id\)/);
  assert.match(sql, /foreign key \(organization_id, location_id\)/);
  assert.match(sql, /v_receipt\.status <> 'accepted'/);
  assert.match(sql, /v_receipt\.organization_id is distinct from new\.organization_id/);
  assert.match(sql, /v_receipt\.location_id is distinct from new\.location_id/);
  assert.match(sql, /v_receipt\.batch_lot/);
  assert.match(sql, /traceability_batches_goods_receipt_once/);
});

test("order attribution remains append-only, site-scoped, and explicitly manual", async () => {
  const sql = await read("../supabase/migrations/20261016010000_batch_sale_recall_traceability.sql");
  assert.match(sql, /create table public\.traceability_sale_allocations/);
  assert.match(sql, /check \(attribution = 'manual'\)/);
  assert.match(sql, /foreign key \(batch_id, organization_id, location_id\)/);
  assert.match(sql, /v_batch\.status <> 'available'/);
  assert.match(sql, /for share/);
  assert.match(sql, /grant select,insert on public\.traceability_sale_allocations/);
  assert.doesNotMatch(sql, /grant (?:update|delete) on public\.traceability_sale_allocations/i);
});

test("quarantine is a privileged, reasoned, audited server transition", async () => {
  const sql = await read("../supabase/migrations/20261016010000_batch_sale_recall_traceability.sql");
  assert.match(sql, /create or replace function public\.set_traceability_batch_hold/);
  assert.match(sql, /security definer set search_path=public,pg_temp/);
  assert.match(sql, /public\.can_manage_organization\(v_batch\.organization_id\)/);
  assert.match(sql, /public\.can_operate_record\(auth\.uid\(\), v_batch\.location_id, v_batch\.organization_id\)/);
  assert.match(sql, /for update/);
  assert.match(sql, /traceability_batch_events/);
  assert.match(sql, /r\.status <> 'closed'/);
  assert.match(sql, /raise exception 'Batch cannot be released while a linked recall is active'/);
  assert.match(sql, /grant select on public\.traceability_batch_events/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete) on public\.traceability_batch_events/i);
  assert.doesNotMatch(sql, /grant update on public\.traceability_batches/i);
});

test("traceability UI clearly labels missing history and never claims automated integrations", async () => {
  const source = await read("../src/routes/app.traceability.tsx");
  const recalls = await read("../src/routes/app.recalls.tsx");
  const shell = await read("../src/routes/app.tsx");
  assert.match(source, /Manual evidence only/);
  assert.match(source, /Exposure is unknown, not zero/);
  assert.match(source, /attribution: "manual"/);
  assert.match(source, /set_traceability_batch_hold/);
  assert.match(source, /traceability_sale_allocations/);
  assert.match(source, /traceability_batches/);
  assert.match(source, /traceability_batch_events/);
  assert.match(source, /orderOccurredAt/);
  assert.match(source, /!dataReady/);
  assert.match(source, /\.eq\("organization_id", user\.organizationId\)/);
  assert.match(source, /\.eq\("location_id", user\.locationId\)/);
  assert.match(recalls, /to="\/app\/traceability"/);
  assert.match(shell, /to: "\/app\/traceability"/);
});
