import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const required = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "PAYMENT_ACCEPTANCE_ALLOWED_SUPABASE_URL",
  "PAYMENT_ACCEPTANCE_CONFIRM",
  "PAYMENT_ACCEPTANCE_OWNER_EMAIL",
  "PAYMENT_ACCEPTANCE_PLATFORM_EMAIL",
  "PAYMENT_ACCEPTANCE_PASSWORD",
  "PAYMENT_ACCEPTANCE_ORGANIZATION_ID",
  "PAYMENT_ACCEPTANCE_EXPECTED",
];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing ${key}.`);
}
if (process.env.PAYMENT_ACCEPTANCE_CONFIRM !== "HACCORA_PAYMENT_STATE_OBSERVATION") {
  throw new Error("Refusing to continue without the payment state-observation confirmation.");
}
if (process.env.SUPABASE_URL !== process.env.PAYMENT_ACCEPTANCE_ALLOWED_SUPABASE_URL) {
  throw new Error("Refusing to continue: the exact Supabase URL is not allow-listed.");
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(process.env.SUPABASE_URL)) {
  throw new Error("SUPABASE_URL must be an HTTPS Supabase project origin.");
}

const expected = process.env.PAYMENT_ACCEPTANCE_EXPECTED;
if (!["healthy", "past_due", "restricted", "recovered"].includes(expected)) {
  throw new Error(
    "PAYMENT_ACCEPTANCE_EXPECTED must be healthy, past_due, restricted or recovered.",
  );
}
const organizationId = process.env.PAYMENT_ACCEPTANCE_ORGANIZATION_ID;
if (
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)
) {
  throw new Error("PAYMENT_ACCEPTANCE_ORGANIZATION_ID must be a UUID.");
}

const checks = [];
const record = (ok, label, detail = "") => {
  checks.push({ ok, label, detail });
  process.stdout.write(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}\n`);
};
const newClient = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

async function signIn(email) {
  const supabase = newClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: process.env.PAYMENT_ACCEPTANCE_PASSWORD,
  });
  if (error || !data.user) throw new Error("A payment acceptance identity could not authenticate.");
  return supabase;
}

const owner = await signIn(process.env.PAYMENT_ACCEPTANCE_OWNER_EMAIL);
const platform = await signIn(process.env.PAYMENT_ACCEPTANCE_PLATFORM_EMAIL);
try {
  const [{ data: context, error: contextError }, { data: subscription, error: subscriptionError }] =
    await Promise.all([
      owner.rpc("get_my_context"),
      owner
        .from("subscriptions")
        .select("organization_id, status, updated_at")
        .eq("organization_id", organizationId)
        .maybeSingle(),
    ]);
  const { data: creditCases, error: creditError } = await platform.rpc(
    "get_platform_credit_control_cases",
  );
  const creditCase = (creditCases ?? []).find((item) => item.organization_id === organizationId);

  record(
    !contextError && context?.organization_id === organizationId,
    "Owner identity matches tenant",
  );
  record(!contextError && context?.role === "owner", "Acceptance identity has the owner role");
  record(
    !subscriptionError && Boolean(subscription),
    "Owner can read the provider-derived subscription",
  );
  record(!creditError, "Platform operator can read the audited credit-control queue");

  const subscriptionStatus = subscription?.status ?? null;
  const serviceStatus = context?.service_status ?? null;
  const creditStatus = creditCase?.status ?? null;
  const notificationStage = creditCase?.last_notified_stage ?? null;

  if (expected === "healthy") {
    record(["active", "trialing"].includes(subscriptionStatus), "Subscription is current");
    record(serviceStatus === "active", "Tenant service is active");
    record(!creditCase || creditStatus === "resolved", "No unresolved credit-control case remains");
  }
  if (expected === "past_due") {
    record(subscriptionStatus === "past_due", "Subscription is past due");
    record(serviceStatus === "active", "Tenant remains active during its payment grace period");
    record(
      ["open", "contacted", "promise_to_pay"].includes(creditStatus),
      "Credit-control case is actionable",
    );
    record(
      ["payment_failed", "payment_reminder", "final_reminder"].includes(notificationStage),
      "A missed-payment notification stage was recorded",
    );
  }
  if (expected === "restricted") {
    record(
      ["past_due", "canceled", "unpaid", "paused", "incomplete_expired"].includes(
        subscriptionStatus,
      ),
      "Subscription requires payment action",
    );
    record(
      serviceStatus === "restricted",
      "Tenant service is restricted without deleting evidence",
    );
    record(creditStatus === "restricted", "Credit-control case is restricted");
    record(
      notificationStage === "access_restricted",
      "Restriction notification stage was recorded",
    );
  }
  if (expected === "recovered") {
    record(["active", "trialing"].includes(subscriptionStatus), "Stripe recovery is reflected");
    record(serviceStatus === "active", "Tenant access recovered automatically");
    record(creditStatus === "resolved", "Credit-control case resolved automatically");
    record(notificationStage === "payment_restored", "Recovery notification stage was recorded");
  }

  const evidence = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    expectedState: expected,
    organizationId,
    observed: { subscriptionStatus, serviceStatus, creditStatus, notificationStage },
    checks,
    passed: checks.every((check) => check.ok),
    note: "This check does not mutate payment state. The platform query creates its normal audit event; provider delivery logs remain separate evidence.",
  };
  const output = path.resolve(
    process.cwd(),
    process.env.PAYMENT_ACCEPTANCE_OUTPUT ?? "release-evidence/payment-lifecycle-state.json",
  );
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  if (!evidence.passed) process.exitCode = 1;
  else process.stdout.write(`\nPayment lifecycle state '${expected}' verified.\n`);
} finally {
  await Promise.all([owner.auth.signOut(), platform.auth.signOut()]);
}
