import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("tenant ownership is approval-only and self-service workspace creation is revoked", async () => {
  const [migration, platformAdmin, login, onboarding] = await Promise.all([
    read("supabase/migrations/20260828120000_approval_only_tenant_access.sql"),
    read("supabase/functions/platform-admin/index.ts"),
    read("src/routes/login.tsx"),
    read("src/routes/onboarding.tsx"),
  ]);

  assert.match(
    migration,
    /revoke all on function public\.bootstrap_my_organization[\s\S]*authenticated/i,
  );
  assert.match(migration, /access_approved_at/);
  assert.match(migration, /access_approved_by/);
  assert.match(migration, /access_approval_type/);
  assert.match(platformAdmin, /access_approved_by: actor\.id/);
  assert.match(platformAdmin, /setUTCMonth\(trialEndsAt\.getUTCMonth\(\) \+ 2\)/);
  assert.match(login, /invitationSignup/);
  assert.match(login, /Tenant owner accounts are approval-only/);
  assert.doesNotMatch(onboarding, /bootstrap_my_organization/);
  assert.match(onboarding, /two-month trial/i);
});

test("tenant capacity changes require a current approved plan and a premises assignment", async () => {
  const [migration, invite, organisation] = await Promise.all([
    read("supabase/migrations/20260828120000_approval_only_tenant_access.sql"),
    read("supabase/functions/team-invite/index.ts"),
    read("src/routes/app.organisation.tsx"),
  ]);

  assert.match(migration, /tenant_capacity_changes_allowed/);
  assert.match(migration, /subscription\.status in \('active', 'trialing'\)/);
  assert.match(migration, /tenant_invitation_approval_guard/);
  assert.match(migration, /tenant_membership_approval_guard/);
  assert.match(migration, /tenant_location_approval_guard/);
  assert.match(migration, /default_location_id/);
  assert.match(invite, /locationId: z\.string\(\)\.uuid\(\)/);
  assert.match(invite, /default_location_id: assignedLocation\.id/);
  assert.match(organisation, /Assign a premises/);
  assert.match(organisation, /capacityChangesAllowed/);
});

test("missed payments create notifications and an auditable credit-control queue", async () => {
  const [
    migration,
    billing,
    operations,
    shell,
    accountStatus,
    platform,
    nativeBilling,
    push,
    terms,
  ] = await Promise.all([
    read("supabase/migrations/20260828120000_approval_only_tenant_access.sql"),
    read("supabase/functions/billing/index.ts"),
    read("supabase/functions/operations-dispatch/index.ts"),
    read("src/routes/app.tsx"),
    read("src/routes/account-status.tsx"),
    read("src/routes/platform.tsx"),
    read("mobile/app/billing.tsx"),
    read("mobile/lib/push.ts"),
    read("src/lib/legal-content.tsx"),
  ]);

  assert.match(migration, /payment_failed_at/);
  assert.match(migration, /grace_ends_at/);
  assert.match(migration, /reconcile_billing_access/);
  assert.match(migration, /platform_credit_control_cases/);
  assert.match(migration, /sync_credit_control_case/);
  assert.match(migration, /payment_reminder/);
  assert.match(migration, /final_reminder/);
  assert.match(migration, /notification_outbox/);
  assert.match(migration, /platform_manage_credit_control_case/);
  assert.match(migration, /interval 'seven days'|seven-day/i);
  assert.match(billing, /status === "past_due"/);
  assert.match(billing, /7 \* 86400000/);
  assert.match(billing, /service_status_reason[\s\S]*\[billing\]/);
  assert.match(billing, /\.like\("service_status_reason", "\[billing\]%"\)/);
  assert.match(billing, /invoice\.payment_failed/);
  assert.match(billing, /sync_credit_control_case/);
  assert.match(operations, /reconcile_billing_access/);
  assert.match(shell, /Resolve payment/);
  assert.match(accountStatus, /billing portal/i);
  assert.match(platform, /Credit-control queue/);
  assert.match(platform, /Promise to pay/);
  assert.match(nativeBilling, /Open secure billing/);
  assert.match(push, /"\/billing"/);
  assert.match(terms, /seven-day grace period/i);
  assert.match(terms, /without deleting customer evidence/i);
});
