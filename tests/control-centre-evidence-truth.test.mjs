import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("control centre fails closed when either operational source is unavailable", async () => {
  const source = await readFile("src/routes/app.control-centre.tsx", "utf8");
  assert.match(source, /if \(inbox\.error \|\| corrective\.error\)/);
  assert.match(source, /setLoadError\(/);
  assert.match(source, /\) : loadError \? \(/);
  assert.match(source, /role="alert"/);
  assert.doesNotMatch(source, /All clear|Alles unter Kontrolle/);
});

test("control centre ignores stale responses and does not display stale exception counts", async () => {
  const source = await readFile("src/routes/app.control-centre.tsx", "utf8");
  assert.match(source, /useRef\(0\)/);
  assert.match(source, /if \(request !== requestId\.current\) return/);
  assert.match(source, /requestId\.current \+= 1/);
  assert.match(source, /loading \|\| loadError \? "—"/);
});

test("control centre exposes retry, honest empty state and capped sample warning", async () => {
  const source = await readFile("src/routes/app.control-centre.tsx", "utf8");
  assert.match(source, /isCapped = items\.length >= 150 \|\| actions\.length >= 150/);
  assert.match(source, /This view shows up to 150 records per list/);
  assert.match(source, /not a food-safety compliance assessment/);
  assert.match(source, /onClick=\{\(\) => void load\(\)\}/);
});
