import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const helper = readFileSync(
  new URL("../supabase/functions/_shared/inspection-period.ts", import.meta.url),
  "utf8",
);
const code = ts.transpileModule(helper, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { ukInspectionPeriod, ukCalendarDate } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);

test("inspection periods include the whole UK end date across clock changes", () => {
  assert.deepEqual(ukInspectionPeriod("2026-03-29", "2026-03-29"), {
    from: "2026-03-29",
    to: "2026-03-29",
    start: "2026-03-29T00:00:00.000Z",
    end: "2026-03-29T23:00:00.000Z",
  });
  assert.deepEqual(ukInspectionPeriod("2026-10-25", "2026-10-25"), {
    from: "2026-10-25",
    to: "2026-10-25",
    start: "2026-10-24T23:00:00.000Z",
    end: "2026-10-26T00:00:00.000Z",
  });
  assert.equal(ukInspectionPeriod("2026-07-01", "2026-07-02").end, "2026-07-02T23:00:00.000Z");
  assert.equal(ukCalendarDate(new Date("2026-07-14T23:30:00Z")), "2026-07-15");
});

test("strict calendar validation rejects rolled dates, timestamps and excessive periods", () => {
  assert.throws(() => ukInspectionPeriod("2026-02-30", "2026-03-01"), RangeError);
  assert.throws(() => ukInspectionPeriod("2026-01-01T12:00:00Z", "2026-02-01"), RangeError);
  assert.throws(() => ukInspectionPeriod("2026-01-02", "2026-01-01"), RangeError);
  assert.throws(() => ukInspectionPeriod("2024-01-01", "2025-01-01"), RangeError);
  assert.doesNotThrow(() => ukInspectionPeriod("2024-01-01", "2024-12-31"));
});

test("preview and export use the same half-open bounds and reject incomplete evidence", () => {
  const preview = readFileSync(
    new URL("../src/routes/app.inspection.tsx", import.meta.url),
    "utf8",
  );
  const exporter = readFileSync(
    new URL("../supabase/functions/inspection-export/index.ts", import.meta.url),
    "utf8",
  );
  assert.match(preview, /ukInspectionPeriod\(from, to\)/);
  assert.match(preview, /\.lt\("completed_at", toIso\)/);
  assert.match(preview, /result\.error \|\| result\.count === null/);
  assert.match(preview, /request !== requestId\.current/);
  assert.match(exporter, /\.gte\("completed_at", period\.start\)/);
  assert.match(exporter, /\.lt\("verified_at", period\.end\)/);
  assert.match(exporter, /p_from: period\.from/);
  assert.match(exporter, /p_to: period\.to/);
  assert.doesNotMatch(exporter, /\.lte\(/);
});

test("inspection failures expose a retry and suppress stale evidence and exports", () => {
  const preview = readFileSync(
    new URL("../src/routes/app.inspection.tsx", import.meta.url),
    "utf8",
  );
  assert.match(preview, /Retry evidence loading/);
  assert.match(preview, /onClick=\{\(\) => void load\(\)\}/);
  assert.match(preview, /disabled=\{loading \|\| exporting\}/);
  assert.match(preview, /if \(!previewCurrent \|\| !ready \|\| exportLock\.current\) return/);
  assert.match(preview, /previewCurrent \? totals\.evidence : null/);
});
