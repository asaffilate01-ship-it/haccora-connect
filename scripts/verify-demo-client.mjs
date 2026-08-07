import { createClient } from "@supabase/supabase-js";
import {
  DEMO_ORGANIZATION_ID,
  ISOLATION_ORGANIZATION_ID,
  demoEmails,
  requireDemoEnvironment,
} from "./demo-client-config.mjs";

const { url, serviceKey } = requireDemoEnvironment();
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const expectations = new Map([
  ["locations", 1],
  ["organization_memberships", 4],
  ["inspector_access_grants", 1],
  ["subscriptions", 1],
  ["checks", 2],
  ["temperature_logs", 2],
  ["cleaning_tasks", 2],
  ["cleaning_completions", 1],
  ["goods_in_logs", 1],
  ["recipes", 2],
  ["expiry_items", 1],
  ["training_records", 1],
  ["documents", 2],
  ["assets", 2],
  ["asset_check_schedules", 2],
  ["asset_events", 2],
]);
let failed = false;
for (const [table, minimum] of expectations) {
  const { count, error } = await supabase
    .from(table)
    .select("organization_id", { count: "exact", head: true })
    .eq("organization_id", DEMO_ORGANIZATION_ID);
  if (error) throw new Error(`${table}: ${error.message}`);
  const ok = (count ?? 0) >= minimum;
  failed ||= !ok;
  process.stdout.write(`${ok ? "PASS" : "FAIL"} ${table.padEnd(28)} ${count ?? 0}/${minimum}\n`);
}

for (const [table, minimum] of [
  ["locations", 1],
  ["organization_memberships", 1],
  ["temperature_logs", 1],
  ["subscriptions", 1],
]) {
  const { count, error } = await supabase
    .from(table)
    .select("organization_id", { count: "exact", head: true })
    .eq("organization_id", ISOLATION_ORGANIZATION_ID);
  if (error) throw new Error(`${table}: ${error.message}`);
  const ok = (count ?? 0) >= minimum;
  failed ||= !ok;
  process.stdout.write(
    `${ok ? "PASS" : "FAIL"} isolation:${table.padEnd(18)} ${count ?? 0}/${minimum}\n`,
  );
}

const expectedEmails = new Set(Object.values(demoEmails()).map((email) => email.toLowerCase()));
const foundEmails = new Set();
for (let page = 1; page <= 10 && foundEmails.size < expectedEmails.size; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  for (const user of data.users) {
    const email = user.email?.toLowerCase();
    if (email && expectedEmails.has(email)) foundEmails.add(email);
  }
  if (data.users.length < 100) break;
}
for (const email of expectedEmails) {
  const ok = foundEmails.has(email);
  failed ||= !ok;
  process.stdout.write(`${ok ? "PASS" : "FAIL"} login:${email}\n`);
}

const { count: platformCount, error: platformError } = await supabase
  .from("platform_operators")
  .select("user_id", { count: "exact", head: true })
  .eq("status", "active");
if (platformError) throw new Error(`platform_operators: ${platformError.message}`);
const platformOk = (platformCount ?? 0) >= 1;
failed ||= !platformOk;
process.stdout.write(`${platformOk ? "PASS" : "FAIL"} active platform operator\n`);

if (failed) process.exitCode = 1;
else process.stdout.write("Demo data and identity contract verified.\n");
