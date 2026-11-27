import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
const source = await read("src/lib/diary-integrity.ts");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { draftFromDiary, diaryLocked, diaryProblem, diaryValues, validDiaryDate, canSignDiary } =
  await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));

const record = {
  id: "saved",
  diary_date: "2026-11-27",
  opening_checks: { completed: true },
  closing_checks: { completed: false },
  problems: "Observed temperature exception",
  corrective_actions: "Reviewed stock and recorded action",
  signed_off_at: null,
  signed_off_by: null,
  updated_at: "2026-11-27T10:00:00.000Z",
};

test("diary drafts preserve saved evidence rather than starting blank", () => {
  const draft = draftFromDiary(record);
  assert.equal(draft.opening, true);
  assert.equal(draft.closing, false);
  assert.equal(draft.problems, record.problems);
  assert.equal(draft.actions, record.corrective_actions);
  assert.equal(draftFromDiary(null).opening, false);
  assert.equal(draftFromDiary({ ...record, opening_checks: { completed: "false" } }).opening, false);
});

test("signed or partially signed diary entries are locked", () => {
  assert.equal(diaryLocked(null), false);
  assert.equal(diaryLocked(record), false);
  assert.equal(diaryLocked({ ...record, signed_off_by: "manager" }), true);
  assert.equal(diaryLocked({ ...record, signed_off_at: record.updated_at }), true);
});

test("manager sign-off requires both checks and corrective action for reported problems", () => {
  const draft = { ...draftFromDiary(record), closing: true };
  assert.equal(canSignDiary("owner", draft, record), true);
  assert.equal(canSignDiary("manager", draft, record), true);
  assert.equal(canSignDiary("staff", draft, record), false);
  assert.equal(canSignDiary("inspector", draft, record), false);
  assert.equal(canSignDiary("manager", { ...draft, opening: false }, record), false);
  assert.equal(canSignDiary("manager", { ...draft, closing: false }, record), false);
  assert.equal(canSignDiary("manager", { ...draft, actions: " " }, record), false);
  assert.equal(canSignDiary("manager", draft, { ...record, signed_off_by: "manager" }), false);
  assert.equal(diaryProblem({ ...draft, actions: " " }), "Corrective action required");
  assert.equal(diaryValues({ ...draft, problems: " note " }).problems, "note");
});

test("diary dates reject invalid and future dates", () => {
  assert.equal(validDiaryDate("2026-11-27", "2026-11-27"), true);
  assert.equal(validDiaryDate("2026-11-28", "2026-11-27"), false);
  assert.equal(validDiaryDate("2026-02-30", "2026-11-27"), false);
  assert.equal(validDiaryDate("2026-11-27T12:00:00Z", "2026-11-27"), false);
});

test("web and native forms read current site evidence and conditionally save unsigned records", async () => {
  assert.equal(await read("mobile/lib/diary-integrity.ts"), source);
  for (const path of ["src/routes/app.diary.tsx", "mobile/app/diary.tsx"]) {
    const route = await read(path);
    assert.match(route, /operationalDate\(new Date\(\), "Europe\/London"\)/);
    assert.match(route, /\.eq\("organization_id", organizationId\)/);
    assert.match(route, /\.eq\("location_id", locationId\)/);
    assert.match(route, /\.eq\("updated_at", record\.updated_at\)/);
    assert.match(route, /\.is\("signed_off_at", null\)/);
    assert.match(route, /\.is\("signed_off_by", null\)/);
    assert.match(route, /write\.select\(DIARY_FIELDS\)\.single\(\)/);
    assert.match(route, /Save not confirmed/);
    assert.doesNotMatch(route, /\.upsert\(/);
  }
  const web = await read("src/routes/app.diary.tsx");
  assert.match(web, /!confirmed \|\| !canSignDiary/);
  assert.match(web, /setConfirmed\(false\)/);
  const native = await read("mobile/app/diary.tsx");
  assert.match(native, /role === "inspector"/);
  assert.match(native, /useFocusEffect\(/);
});
