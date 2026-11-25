import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/routes/app.control-centre.tsx", import.meta.url),
  "utf8",
);

test("control centre loads scoped evidence and only referenced corrective actions", () => {
  assert.match(source, /\.eq\("organization_id", organizationId\)/);
  assert.match(source, /location_id\.eq\.\$\{locationId\},location_id\.is\.null/);
  assert.match(source, /item\.source_table === "corrective_actions"/);
  assert.match(source, /\.in\("id", actionIds\)/);
  assert.match(source, /if \(actionIds\.length\)/);
  assert.match(source, /Showing \{items\.length\} of \{total\}/);
});

test("control centre suppresses stale or incomplete evidence and coalesces refresh events", () => {
  assert.match(source, /request !== requestId\.current/);
  assert.match(source, /inbox\.error \|\| !inbox\.data \|\| inbox\.count === null/);
  assert.match(source, /available \? String\(value\) : "—"/);
  assert.doesNotMatch(source, /All clear/);
  assert.match(source, /organization_id=eq\.\$\{organizationId\}/);
  assert.match(source, /if \(timer !== undefined\) return/);
  assert.match(source, /clearTimeout\(timer\)/);
});

test("corrective acknowledgement prevents duplicate local writes and reports partial failure", () => {
  assert.match(source, /writeLock\.current \|\| !canProgress\(item\)/);
  assert.match(source, /item\.status !== "open"/);
  assert.match(source, /action\?\.status === "open"/);
  assert.match(source, /\.eq\("status", "open"\)/);
  assert.match(source, /if \(error \|\| !data\) throw new Error\("Acknowledgement not confirmed"\)/);
  assert.match(source, /Action started, but acknowledgement was not confirmed/);
});
