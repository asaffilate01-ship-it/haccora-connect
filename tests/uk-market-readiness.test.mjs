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
  // TanStack Start v1 requires Zod v4 in this project.
  assert.match(p.dependencies.zod, /\^4/);
  assert.match(l.packages["node_modules/zod"].version, /^4\./);
});
test("all deployable Edge Functions are declared in Supabase config", () => {
  const config = read("supabase/config.toml");
  for (const fn of [
    "file-scan",
    "operations-dispatch",
    "billing",
    "integration-admin",
    "integration-dispatch",
  ])
    assert.match(config, new RegExp(`\\[functions\\.${fn}\\]`));
});
test("UK compliance and PPDS workflows are reachable product routes", () => {
  const nav = read("src/routes/app.tsx");
  assert.match(nav, /\/app\/uk-compliance/);
  assert.match(nav, /\/app\/ppds/);
  assert.match(read("src/routes/app.ppds.tsx"), /source_snapshot/);
  assert.match(read("src/routes/app.uk-compliance.tsx"), /site_compliance_profiles/);
});
test("UK readiness turns operational evidence into actionable navigation", () => {
  const nav = read("src/routes/app.tsx");
  const readiness = read("src/routes/app.readiness.tsx");
  assert.match(nav, /\/app\/readiness/);
  for (const evidence of [
    "site_compliance_profiles",
    "site_safe_methods",
    "daily_diary_entries",
    "temperature_logs",
    "corrective_actions",
  ])
    assert.match(readiness, new RegExp(evidence));
  assert.match(readiness, /not an official food hygiene rating/i);
});
test("guided setup turns real records into a first-week onboarding flow", () => {
  const nav = read("src/routes/app.tsx");
  const setup = read("src/routes/app.get-started.tsx");
  assert.match(nav, /\/app\/get-started/);
  for (const evidence of [
    "site_compliance_profiles",
    "organization_memberships",
    "site_safe_methods",
    "assets",
    "suppliers",
    "recipes",
    "checks",
    "training_records",
  ])
    assert.match(setup, new RegExp(evidence));
  assert.match(setup, /first-week setup/i);
  assert.match(setup, /business remains responsible/i);
});
test("web and native typography use compact operational sizes", () => {
  const css = read("src/styles.css");
  assert.match(css, /\.app-shell/);
  assert.match(css, /\.marketing-shell/);
  assert.match(read("mobile/app/dashboard.tsx"), /title: \{ fontSize: 24/);
  assert.match(read("mobile/app/dashboard.tsx"), /cardTitle: \{ fontSize: 16/);
});
test("PPDS warns when a controlled label no longer matches ingredient specifications", () => {
  const ppds = read("src/routes/app.ppds.tsx");
  assert.match(ppds, /labelIsStale/);
  assert.match(ppds, /Out of date/);
  assert.match(ppds, /may_contain/);
  assert.match(ppds, /documented cross-contamination risk assessment/i);
});
test("UK runtime defaults use Europe London", () => {
  const migration = read("supabase/migrations/20260803210000_uk_runtime_defaults.sql");
  assert.match(migration, /Europe\/London/);
});
test("public metadata no longer positions Haccora for Germany", () => {
  for (const file of [
    "src/routes/__root.tsx",
    "src/routes/blog.index.tsx",
    "public/llms.txt",
    "public/manifest.webmanifest",
    "public/robots.txt",
    "src/routes/sitemap[.]xml.ts",
    "src/routes/legal.privacy.tsx",
  ])
    assert.doesNotMatch(read(file), /Germany|German kitchens|haccora\.de|Datenschutz/);
});
test("the launch language runtime is explicitly UK English only", () => {
  const i18n = read("src/lib/i18n.tsx");
  assert.match(i18n, /const lang: Language = "en"/);
  assert.doesNotMatch(i18n, /dicts.*de|setLangState|localStorage\.getItem\("haccora-uk-lang"\)/);
  assert.doesNotMatch(i18n, /multilingual platform|Kreuzberg Kitchen/);
});
test("today shift centre joins opening monitoring and closing evidence", () => {
  const nav = read("src/routes/app.tsx");
  const today = read("src/routes/app.today.tsx");
  assert.match(nav, /\/app\/today/);
  for (const evidence of ["checks", "temperature_logs", "corrective_actions", "incidents"])
    assert.match(today, new RegExp(evidence));
  assert.match(today, /not an official Food Hygiene Rating/i);
});
test("native app exposes UK safe methods PPDS and inspection evidence", () => {
  const dashboard = read("mobile/app/dashboard.tsx");
  const layout = read("mobile/app/_layout.tsx");
  for (const route of ["safe-methods", "ppds", "inspection-readiness"]) {
    assert.match(dashboard, new RegExp(`/${route}`));
    assert.match(layout, new RegExp(route));
  }
  assert.match(read("mobile/app/safe-methods.tsx"), /site_safe_methods/);
  assert.match(read("mobile/app/ppds.tsx"), /ppds_label_versions/);
  assert.match(read("mobile/app/inspection-readiness.tsx"), /corrective_actions/);
});
test("role-based navigation prioritises daily work and persists disclosure", () => {
  const shell = read("src/routes/app.tsx");
  assert.match(shell, /const quickItems/);
  for (const role of ["staff", "manager", "owner", "inspector"])
    assert.match(shell, new RegExp(`${role}:`));
  assert.match(shell, /haccora-nav-groups-v1/);
  assert.match(shell, /Quick access/);
  assert.match(shell, /More tools/);
});
test("web and native Today surfaces present one persisted next action", () => {
  const web = read("src/routes/app.today.tsx");
  const native = read("mobile/app/dashboard.tsx");
  for (const source of [web, native]) {
    assert.match(source, /NEXT REQUIRED ACTION|Next required action/);
    assert.match(source, /corrective_actions/);
    assert.match(source, /checks/);
  }
  assert.match(web, /saved to\s+your site workspace/i);
  assert.match(native, /saved to your workspace/i);
});
test("native navigation keeps five high-frequency destinations visible", () => {
  const nav = read("mobile/components/bottom-nav.tsx");
  for (const label of ["Today", "Log", "Actions", "Evidence", "More"])
    assert.match(nav, new RegExp(`"${label}"`));
  assert.match(read("mobile/app/_layout.tsx"), /<BottomNav/);
});
test("public pricing offers four clear packages and trial conversion", () => {
  const landing = read("src/routes/index.tsx");
  const pricingBlock = landing.slice(
    landing.indexOf("function Pricing"),
    landing.indexOf("function CtaFooter"),
  );
  assert.equal((pricingBlock.match(/\{ k:/g) ?? []).length, 4);
  assert.match(pricingBlock, /Start 7-day free trial/);
  assert.match(pricingBlock, /Contact sales/);
});
