import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  DEMO_LOCATION_ID,
  DEMO_ORGANIZATION_ID,
  ISOLATION_ORGANIZATION_ID,
  demoEmails,
  requireDemoEnvironment,
} from "./demo-client-config.mjs";

const { url, publishableKey, serviceKey } = requireDemoEnvironment();
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 16) {
  throw new Error("DEMO_PASSWORD must contain at least 16 characters.");
}

const emails = demoEmails();
const checks = [];
const record = (ok, label, detail = "") => {
  checks.push(ok);
  process.stdout.write(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}\n`);
};

function client() {
  return createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const sensitiveTenantTables = [
  "assets",
  "asset_events",
  "cleaning_completions",
  "corrective_actions",
  "documents",
  "goods_in_logs",
  "training_records",
];

async function tenantBoundary(supabase, table, organizationId) {
  const { data, error } = await supabase.from(table).select("organization_id").limit(1_000);
  if (error) return { ok: false, detail: error.message };
  const foreign = (data ?? []).filter((row) => row.organization_id !== organizationId);
  return {
    ok: foreign.length === 0,
    detail: `${data?.length ?? 0} visible row(s), ${foreign.length} foreign`,
  };
}

async function visibleOrganizationIds(supabase) {
  const { data, error } = await supabase.from("organizations").select("id").order("id");
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

async function visibleCount(supabase, table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function signIn(email) {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  return supabase;
}

const platform = await signIn(emails.platformOwner);
const [
  { data: platformContext, error: platformContextError },
  { data: overview, error: overviewError },
  { data: customers, error: customerError },
] = await Promise.all([
  platform.rpc("get_my_platform_context"),
  platform.rpc("get_platform_overview"),
  platform.rpc("get_platform_customers"),
]);
record(
  !platformContextError && platformContext?.role === "platform_owner",
  "SaaS owner receives the platform_owner context",
);
record(
  !overviewError && Number(overview?.organizations_total) >= 2,
  "SaaS owner can open the audited aggregate overview",
);
record(
  !customerError &&
    Array.isArray(customers) &&
    customers.some((customer) => customer.organization_id === DEMO_ORGANIZATION_ID) &&
    customers.some((customer) => customer.organization_id === ISOLATION_ORGANIZATION_ID),
  "SaaS owner can read audited customer-account metadata",
);
record(
  (await visibleOrganizationIds(platform)).length === 0 &&
    (await visibleCount(platform, "temperature_logs")) === 0 &&
    (await visibleCount(platform, "subscriptions")) === 0,
  "SaaS owner does not bypass tenant RLS",
);
for (const table of sensitiveTenantTables) {
  record(
    (await visibleCount(platform, table)) === 0,
    `SaaS owner receives no direct ${table} evidence`,
  );
}
record(
  (await visibleCount(platform, "platform_audit_events")) >= 1,
  "SaaS overview access creates a readable audit event",
);
await platform.auth.signOut();

const tenantCases = [
  {
    label: "Tenant admin",
    email: emails.owner,
    role: "owner",
    organizationId: DEMO_ORGANIZATION_ID,
    membershipCount: 4,
    subscriptionCount: 1,
    temperatureCount: 2,
  },
  {
    label: "Manager",
    email: emails.manager,
    role: "manager",
    organizationId: DEMO_ORGANIZATION_ID,
    membershipCount: 4,
    subscriptionCount: 0,
    temperatureCount: 2,
  },
  {
    label: "Chef",
    email: emails.chef,
    role: "chef",
    organizationId: DEMO_ORGANIZATION_ID,
    membershipCount: 1,
    subscriptionCount: 0,
    temperatureCount: 2,
  },
  {
    label: "Staff",
    email: emails.staff,
    role: "staff",
    organizationId: DEMO_ORGANIZATION_ID,
    membershipCount: 1,
    subscriptionCount: 0,
    temperatureCount: 2,
  },
  {
    label: "Inspector",
    email: emails.inspector,
    role: "inspector",
    organizationId: DEMO_ORGANIZATION_ID,
    membershipCount: 0,
    subscriptionCount: 0,
    temperatureCount: 2,
  },
  {
    label: "Isolation owner",
    email: emails.isolationOwner,
    role: "owner",
    organizationId: ISOLATION_ORGANIZATION_ID,
    membershipCount: 1,
    subscriptionCount: 1,
    temperatureCount: 1,
  },
];

for (const testCase of tenantCases) {
  const supabase = await signIn(testCase.email);
  const { data: context, error: contextError } = await supabase.rpc("get_my_context");
  record(
    !contextError &&
      context?.role === testCase.role &&
      context?.organization_id === testCase.organizationId,
    `${testCase.label} receives the correct tenant context`,
  );

  const organizationIds = await visibleOrganizationIds(supabase);
  record(
    organizationIds.length === 1 && organizationIds[0] === testCase.organizationId,
    `${testCase.label} sees only its granted organization`,
    organizationIds.join(", ") || "no organization visible",
  );
  record(
    (await visibleCount(supabase, "organization_memberships")) === testCase.membershipCount,
    `${testCase.label} membership visibility matches policy`,
  );
  record(
    (await visibleCount(supabase, "subscriptions")) === testCase.subscriptionCount,
    `${testCase.label} billing visibility matches policy`,
  );
  record(
    (await visibleCount(supabase, "temperature_logs")) === testCase.temperatureCount,
    `${testCase.label} cannot read the other tenant's temperature evidence`,
  );
  for (const table of sensitiveTenantTables) {
    const boundary = await tenantBoundary(supabase, table, testCase.organizationId);
    record(
      boundary.ok,
      `${testCase.label} ${table} visibility remains tenant scoped`,
      boundary.detail,
    );
  }

  if (testCase.role === "inspector") {
    const attemptId = randomUUID();
    const { data: authData } = await supabase.auth.getUser();
    const { data: inserted, error: insertError } = await supabase
      .from("temperature_logs")
      .insert({
        id: attemptId,
        user_id: authData.user?.id,
        organization_id: DEMO_ORGANIZATION_ID,
        location_id: DEMO_LOCATION_ID,
        location: "Inspector write-denial probe",
        reading: 4,
        target_min: 0,
        target_max: 5,
        status: "ok",
        note: "This staging-only row must be rejected by RLS",
      })
      .select("id");
    record(
      Boolean(insertError) && !(inserted ?? []).length,
      "Inspector cannot create operational evidence",
    );
    if ((inserted ?? []).length) {
      await admin.from("temperature_logs").delete().eq("id", attemptId);
    }
  }

  const { error: forbiddenPlatformError } = await supabase.rpc("get_platform_overview");
  record(
    Boolean(forbiddenPlatformError),
    `${testCase.label} cannot call the SaaS operator overview`,
  );
  const { error: forbiddenCustomerError } = await supabase.rpc("get_platform_customers");
  record(
    Boolean(forbiddenCustomerError),
    `${testCase.label} cannot call the SaaS customer directory`,
  );
  await supabase.auth.signOut();
}

if (checks.every(Boolean)) {
  process.stdout.write(`\nDemo role/RLS access verified (${checks.length} checks).\n`);
} else {
  process.stderr.write(
    `\nDemo role/RLS access failed (${checks.filter(Boolean).length}/${checks.length}).\n`,
  );
  process.exitCode = 1;
}
