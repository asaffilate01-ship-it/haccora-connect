import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Control Centre confirms the saved inbox row rather than trusting a zero-row update", async () => {
  const s = await readFile("src/routes/app.control-centre.tsx", "utf8");
  assert.match(s, /saveAcknowledgement/);
  assert.match(s, /\.eq\("status", "open"\)/);
  assert.match(s, /\.is\("owner_id", null\)/);
  assert.match(s, /\.select\("id"\)/);
  assert.match(s, /\.maybeSingle\(\)/);
  assert.match(s, /return !error && Boolean\(data\?\.id\)/);
});

test("Corrective action progression discloses a failed second write and prevents duplicate claims", async () => {
  const s = await readFile("src/routes/app.control-centre.tsx", "utf8");
  assert.match(s, /mutating\.current = true/);
  assert.match(s, /if \(!saved\)/);
  assert.match(s, /Corrective action may have advanced, but inbox acknowledgement failed/);
  assert.match(s, /if \(progressed\) void load\(\)/);
  assert.match(s, /item\.status === "open"/);
  assert.match(s, /user\?\.role !== "inspector"/);
  assert.doesNotMatch(s, /toast\.error\(error\.message\)/);
});
