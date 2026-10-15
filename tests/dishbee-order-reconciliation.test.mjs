import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (name) => readFile(new URL(name, import.meta.url), "utf8");

test("Dishbee ingestion accepts only a narrowly validated handed-over order event", async () => {
  const route = await read("../src/routes/api/integrations/dishbee.ts");
  assert.match(route, /event\.eventType === "dishbee\.order\.handed_over"/);
  assert.match(route, /DishbeeHandedOver\.safeParse\(event\.payload\)/);
  assert.match(route, /order_timestamp_required/);
  assert.match(route, /\.strict\(\)/);
  assert.match(route, /duplicate_order_line_ids/);
  assert.match(route, /tokenHash = await sha256\(token\)/);
  assert.match(route, /dishbeeTenantId/);
  assert.match(route, /resolveLocation\(/);
  assert.match(route, /connection\.status !== "live"/);
  assert.match(route, /ingest_dishbee_trace_order/);
  assert.match(route, /coverageComplete: false/);
  assert.doesNotMatch(route, /p_customer_email|p_customer_phone|p_delivery_address/);
});

test("service-only atomic ingestion validates active mapped premises and conflicting replays", async () => {
  const sql = await read("../supabase/migrations/20261016020000_dishbee_order_reconciliation.sql");
  assert.match(sql, /create table public\.dishbee_trace_orders/);
  assert.match(sql, /create table public\.dishbee_trace_order_lines/);
  assert.match(sql, /unique \(connection_id, event_key\)/);
  assert.match(sql, /unique \(connection_id, order_reference\)/);
  assert.match(sql, /where id=p_connection and status='live'/);
  assert.match(sql, /haccora_location_id=p_location and active=true/);
  assert.match(sql, /on conflict do nothing returning \* into v_order/);
  assert.match(sql, /v_order\.event_hash is distinct from p_event_hash/);
  assert.match(sql, /Conflicting Dishbee order replay or duplicate reference/);
  assert.match(sql, /grant execute on function public\.ingest_dishbee_trace_order/);
  assert.match(sql, /\) to service_role;/);
  const restrictedIngestionAcl = sql.split("create or replace function public.link_dishbee_trace_batch")[0];
  assert.doesNotMatch(restrictedIngestionAcl, /to authenticated;\s*$/);
});

test("order and source-line records are immutable to browser clients with tenant RLS", async () => {
  const sql = await read("../supabase/migrations/20261016020000_dishbee_order_reconciliation.sql");
  for (const table of [
    "dishbee_trace_orders",
    "dishbee_trace_order_lines",
    "dishbee_trace_batch_links",
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(sql, /public\.can_manage_organization\(organization_id\)/);
  assert.match(sql, /public\.can_operate_record\(auth\.uid\(\),location_id,organization_id\)/);
  assert.match(sql, /revoke all on public\.dishbee_trace_orders/);
  assert.match(sql, /grant select on public\.dishbee_trace_orders/);
  assert.doesNotMatch(sql, /grant (update|delete) on public\.dishbee_trace_order/i);
});

test("manual lot-link decision enforces same-site, chronological and reviewed evidence", async () => {
  const sql = await read("../supabase/migrations/20261016020000_dishbee_order_reconciliation.sql");
  assert.match(sql, /foreign key \(order_line_id, organization_id, location_id\)/);
  assert.match(sql, /foreign key \(batch_id, organization_id, location_id\)/);
  assert.match(sql, /create or replace function public\.link_dishbee_trace_batch/);
  assert.match(sql, /length\(btrim\(coalesce\(p_evidence_note,''\)\)\) < 12/);
  assert.match(sql, /public\.can_operate_record\(auth\.uid\(\),v_line\.location_id,v_line\.organization_id\)/);
  assert.match(sql, /v_batch\.received_at > v_order\.occurred_at/);
  assert.match(sql, /manager_reviewed_not_complete/);
});

test("reconciliation dashboard shows unknown coverage, window caps, and selected-lot impact", async () => {
  const ui = await read("../src/components/traceability/DishbeeOrderReconciliation.tsx");
  const page = await read("../src/routes/app.traceability.tsx");
  assert.match(ui, /dishbee_trace_orders/);
  assert.match(ui, /dishbee_trace_order_lines/);
  assert.match(ui, /dishbee_trace_batch_links/);
  assert.match(ui, /link_dishbee_trace_batch/);
  assert.match(ui, /No automatic lot assignment/);
  assert.match(ui, /Neither this count nor/);
  assert.match(ui, /No imported orders have been manually linked to this lot/);
  assert.match(ui, /Exposure remains unknown, not zero/);
  assert.match(ui, /\.eq\("location_id", locationId\)/);
  assert.match(page, /<DishbeeOrderReconciliation/);
});
