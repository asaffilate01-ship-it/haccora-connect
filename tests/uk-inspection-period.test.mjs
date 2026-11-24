import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../supabase/functions/_shared/inspection-period.ts", import.meta.url),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { inspectionDate, inspectionPeriod } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

test("UK inspection periods include the entire selected date, including clock changes", () => {
  for (const [day, hours] of [
    ["2026-03-29", 23],
    ["2026-10-25", 25],
    ["2026-07-15", 24],
    ["2026-11-24", 24],
  ]) {
    const period = inspectionPeriod(day, day);
    assert.equal(period.days, 1);
    assert.equal((Date.parse(period.endExclusive) - Date.parse(period.start)) / 3600000, hours);
    assert.equal(inspectionDate(new Date(period.start)), day);
    assert.equal(inspectionDate(new Date(Date.parse(period.endExclusive) - 1)), day);
    assert.notEqual(inspectionDate(new Date(period.endExclusive)), day);
  }
});

test("invalid, reversed and oversized periods are rejected", () => {
  assert.throws(() => inspectionPeriod("2026-02-30", "2026-03-01"), RangeError);
  assert.throws(() => inspectionPeriod("2026-01-02", "2026-01-01"), RangeError);
  assert.throws(() => inspectionPeriod("2025-01-01", "2026-02-01"), RangeError);
  assert.throws(() => inspectionPeriod("2026-01-01T00:00:00Z", "2026-01-02"), RangeError);
  assert.equal(inspectionDate(new Date("2026-07-14T23:30:00Z")), "2026-07-15");
});

test("preview and export share the same end-exclusive period and evidence timestamps", () => {
  const ui = readFileSync(new URL("../src/routes/app.inspection.tsx", import.meta.url), "utf8");
  const edge = readFileSync(
    new URL("../supabase/functions/inspection-export/index.ts", import.meta.url),
    "utf8",
  );
  assert.match(ui, /inspectionPeriod\(from, to\)/);
  assert.match(ui, /period\.endExclusive/);
  assert.match(ui, /\.lt\("verified_at", toIso\)/);
  assert.match(edge, /inspectionPeriod\(/);
  assert.match(edge, /\.lt\("completed_at", period\.endExclusive\)/);
  assert.match(edge, /\.lt\("verified_at", period\.endExclusive\)/);
  assert.match(edge, /p_from: period\.from/);
  assert.match(edge, /p_to: period\.to/);
  assert.doesNotMatch(edge, /\.lte\(/);
});

test("report previews reset with account scope and do not display unknown counts as zero", () => {
  const ui = readFileSync(new URL("../src/routes/app.inspection.tsx", import.meta.url), "utf8");
  assert.match(ui, /<InspectionEvidence key=\{scopeKey\} user=\{user\}/);
  assert.match(ui, /request !== requestId\.current/);
  assert.match(ui, /exportLock\.current/);
  assert.match(ui, /value \?\? "—"/);
  assert.match(ui, /Retry evidence loading/);
});

test("PDF evidence samples disclose their bounds and avoid ambiguous organisation names", () => {
  const edge = readFileSync(
    new URL("../supabase/functions/inspection-export/index.ts", import.meta.url),
    "utf8",
  );
  assert.match(edge, /organizations\.count === 1/);
  assert.match(edge, /Incomplete inspection evidence counts/);
  assert.match(edge, /\.order\("verified_at", \{ ascending: false \}\)/);
  assert.match(edge, /Showing \$\{\s*Math\.min/);
  assert.match(edge, /not a food hygiene rating or compliance certificate/);
});
