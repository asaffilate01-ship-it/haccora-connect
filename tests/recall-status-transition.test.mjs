import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("recall status changes require an authorized, reasoned server transition", async () => {
  const sql = await read("../supabase/migrations/20261127193000_audited_recall_transitions.sql");
  assert.match(sql, /create table public\.recall_status_events/);
  assert.match(sql, /decision_note text not null/);
  assert.match(sql, /foreign key \(location_id, organization_id\)/);
  assert.match(sql, /create or replace function public\.transition_recall_status/);
  assert.match(sql, /security definer/);
  assert.match(sql, /for update/);
  assert.match(sql, /public\.can_manage_organization\(v_recall\.organization_id\)/);
  assert.match(
    sql,
    /public\.can_operate_record\(v_recall\.organization_id, auth\.uid\(\), v_location_id\)/,
  );
  assert.match(sql, /v_recall\.status <> p_expected_status/);
  assert.match(sql, /closed recalls cannot be reopened/i);
  assert.match(sql, /char_length\(btrim\(coalesce\(p_reason, ''\)\)\) not between 12 and 2000/);
  assert.match(sql, /revoke update, delete on public\.recalls/);
  assert.match(sql, /grant select on public\.recall_status_events to authenticated/);
  assert.doesNotMatch(
    sql,
    /grant (?:insert|update|delete) on public\.recall_status_events to authenticated/i,
  );
});

test("recall UI asks for a decision reason and does not update status directly", async () => {
  const source = await read("../src/routes/app.recalls.tsx");
  assert.match(source, /rpc\("transition_recall_status"/);
  assert.match(source, /p_expected_status/);
  assert.match(source, /p_reason: draft\.reason/);
  assert.match(source, /Decision reason \(12–2000 characters\)/);
  assert.match(source, /recall_status_events/);
  assert.match(source, /role === "owner" \|\| role === "manager"/);
  assert.doesNotMatch(source, /\.from\("recalls"\)\.update/);
});
