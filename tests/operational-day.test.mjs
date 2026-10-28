import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
const source = readFileSync(new URL("../src/lib/operational-day.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { operationalDay, operationalDate } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

const cases = [
  [
    "Europe/London",
    "2026-03-29T12:00:00Z",
    "2026-03-29T00:00:00.000Z",
    "2026-03-29T23:00:00.000Z",
    23,
  ],
  [
    "Europe/London",
    "2026-10-25T12:00:00Z",
    "2026-10-24T23:00:00.000Z",
    "2026-10-26T00:00:00.000Z",
    25,
  ],
  [
    "Europe/Berlin",
    "2026-03-29T12:00:00Z",
    "2026-03-28T23:00:00.000Z",
    "2026-03-29T22:00:00.000Z",
    23,
  ],
  [
    "Europe/Berlin",
    "2026-10-25T12:00:00Z",
    "2026-10-24T22:00:00.000Z",
    "2026-10-25T23:00:00.000Z",
    25,
  ],
  [
    "Europe/London",
    "2026-07-14T23:30:00Z",
    "2026-07-14T23:00:00.000Z",
    "2026-07-15T23:00:00.000Z",
    24,
  ],
  [
    "Europe/Berlin",
    "2026-01-31T23:30:00Z",
    "2026-01-31T23:00:00.000Z",
    "2026-02-01T23:00:00.000Z",
    24,
  ],
];
for (const [zone, instant, start, end, hours] of cases)
  test(`${zone} day containing ${instant} has ${hours} hours`, () => {
    const day = operationalDay(new Date(instant), zone);
    assert.equal(day.start, start);
    assert.equal(day.end, end);
    assert.equal((Date.parse(day.end) - Date.parse(day.start)) / 3600000, hours);
    assert.equal(operationalDate(new Date(day.start), zone), day.date);
    assert.notEqual(operationalDate(new Date(day.end), zone), day.date);
  });
test("calendar offsets cross year/leap boundaries without 24-hour assumptions", () => {
  assert.equal(operationalDate(new Date("2026-12-31T23:30:00Z"), "Europe/Berlin", 7), "2027-01-08");
  assert.equal(operationalDate(new Date("2028-02-28T12:00:00Z"), "Europe/London", 1), "2028-02-29");
  assert.throws(() => operationalDay(new Date("invalid"), "Europe/London"), RangeError);
  assert.throws(() => operationalDate(new Date(), "Europe/London", 0.5), RangeError);
});
const native = new URL("../mobile/lib/operational-day.ts", import.meta.url);
if (existsSync(native))
  test("native and web share the same operational-day implementation", () => {
    assert.equal(readFileSync(native, "utf8"), source);
  });
