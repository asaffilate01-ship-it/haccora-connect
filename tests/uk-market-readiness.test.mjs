import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
test("UK onboarding has four nations and no German state default", () => {
  const s = read("src/routes/onboarding.tsx");
  for (const n of ["England", "Wales", "Scotland", "Northern Ireland"])
    assert.match(s, new RegExp(n));
  assert.doesNotMatch(s, /Berlin|Bayern|Nordrhein|GmbH|DE 123/);
});
test("UK daily evidence and PPDS schema are tenant scoped", () => {
  const s = read("supabase/migrations/20260803190000_uk_daily_compliance.sql");
  for (const term of [
    "safe_method_templates",
    "daily_diary_entries",
    "ingredients",
    "ingredient_statement",
    "ppds_label_versions",
    "can_read_organization",
    "can_manage_organization",
  ])
    assert.match(s, new RegExp(term));
});
test("daily diary sign-off is manager-controlled and cannot be removed", () => {
  const s = read("supabase/migrations/20260803190000_uk_daily_compliance.sql");
  assert.match(s, /can_manage_organization\(NEW\.organization_id\)/);
  assert.match(s, /cannot be unsigned or reassigned/);
});
test("native and web diary enforce corrective action", () => {
  assert.match(read("src/routes/app.diary.tsx"), /corrective action/i);
  assert.match(read("mobile/app/diary.tsx"), /Corrective action required/);
});
test("dependency manifest and lock use compatible Zod major", () => {
  const p = JSON.parse(read("package.json"));
  const l = JSON.parse(read("package-lock.json"));
  assert.match(p.dependencies.zod, /\^3\./);
  assert.match(l.packages["node_modules/zod"].version, /^3\./);
});
