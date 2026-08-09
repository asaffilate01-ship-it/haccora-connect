import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const [
  migration,
  platform,
  organisation,
  platformAdmin,
  teamInvite,
  billing,
  webScanner,
  webAsset,
  nativeScanner,
  nativeAsset,
  mobileConfig,
  privacyMap,
  ci,
] = await Promise.all([
  read("supabase/migrations/20260809150000_saas_control_plane_and_asset_scan_evidence.sql"),
  read("src/routes/platform.tsx"),
  read("src/routes/app.organisation.tsx"),
  read("supabase/functions/platform-admin/index.ts"),
  read("supabase/functions/team-invite/index.ts"),
  read("supabase/functions/billing/index.ts"),
  read("src/routes/app.assets.scan.tsx"),
  read("src/routes/app.assets.$assetId.tsx"),
  read("mobile/app/scan-asset.tsx"),
  read("mobile/app/assets/[assetId].tsx"),
  read("mobile/app.json"),
  read("mobile/store/PRIVACY_DATA_MAP.md"),
  read(".github/workflows/ci.yml"),
]);

test("Phase 28 provides an audited GBP SaaS owner financial and tenant control plane", () => {
  assert.match(migration, /create table if not exists public\.platform_plan_catalog/i);
  assert.match(migration, /'solo', 'Solo', 999/);
  assert.match(migration, /'complete', 'Complete', 2499/);
  assert.match(migration, /'group', 'Small Group', 5999/);
  assert.match(migration, /currency = 'gbp'/i);
  assert.match(migration, /create or replace function public\.get_platform_dashboard/i);
  assert.match(migration, /'mrr_pence'/);
  assert.match(migration, /'arr_pence'/);
  assert.match(migration, /'financial_access', v_role in \('platform_owner','platform_auditor'\)/);
  assert.match(migration, /else null end/);
  assert.match(migration, /'asset_scans_30d'/);
  assert.match(migration, /create or replace function public\.platform_manage_tenant/i);
  assert.match(migration, /platform_owner.*platform_operator_role/s);
  assert.match(migration, /seat limit is below current active staff volume/);
  assert.match(migration, /site limit is below current active premises volume/);
  assert.match(migration, /'platform_tenant_' \|\| p_action/);
  assert.match(migration, /platform_audit_events_immutable/);
  assert.match(migration, /Governance audit history is append-only/);
});

test("the SaaS owner dashboard wires finance, volume, lifecycle, subscriptions and operators", () => {
  for (const rpc of [
    "get_platform_dashboard",
    "get_platform_customers_v2",
    "get_platform_plans",
    "get_platform_operators",
    "platform_manage_tenant",
    "platform_manage_operator",
  ])
    assert.match(platform, new RegExp(rpc));
  assert.match(platform, /MRR/);
  assert.match(platform, /ARR/);
  assert.match(platform, /Evidence volume/);
  assert.match(platform, /Freeze/);
  assert.match(platform, /Unfreeze/);
  assert.match(platform, /Restore/);
  assert.match(platform, /Save plan/);
  assert.match(platform, /SaaS staff/);
  assert.match(platform, /platform-admin/);
});

test("tenant administration is subscription-bound, role-bounded and RPC-only", () => {
  assert.match(migration, /create table if not exists public\.organization_roles/i);
  assert.match(migration, /custom_roles_limit/);
  assert.match(migration, /role contains permissions above its safe base role/);
  assert.match(migration, /subscription custom role limit reached/);
  assert.match(migration, /subscription seat limit reached/);
  assert.match(migration, /subscription location limit reached/);
  assert.match(migration, /organization_memberships_subscription_guard/);
  assert.match(migration, /organization_invitations_subscription_guard/);
  assert.match(
    migration,
    /revoke insert, update, delete on public\.organization_memberships from authenticated/i,
  );
  assert.match(migration, /revoke insert, update, delete on public\.locations from authenticated/i);
  assert.match(migration, /tenant_admin_events_immutable/);
  assert.match(teamInvite, /assert_tenant_invite_allowed/);
  assert.match(teamInvite, /role_profile_id/);
  for (const rpc of [
    "get_tenant_admin_overview",
    "get_tenant_team",
    "get_tenant_locations",
    "manage_tenant_member",
    "manage_tenant_location",
    "save_tenant_role",
  ])
    assert.match(organisation, new RegExp(rpc));
});

test("custom roles remain a restrictive layer over built-in tenant RLS", () => {
  assert.match(migration, /create or replace function public\.custom_role_allows/i);
  for (const domain of [
    "recipes",
    "ingredients",
    "recipe_ingredients",
    "purchase_orders",
    "purchase_order_lines",
    "haccp",
    "incidents",
    "audits",
    "recalls",
    "shifts",
  ])
    assert.match(migration, new RegExp(`custom_role_${domain}.*as restrictive`, "i"));
  assert.match(migration, /has_org_permission\(organization_id, 'assets\.manage'\)/);
  assert.match(migration, /has_org_permission\(organization_id, 'assets\.record'\)/);
  assert.match(migration, /organization\.service_status = 'active'/);
});

test("platform provisioning is owner-authenticated, UK-only and rolls back failed invitations", () => {
  assert.match(platformAdmin, /get_my_platform_context/);
  assert.match(platformAdmin, /role !== "platform_owner"/);
  assert.match(platformAdmin, /country_code: "GB"/);
  assert.match(platformAdmin, /timezone: "Europe\/London"/);
  assert.match(platformAdmin, /currency: "gbp"/);
  assert.match(platformAdmin, /organization_memberships/);
  assert.match(platformAdmin, /platform_tenant_created/);
  assert.match(platformAdmin, /auth\.admin\.deleteUser/);
  assert.match(ci, /platform-admin\/index\.ts/);
});

test("QR scans bind equipment identity, server time, consented GPS and the subsequent reading", () => {
  assert.match(migration, /create table if not exists public\.asset_scans/i);
  assert.match(migration, /scanner_user_id uuid not null/);
  assert.match(migration, /scanned_at timestamptz not null default clock_timestamp\(\)/);
  assert.match(migration, /asset_scans_immutable/);
  assert.match(migration, /create or replace function public\.record_asset_scan/i);
  assert.match(migration, /asset\.qr_token = p_qr_token/);
  assert.match(migration, /invalid GPS accuracy/);
  assert.match(migration, /scan_record\.scanner_user_id = auth\.uid\(\)/);
  assert.match(migration, /scan_record\.scanned_at >= clock_timestamp\(\) - interval '12 hours'/);
  assert.match(migration, /new\.scan_recorded_at := v_scan\.scanned_at/);
  assert.match(migration, /new\.scan_latitude := v_scan\.latitude/);
  assert.match(webScanner, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(webScanner, /record_asset_scan/);
  assert.match(webAsset, /scan_session_id: activeScan\?\.scan_session_id/);
  assert.match(nativeScanner, /Location\.getCurrentPositionAsync/);
  assert.match(nativeScanner, /record_asset_scan/);
  assert.match(nativeAsset, /scan_session_id: activeScan\?\.id/);
  assert.match(mobileConfig, /NSLocationWhenInUseUsageDescription/);
  assert.match(privacyMap, /Precise location/);
});

test("billing exposes the commercial UK plans and persists the signed Stripe plan", () => {
  assert.match(billing, /STRIPE_PRICE_SOLO/);
  assert.match(billing, /STRIPE_PRICE_COMPLETE/);
  assert.match(billing, /STRIPE_PRICE_GROUP/);
  assert.match(billing, /haccora_plan/);
  assert.match(billing, /stripe-signature/);
  assert.doesNotMatch(billing, /STRIPE_PRICE_PRO/);
});
