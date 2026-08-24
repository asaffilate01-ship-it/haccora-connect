import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const [
  supabaseConfig,
  webQuickLog,
  webShell,
  mobileSession,
  mobileDashboard,
  mobileNav,
  mobileIndex,
  mobileAccountStatus,
  mobileAsset,
  mobileIncident,
  mobileGoodsIn,
  mobileScanner,
  legal,
  publicConfig,
  manifest,
  mobileConfig,
] = await Promise.all([
  read("supabase/config.toml"),
  read("src/routes/app.quick-log.tsx"),
  read("src/routes/app.tsx"),
  read("mobile/lib/session.tsx"),
  read("mobile/app/dashboard.tsx"),
  read("mobile/components/bottom-nav.tsx"),
  read("mobile/app/index.tsx"),
  read("mobile/app/account-status.tsx"),
  read("mobile/app/assets/[assetId].tsx"),
  read("mobile/app/incidents.tsx"),
  read("mobile/app/goods-in.tsx"),
  read("mobile/app/scan-asset.tsx"),
  read("src/lib/legal-content.tsx"),
  read("src/lib/public-config.ts"),
  read("public/manifest.webmanifest"),
  read("mobile/app.json"),
]);

test("platform-admin remains in the Supabase deployment manifest", () => {
  assert.match(supabaseConfig, /\[functions\.platform-admin\]\s+verify_jwt = false/);
});

test("PWA navigation has a persistent, role-filtered quick-log workflow", () => {
  assert.match(webShell, /\/app\/quick-log/);
  assert.match(webQuickLog, /canAccess\(user\.role/);
  assert.match(webQuickLog, /can\(user\.role, item\.action, user\.actionPermissions\)/);
  for (const route of [
    "temperature",
    "checks",
    "goodsin",
    "cleaning",
    "diary",
    "incidents",
    "assets\/scan",
  ])
    assert.match(webQuickLog, new RegExp(`/app/${route}`));
});

test("native Today is site-aware, compact and operational rather than a module catalogue", () => {
  for (const field of [
    "organizationName",
    "locationName",
    "roleName",
    "displayName",
    "actionPermissions",
    "serviceStatus",
  ])
    assert.match(mobileSession, new RegExp(field));
  assert.match(mobileDashboard, /TODAY'S ROUTINES/);
  assert.match(mobileDashboard, /NEXT REQUIRED ACTION/);
  assert.match(mobileDashboard, /Needs attention/);
  assert.match(mobileDashboard, /actionPermissions\.includes/);
  assert.match(mobileNav, /lucide-react-native/);
  assert.match(mobileNav, /router\.replace/);
});

test("frozen or closed tenants fail closed in native navigation", () => {
  assert.match(mobileIndex, /serviceStatus !== "active"/);
  assert.match(mobileIndex, /account-status/);
  assert.match(mobileAccountStatus, /records remain protected/);
  assert.match(mobileAccountStatus, /supabase\.auth\.signOut/);
});

test("native mutation screens respect subscription-defined effective actions", () => {
  assert.match(mobileAsset, /actionPermissions\.includes\("assets\.record"\)/);
  assert.match(mobileIncident, /actionPermissions\.includes\("incidents\.report"\)/);
  assert.match(mobileGoodsIn, /actionPermissions\.includes\("purchasing\.receive"\)/);
  assert.match(mobileScanner, /actionPermissions\.includes\("assets\.record"\)/);
});

test("Haccora identity and optional QR location transparency are consistent", () => {
  assert.match(publicConfig, /"iTechLounge Ltd"/);
  assert.match(publicConfig, /tradingName: withDefault\("VITE_LEGAL_TRADING_NAME", "Haccora"\)/);
  assert.match(
    publicConfig,
    /TRADING_STATEMENT = `\$\{PUBLIC_CONFIG\.legal\.tradingName\} is a trading name of \$\{PUBLIC_CONFIG\.legal\.companyName\}\.\`/,
  );
  assert.match(publicConfig, /haccora\.co\.uk/);
  assert.equal(JSON.parse(manifest).theme_color, "#c8102e");
  assert.equal(JSON.parse(mobileConfig).expo.name, "Haccora");
  assert.equal(JSON.parse(mobileConfig).expo.scheme, "haccora");
  assert.match(legal, /does not perform continuous or background location tracking/i);
  assert.match(legal, /data-protection impact\s+assessment/i);
  assert.match(legal, /Employment consent should not be treated as valid/i);
});
