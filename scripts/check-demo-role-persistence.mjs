import { createClient } from "@supabase/supabase-js";
import { demoEmails, requireDemoEnvironment } from "./demo-client-config.mjs";

const productionMode = process.env.HACCORA_ENV === "production";
let url;
let publishableKey;
let emails;
let password;

if (productionMode) {
  const required = [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "ROLE_PERSISTENCE_ALLOWED_SUPABASE_URL",
    "ROLE_PERSISTENCE_CONFIRM",
    "ROLE_ACCEPTANCE_PASSWORD",
    "ROLE_ACCEPTANCE_PLATFORM_OWNER_EMAIL",
    "ROLE_ACCEPTANCE_OWNER_EMAIL",
    "ROLE_ACCEPTANCE_MANAGER_EMAIL",
    "ROLE_ACCEPTANCE_CHEF_EMAIL",
    "ROLE_ACCEPTANCE_STAFF_EMAIL",
    "ROLE_ACCEPTANCE_INSPECTOR_EMAIL",
    "ROLE_ACCEPTANCE_ISOLATION_OWNER_EMAIL",
  ];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing ${key}.`);
  }
  if (process.env.ROLE_PERSISTENCE_CONFIRM !== "HACCORA_DESIGNATED_TEST_ACCOUNTS_ONLY") {
    throw new Error(
      "Refusing to mutate preferences without the production test-account confirmation.",
    );
  }
  if (process.env.SUPABASE_URL !== process.env.ROLE_PERSISTENCE_ALLOWED_SUPABASE_URL) {
    throw new Error("Refusing to continue: the exact Supabase URL is not allow-listed.");
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(process.env.SUPABASE_URL)) {
    throw new Error("SUPABASE_URL must be an HTTPS Supabase project origin.");
  }
  url = process.env.SUPABASE_URL;
  publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  password = process.env.ROLE_ACCEPTANCE_PASSWORD;
  emails = {
    platformOwner: process.env.ROLE_ACCEPTANCE_PLATFORM_OWNER_EMAIL,
    owner: process.env.ROLE_ACCEPTANCE_OWNER_EMAIL,
    manager: process.env.ROLE_ACCEPTANCE_MANAGER_EMAIL,
    chef: process.env.ROLE_ACCEPTANCE_CHEF_EMAIL,
    staff: process.env.ROLE_ACCEPTANCE_STAFF_EMAIL,
    inspector: process.env.ROLE_ACCEPTANCE_INSPECTOR_EMAIL,
    isolationOwner: process.env.ROLE_ACCEPTANCE_ISOLATION_OWNER_EMAIL,
  };
} else {
  ({ url, publishableKey } = requireDemoEnvironment());
  password = process.env.DEMO_PASSWORD;
  emails = demoEmails();
}

if (!password || password.length < 16) {
  throw new Error("The role acceptance password must contain at least 16 characters.");
}

const results = [];
const record = (ok, label, detail = "") => {
  results.push(ok);
  process.stdout.write(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}\n`);
};

function client() {
  return createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function signIn(email) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user)
    throw new Error(`Could not authenticate the ${email.split("@")[0]} role.`);
  return { supabase, user: data.user };
}

async function tenantOrganizationId(email) {
  const { supabase } = await signIn(email);
  try {
    const { data, error } = await supabase.rpc("get_my_context");
    if (error || !data?.organization_id) {
      throw new Error("A tenant acceptance identity has no active organization context.");
    }
    return data.organization_id;
  } finally {
    await supabase.auth.signOut();
  }
}

async function snapshotPreference(supabase, userId, organizationId) {
  const { data, error } = await supabase
    .from("user_experience_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function restorePreference(supabase, userId, organizationId, snapshot) {
  if (snapshot) {
    const { error: restoreError } = await supabase
      .from("user_experience_preferences")
      .upsert(snapshot, { onConflict: "user_id,organization_id" });
    if (restoreError) throw restoreError;
    return;
  }
  const { error: deleteError } = await supabase
    .from("user_experience_preferences")
    .delete()
    .eq("user_id", userId)
    .eq("organization_id", organizationId);
  if (deleteError) throw deleteError;
}

const [primaryOrganizationId, isolationOrganizationId] = await Promise.all([
  tenantOrganizationId(emails.owner),
  tenantOrganizationId(emails.isolationOwner),
]);
record(
  primaryOrganizationId !== isolationOrganizationId,
  "Primary and isolation identities resolve to different tenants",
);

const platform = await signIn(emails.platformOwner);
const platformAttempt = {
  user_id: platform.user.id,
  organization_id: primaryOrganizationId,
  locale: "en",
  default_station: "platform-denial-probe",
};
const { data: forbiddenPlatformRows, error: forbiddenPlatformError } = await platform.supabase
  .from("user_experience_preferences")
  .insert(platformAttempt)
  .select("user_id");
record(
  Boolean(forbiddenPlatformError) && !(forbiddenPlatformRows ?? []).length,
  "Platform owner cannot write tenant-scoped preferences",
);
if ((forbiddenPlatformRows ?? []).length) {
  await restorePreference(platform.supabase, platform.user.id, primaryOrganizationId, null);
}
await platform.supabase.auth.signOut();

const tenantCases = [
  ["Tenant admin", emails.owner, primaryOrganizationId],
  ["Manager", emails.manager, primaryOrganizationId],
  ["Chef", emails.chef, primaryOrganizationId],
  ["Staff", emails.staff, primaryOrganizationId],
  ["Inspector", emails.inspector, primaryOrganizationId],
  ["Isolation owner", emails.isolationOwner, isolationOrganizationId],
];

for (const [label, email, organizationId] of tenantCases) {
  let active;
  let userId;
  let snapshot;
  let snapshotCaptured = false;
  try {
    ({
      supabase: active,
      user: { id: userId },
    } = await signIn(email));
    snapshot = await snapshotPreference(active, userId, organizationId);
    snapshotCaptured = true;

    const { error: cleanError } = await active
      .from("user_experience_preferences")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", organizationId);
    record(!cleanError, `${label} can reset an existing preference row`);

    const createdStation = `acceptance-created-${label.toLowerCase().replaceAll(" ", "-")}`;
    const { data: created, error: createError } = await active
      .from("user_experience_preferences")
      .insert({
        user_id: userId,
        organization_id: organizationId,
        locale: "en",
        glove_mode: false,
        reduced_motion: false,
        high_contrast: false,
        biometric_lock: false,
        compact_mode: false,
        default_station: createdStation,
      })
      .select("default_station")
      .single();
    record(
      !createError && created?.default_station === createdStation,
      `${label} creates preferences`,
    );

    await active.auth.signOut();
    ({ supabase: active } = await signIn(email));
    const { data: reloaded, error: reloadError } = await active
      .from("user_experience_preferences")
      .select("default_station, glove_mode, compact_mode")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .single();
    record(
      !reloadError && reloaded?.default_station === createdStation,
      `${label} reloads the persisted row in a new authenticated session`,
    );

    const updatedStation = `acceptance-updated-${label.toLowerCase().replaceAll(" ", "-")}`;
    const { data: updated, error: updateError } = await active
      .from("user_experience_preferences")
      .update({ glove_mode: true, compact_mode: true, default_station: updatedStation })
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .select("default_station, glove_mode, compact_mode")
      .single();
    record(
      !updateError &&
        updated?.default_station === updatedStation &&
        updated.glove_mode === true &&
        updated.compact_mode === true,
      `${label} updates the persisted row`,
    );

    await active.auth.signOut();
    ({ supabase: active } = await signIn(email));
    const { data: updatedReload, error: updatedReloadError } = await active
      .from("user_experience_preferences")
      .select("default_station, glove_mode, compact_mode")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .single();
    record(
      !updatedReloadError &&
        updatedReload?.default_station === updatedStation &&
        updatedReload.glove_mode === true &&
        updatedReload.compact_mode === true,
      `${label} reloads the update in another authenticated session`,
    );

    const foreignOrganizationId =
      organizationId === primaryOrganizationId ? isolationOrganizationId : primaryOrganizationId;
    const { data: foreignRows, error: foreignError } = await active
      .from("user_experience_preferences")
      .insert({
        user_id: userId,
        organization_id: foreignOrganizationId,
        locale: "en",
        default_station: "cross-tenant-denial-probe",
      })
      .select("organization_id");
    record(
      Boolean(foreignError) && !(foreignRows ?? []).length,
      `${label} cannot create preferences in the other tenant`,
    );
    if ((foreignRows ?? []).length) {
      await restorePreference(active, userId, foreignOrganizationId, null);
    }

    const { error: deleteError } = await active
      .from("user_experience_preferences")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", organizationId);
    const { data: deletedRows, error: deletedReadError } = await active
      .from("user_experience_preferences")
      .select("user_id")
      .eq("user_id", userId)
      .eq("organization_id", organizationId);
    record(
      !deleteError && !deletedReadError && (deletedRows ?? []).length === 0,
      `${label} deletes the row and observes the deletion`,
    );
  } finally {
    if (active && userId && snapshotCaptured) {
      await restorePreference(active, userId, organizationId, snapshot);
    }
    if (active) await active.auth.signOut();
  }
}

if (results.every(Boolean)) {
  process.stdout.write(`\nAuthenticated role persistence verified (${results.length} checks).\n`);
} else {
  process.stderr.write(
    `\nAuthenticated role persistence failed (${results.filter(Boolean).length}/${results.length}).\n`,
  );
  process.exitCode = 1;
}
