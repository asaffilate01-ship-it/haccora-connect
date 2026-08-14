import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("Phase 43 keeps the web install and fresh database reset deterministic", async () => {
  const [packageText, lockText, mobilePackageText, mobileLockText, roles, dailyCompliance] =
    await Promise.all([
      read("package.json"),
      read("package-lock.json"),
      read("mobile/package.json"),
      read("mobile/package-lock.json"),
      read("supabase/roles.sql"),
      read("supabase/migrations/20260803190000_uk_daily_compliance.sql"),
    ]);
  const packageJson = JSON.parse(packageText);
  const packageLock = JSON.parse(lockText);
  const mobilePackage = JSON.parse(mobilePackageText);
  const mobileLock = JSON.parse(mobileLockText);

  assert.equal(
    packageJson.devDependencies["@lovable.dev/vite-tanstack-config"],
    packageLock.packages[""].devDependencies["@lovable.dev/vite-tanstack-config"],
  );
  assert.equal(packageJson.overrides.nanoid, packageLock.packages["node_modules/nanoid"].version);
  assert.equal(
    mobilePackage.overrides.nanoid,
    mobileLock.packages["node_modules/nanoid"].version,
  );
  assert.equal(packageJson.overrides.nanoid, "3.3.18");
  assert.match(roles, /SELECT rolsuper/);
  assert.match(roles, /ELSIF NOT target_is_superuser/);
  assert.doesNotMatch(roles, /^ALTER ROLE sandbox_exec/m);
  assert.doesNotMatch(dailyCompliance, /ALTER TABLE [^;]+,[^;]+ ENABLE ROW LEVEL SECURITY/);
  assert.equal((dailyCompliance.match(/ENABLE ROW LEVEL SECURITY/g) ?? []).length, 4);
});

test("Phase 43 preserves protected auth redirects and canonical marketing URLs", async () => {
  const [appRoute, sitemap, envExample, legalRoute] = await Promise.all([
    read("src/routes/app.tsx"),
    read("src/routes/sitemap[.]xml.ts"),
    read(".env.example"),
    read("src/routes/legal.company-details.tsx"),
  ]);

  assert.match(appRoute, /authRedirectStarted = useRef\(false\)/);
  assert.match(appRoute, /pathname\.startsWith\("\/app"\) \? pathname : "\/app"/);
  assert.match(appRoute, /replace: true/);
  assert.match(sitemap, /process\.env\.PUBLIC_MARKETING_URL/);
  assert.doesNotMatch(sitemap, /process\.env\.PUBLIC_APP_URL/);
  assert.match(envExample, /PUBLIC_MARKETING_URL=https:\/\/haccora\.co\.uk/);
  assert.match(legalRoute, /legalPublishReady \? "index, follow" : "noindex, nofollow"/);
});

test("Phase 43 removes deceptive search UI and improves contact accessibility", async () => {
  const marketing = await read("src/routes/index.tsx");

  assert.match(marketing, /to="\/help"[\s\S]*Search the Haccora Help Centre/);
  assert.doesNotMatch(marketing, /placeholder=\{t\("nav\.search"\)/);
  for (const field of ["firstName", "lastName", "email", "phone", "businessName"]) {
    assert.match(
      marketing,
      new RegExp(`name="${field}"[\\s\\S]{0,100}aria-label=`),
    );
  }
  assert.match(marketing, /to="\/legal\/privacy"/);
  assert.match(marketing, /className="btn-red w-full/);
});
