import { createClient } from "@supabase/supabase-js";
import { DEMO_ORGANIZATION_ID, requireDemoEnvironment } from "./demo-client-config.mjs";

const { url, serviceKey } = requireDemoEnvironment();
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const expectations = new Map([
  ["locations", 1],
  ["organization_memberships", 3],
  ["checks", 2],
  ["temperature_logs", 2],
  ["cleaning_tasks", 2],
  ["cleaning_completions", 1],
  ["goods_in_logs", 1],
  ["recipes", 2],
  ["expiry_items", 1],
  ["training_records", 1],
  ["documents", 2],
]);
let failed = false;
for (const [table, minimum] of expectations) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", DEMO_ORGANIZATION_ID);
  if (error) throw new Error(`${table}: ${error.message}`);
  const ok = (count ?? 0) >= minimum;
  failed ||= !ok;
  process.stdout.write(`${ok ? "PASS" : "FAIL"} ${table.padEnd(28)} ${count ?? 0}/${minimum}\n`);
}
if (failed) process.exitCode = 1;
else process.stdout.write("Demo data contract verified.\n");
