import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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
  assert.match(read("mobile/app/dashboard.tsx"), /title: \{ fontSize: 22/);
  assert.match(read("mobile/app/dashboard.tsx"), /cardTitle: \{ fontSize: 14/);
  assert.match(read("mobile/app/dashboard.tsx"), /flexWrap: "wrap"/);
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
test("UK-only public and contact defaults cannot silently fall back to German", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest"));
  const contact = read("supabase/functions/contact/index.ts");
  assert.equal(manifest.lang, "en-GB");
  assert.match(contact, /z\.literal\("en"\)\.default\("en"\)/);
  assert.doesNotMatch(contact, /default\("de"\)|\["de",\s*"en"\]/);
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
  const navigation = read("mobile/app/dashboard.tsx") + read("mobile/app/more.tsx");
  const layout = read("mobile/app/_layout.tsx");
  for (const route of ["safe-methods", "ppds", "inspection-readiness"]) {
    assert.match(navigation, new RegExp(`/${route}`));
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
  for (const label of ["Today", "Checks", "Log", "Alerts", "More"])
    assert.match(nav, new RegExp(`"${label}"`));
  assert.match(read("mobile/app/_layout.tsx"), /<BottomNav/);
});
test("native navigation gives inspectors a read-focused evidence surface", () => {
  const nav = read("mobile/components/bottom-nav.tsx");
  const more = read("mobile/app/more.tsx");
  const dashboard = read("mobile/app/dashboard.tsx");
  assert.match(nav, /role === "inspector" \? inspectorItems : operationsItems/);
  assert.match(nav, /useSafeAreaInsets/);
  assert.match(more, /items\.filter\(\(\[, , roles\]\)/);
  assert.match(dashboard, /role === "inspector"/);
});

test("Phase 8 compliance coach ranks real persisted evidence on web and native", () => {
  const web = read("src/routes/app.coach.tsx");
  const native = read("mobile/app/coach.tsx");
  for (const source of [web, native]) {
    for (const table of ["checks", "corrective_actions", "temperature_logs"])
      assert.match(source, new RegExp(table));
    assert.match(source, /not an official|not.*official|official hygiene rating/i);
  }
  for (const table of ["incidents", "site_safe_methods", "training_records"])
    assert.match(web, new RegExp(table));
  assert.match(web, /Seven-day momentum/);
  assert.match(web, /No generic score/);
});

test("Phase 8 keeps the coach a role-aware web and native destination", () => {
  const shell = read("src/routes/app.tsx");
  const layout = read("mobile/app/_layout.tsx");
  const more = read("mobile/app/more.tsx");
  assert.match(shell, /\/app\/coach/);
  assert.match(shell, /Compliance coach/);
  assert.match(layout, /name="coach"/);
  assert.match(more, /Compliance coach/);
  assert.match(more, /\/coach/);
});
test("public pricing offers four clear packages and trial conversion", () => {
  const landing = read("src/routes/index.tsx");
  const pricingBlock = landing.slice(
    landing.indexOf("function Pricing"),
    landing.indexOf("function CtaFooter"),
  );
  for (const plan of ["solo", "complete", "group", "enterprise"])
    assert.match(pricingBlock, new RegExp(`k: "${plan}"`));
  assert.match(pricingBlock, /Start 7-day free trial/);
  assert.match(pricingBlock, /Contact sales/);
  assert.match(pricingBlock, /VAT/);
  assert.match(pricingBlock, /No card required/);
});

test("Phase 7 replaces German regional concepts with four-nation UK authority context", () => {
  const landing = read("src/routes/index.tsx");
  const dictionary = read("src/lib/i18n.tsx");
  const authorities = read("src/lib/uk-authorities.ts");
  for (const nation of ["england", "wales", "scotland", "northernIreland"])
    assert.match(landing + dictionary, new RegExp(nation));
  for (const scheme of ["FHRS", "FHIS", "Food Standards Scotland", "district council"])
    assert.match(authorities, new RegExp(scheme, "i"));
  assert.doesNotMatch(landing, /\["berlin", "nrw"/i);
  assert.match(landing, />UK<\/span>/);
});

test("Phase 7 persists each site's local-authority and registration context", () => {
  const profile = read("src/routes/app.uk-compliance.tsx");
  const migration = read("supabase/migrations/20260805223000_uk_local_authority_profiles.sql");
  const types = read("src/integrations/supabase/types.ts");
  for (const field of [
    "local_authority_name",
    "registration_reference",
    "registration_confirmed_at",
  ]) {
    assert.match(profile, new RegExp(field));
    assert.match(migration, new RegExp(field));
    assert.match(types, new RegExp(field));
  }
  assert.match(profile, /Official registration guidance/);
  assert.match(profile, /authority verification/i);
});

test("Phase 7 editorial content is UK English only", () => {
  const blog = read("src/lib/blog.ts");
  assert.doesNotMatch(blog, /\bde\s*:|Deutschland|Lebensmittel|LMIV|Küchen/);
  assert.match(blog, /local-authority visit/i);
  assert.match(blog, /PPDS/);
  assert.match(blog, /en-GB/);
});

test("Phase 7 replaces Germany-specific health and audit classifications", () => {
  const health = read("src/routes/app.health.tsx");
  const audits = read("src/routes/app.audits.tsx");
  const migration = read("supabase/migrations/20260805223000_uk_local_authority_profiles.sql");
  assert.match(health, /fitness_briefing/);
  assert.match(migration, /SET kind = 'fitness_briefing' WHERE kind = 'ifsg43'/);
  assert.doesNotMatch(audits, /value="lmhv"|value="ifs"|value="din"/);
  assert.match(audits, /Safer Food, Better Business review/);
});

test("every visible operational route is connected to persistence or the authenticated shell", () => {
  const operational = readdirSync(new URL("../src/routes", import.meta.url)).filter((file) =>
    /^app\..+\.tsx$/.test(file),
  );
  assert.ok(operational.length >= 40);
  for (const file of operational) {
    const source = read(`src/routes/${file}`);
    assert.match(
      source,
      /supabase|<Outlet|createFileRoute\("\/app\/"|BrowserQRCodeReader/,
      `${file} must be wired`,
    );
  }
});

test("Phase 13 converts the training catalogue to UK content and preserves certificate metadata", () => {
  const migration = read(
    "supabase/migrations/20260806003000_uk_training_certificate_management.sql",
  );
  assert.match(migration, /Food-handler health and fitness to work/);
  assert.match(migration, /Allergen awareness and PPDS/);
  assert.match(migration, /certificate_reference/);
  assert.match(migration, /provider text/);
});

test("Phase 13 wires native training and renewal management", () => {
  const training = read("mobile/app/training.tsx");
  const layout = read("mobile/app/_layout.tsx");
  assert.match(training, /from\("training_records"\)/);
  assert.match(training, /certificate_valid_to/);
  assert.match(training, /Save verified training/);
  assert.match(training, /Provider not recorded/);
  assert.match(layout, /name="training"/);
});

test("Phase 14 induction acknowledgement is attributable and cannot be backdated by staff", () => {
  const migration = read("supabase/migrations/20260806004000_staff_induction_acknowledgements.sql");
  assert.match(migration, /acknowledge_my_induction/);
  assert.match(migration, /and user_id = auth\.uid\(\)/);
  assert.match(migration, /set acknowledged_at = coalesce\(acknowledged_at, now\(\)\)/i);
  assert.match(
    migration,
    /revoke update on public\.staff_induction_assignments from authenticated/i,
  );
  assert.match(migration, /Staff read own inductions; leaders read organisation/);
});

test("Phase 14 wires induction flow and due alerts across SaaS and native apps", () => {
  const web = read("src/routes/app.inductions.tsx");
  const native = read("mobile/app/inductions.tsx");
  const dispatch = read("supabase/functions/notification-dispatch/index.ts");
  const nav = read("src/routes/app.tsx") + read("mobile/app/_layout.tsx");
  for (const source of [web, native]) {
    assert.match(source, /staff_induction_assignments/);
    assert.match(source, /acknowledge_my_induction/);
    assert.match(source, /I have read and understood/);
  }
  assert.match(dispatch, /staff_induction_due/);
  assert.match(dispatch, /nativeRoute: "\/inductions"/);
  assert.match(nav, /inductions/);
});

test("Phase 15 protects UK fitness-to-work reports and manager clearance", () => {
  const migration = read("supabase/migrations/20260806005000_uk_fitness_to_work_reporting.sql");
  assert.match(migration, /health_read_private/);
  assert.match(migration, /user_id = auth\.uid\(\) or public\.is_manager_or_owner/);
  assert.match(migration, /revoke update, delete on public\.health_register from authenticated/);
  assert.match(migration, /clear_health_exclusion/);
  assert.match(migration, /cleared_by = auth\.uid\(\)/);
  assert.match(migration, /cleared_at = now\(\)/);
});

test("Phase 15 wires native sickness reporting and private manager alerts", () => {
  const native = read("mobile/app/fitness-to-work.tsx");
  const dispatch = read("supabase/functions/notification-dispatch/index.ts");
  const layout = read("mobile/app/_layout.tsx") + read("mobile/lib/push.ts");
  assert.match(native, /from\("health_register"\)\.insert/);
  assert.match(native, /clear_health_exclusion/);
  assert.match(native, /Do not handle food/);
  assert.match(dispatch, /fitness_to_work_review/);
  assert.doesNotMatch(dispatch, /fitness_to_work_review[\s\S]{0,500}symptoms/);
  assert.match(layout, /fitness-to-work/);
});

test("Phase 16 makes goods-in evidence attributable and immutable", () => {
  const migration = read("supabase/migrations/20260806006000_uk_goods_in_acceptance.sql");
  assert.match(migration, /goods_in_insert_attributed/);
  assert.match(migration, /user_id = auth\.uid\(\)/);
  assert.match(migration, /goods_in_corrective_action_required/);
  assert.match(migration, /revoke update, delete on public\.goods_in_logs from authenticated/);
  for (const field of [
    "condition_ok",
    "allergen_label_ok",
    "use_by",
    "delivery_reference",
    "corrective_action",
  ])
    assert.match(migration, new RegExp(field));
});

test("Phase 16 wires compact offline delivery checks and manager alerts", () => {
  const native = read("mobile/app/goods-in.tsx");
  const web = read("src/routes/app.goodsin.tsx");
  const queue = read("mobile/lib/offline-queue.ts");
  const dispatch = read("supabase/functions/notification-dispatch/index.ts");
  assert.match(native, /enqueue\("goods_in_logs"/);
  assert.match(native, /Packaging intact/);
  assert.match(native, /Corrective action required/);
  assert.match(web, /allergen_label_ok/);
  assert.match(queue, /"goods_in_logs"/);
  assert.match(dispatch, /rejected_delivery_review/);
  assert.match(dispatch, /nativeRoute: "\/goods-in"/);
});

test("Phase 17 persists configurable cleaning schedules and immutable evidence", () => {
  const migration = read("supabase/migrations/20260806007000_persistent_cleaning_schedules.sql");
  for (const table of ["cleaning_tasks", "cleaning_completions"])
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
  assert.match(migration, /contact_minutes/);
  assert.match(migration, /task_area_snapshot/);
  assert.match(migration, /completed_by = auth\.uid\(\)/);
  assert.match(migration, /revoke update, delete on public\.cleaning_completions/);
});

test("Phase 17 wires compact web and offline-native cleaning flows", () => {
  const web = read("src/routes/app.cleaning.tsx");
  const native = read("mobile/app/cleaning.tsx");
  const queue = read("mobile/lib/offline-queue.ts");
  const dispatch = read("supabase/functions/notification-dispatch/index.ts");
  for (const source of [web, native]) {
    assert.match(source, /cleaning_tasks/);
    assert.match(source, /cleaning_completions/);
  }
  assert.match(native, /enqueue\("cleaning_completions"/);
  assert.match(queue, /"cleaning_completions"/);
  assert.match(dispatch, /scheduled cleaning task/);
  assert.doesNotMatch(web, /Sanixyl|DesInfekt|FrostClean/);
});

test("Phase 18 gives staff fast live allergen lookup with safe caveats", () => {
  const allergens = read("mobile/app/allergens.tsx");
  assert.match(allergens, /from\("recipes"\)/);
  assert.match(allergens, /Search dish or category/);
  assert.match(allergens, /This is not a guarantee of absence/);
  assert.match(allergens, /cross-contamination controls/);
  for (const allergen of ["gluten", "crustaceans", "sulphites", "molluscs"])
    assert.match(allergens, new RegExp(allergen));
});

test("Phase 18 simplifies mobile navigation around Today Log Alerts and More", () => {
  const nav = read("mobile/components/bottom-nav.tsx");
  const dashboard = read("mobile/app/dashboard.tsx");
  const quickLog = read("mobile/app/quick-log.tsx");
  const more = read("mobile/app/more.tsx");
  for (const label of ["Today", "Checks", "Log", "Alerts", "More"])
    assert.match(nav, new RegExp(`label: "${label}"`));
  assert.equal((dashboard.match(/style=\{styles\.card\}/g) ?? []).length, 6);
  assert.match(quickLog, /What are you recording/);
  assert.match(more, /Food safety/);
  assert.match(more, /People/);
});

test("Phase 21 exposes a complete UK legal route set and removes the German imprint", () => {
  const legal = read("src/lib/legal-content.tsx");
  const shell = read("src/routes/legal.tsx");
  const sitemap = read("src/routes/sitemap[.]xml.ts");
  for (const route of [
    "company-details",
    "privacy",
    "terms",
    "cookies",
    "data-processing",
    "accessibility",
    "complaints",
  ])
    assert.match(shell + sitemap, new RegExp(route));
  for (const law of [
    "UK\\s+GDPR",
    "Data\\s+Protection\\s+Act\\s+2018",
    "Privacy\\s+and\\s+Electronic\\s+Communications\\s+Regulations",
  ])
    assert.match(legal, new RegExp(law));
  assert.doesNotMatch(legal + shell, /Impressum|GmbH|Deutschland|DSGVO/);
});

test("Phase 21 launch preflight fails closed on company identity and legal approval evidence", () => {
  const preflight = read("scripts/verify-launch-env.mjs");
  const workflow = read(".github/workflows/release-readiness.yml");
  for (const name of [
    "VITE_LEGAL_REGISTERED_IN",
    "VITE_LEGAL_COMPANY_NUMBER",
    "LEGAL_COUNSEL_APPROVAL_REFERENCE",
    "LEGAL_COUNSEL_APPROVED_AT",
    "LEGAL_ICO_FEE_STATUS_CONFIRMED",
  ])
    assert.match(preflight + workflow, new RegExp(name));
  assert.doesNotMatch(
    preflight + workflow,
    /VITE_LEGAL_MANAGING_DIRECTOR|VITE_LEGAL_REGISTER(?:\W|$)/,
  );
});

test("Phase 21 uses a necessary-storage notice without pretending optional consent exists", () => {
  const banner = read("src/components/CookieBanner.tsx");
  const dictionary = read("src/lib/i18n.tsx");
  assert.match(banner + dictionary, /necessary storage/i);
  assert.match(banner + dictionary, /Continue/);
  assert.doesNotMatch(banner, /Accept all|Reject all/);
});

test("Phase 21 active UK runtime contains no German interface copy", () => {
  const runtimeFiles = readdirSync(new URL("../src/routes", import.meta.url)).filter((file) =>
    file.endsWith(".tsx"),
  );
  const runtime =
    runtimeFiles.map((file) => read(`src/routes/${file}`)).join("\n") + read("src/lib/i18n.tsx");
  assert.doesNotMatch(
    runtime,
    /Impressum|Deutschland|Bäckerei|Kantine|Verletzung|Erkrankung|Schädlingsbefall|Entwurf|Gesendet|Abgelehnt|Qualität|Fremdkörper|Sonstiges|Sichtung|Köderstellenkontrolle/,
  );
});

test("Phase 21 replaces legacy bilingual database alerts with UK English runtime functions", () => {
  const migration = read("supabase/migrations/20260807010000_uk_english_alert_cleanup.sql");
  for (const title of ["Temperature out of range", "Expiring soon", "High-severity incident"])
    assert.match(migration, new RegExp(title));
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.tg_temp_alert/);
  assert.match(migration, /UPDATE public\.alerts/);
});
