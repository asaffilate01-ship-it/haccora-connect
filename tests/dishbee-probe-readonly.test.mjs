import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/routes/api/integrations/dishbee.ts", import.meta.url),
  "utf8",
);

test("the authenticated premises probe is read-only and explicitly reports non-persistence", () => {
  const start = source.indexOf('if (new URL(request.url).searchParams.get("probe") === "1")');
  const end = source.indexOf("const { data: existing, error: existingError }", start);
  assert(start > source.indexOf("tenant_mismatch"));
  assert(end > start);
  const probe = source.slice(start, end);
  assert.doesNotMatch(probe, /\.(insert|update|delete|upsert)\s*\(/);
  assert.match(probe, /persisted: false/);
  assert.match(probe, /if \(!locationId\)/);
  assert.match(probe, /haccoraLocationId: locationId/);
});

test("a non-probe request cannot create compliance evidence for an unrelated event family", () => {
  const scope = source.indexOf('event.eventType.startsWith("dishbee.compliance.")');
  const receipts = source.indexOf('const { data: existing, error: existingError }');
  assert(scope > 0 && scope < receipts);
  assert.match(source, /unsupported_event_scope/);
});
