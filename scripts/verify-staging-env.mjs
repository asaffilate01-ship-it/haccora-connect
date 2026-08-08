const failures = [];
const value = (name) => (process.env[name] ?? "").trim();
const projectRefPattern = /^[a-z0-9]{20}$/;
const fullCommitSha = /^[0-9a-f]{40}$/i;
const placeholder = /(replace|your[_-]|example\.com|set[_-]with)/i;

function requireValue(name) {
  const current = value(name);
  if (!current) failures.push(`${name} is missing`);
  else if (placeholder.test(current)) failures.push(`${name} still contains a placeholder`);
  return current;
}

function requireSecret(name, minimumLength) {
  const current = requireValue(name);
  if (current && current.length < minimumLength) {
    failures.push(`${name} must contain at least ${minimumLength} characters`);
  }
  return current;
}

function requireHttpsOrigin(name) {
  const current = requireValue(name);
  if (!current) return null;
  try {
    const parsed = new URL(current);
    if (parsed.protocol !== "https:") failures.push(`${name} must use HTTPS`);
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      failures.push(`${name} must be a clean HTTPS origin without credentials, query or fragment`);
    }
    if (parsed.pathname !== "/") failures.push(`${name} must not contain a path`);
    return parsed;
  } catch {
    failures.push(`${name} is not a valid URL`);
    return null;
  }
}

if (value("HACCORA_ENV") !== "staging") {
  failures.push("HACCORA_ENV must be staging");
}
if (/prod(?:uction)?/i.test(value("NODE_ENV"))) {
  failures.push("NODE_ENV must not select production during a staging rehearsal");
}
if (value("STAGING_DEPLOY_CONFIRM") !== "HACCORA_STAGING_ONLY") {
  failures.push("STAGING_DEPLOY_CONFIRM must be HACCORA_STAGING_ONLY");
}
if (value("DEMO_SEED_CONFIRM") !== "HACCORA_DEMO_ONLY") {
  failures.push("DEMO_SEED_CONFIRM must be HACCORA_DEMO_ONLY");
}

const stagingRef = requireValue("STAGING_PROJECT_REF");
const productionRef = requireValue("PRODUCTION_SUPABASE_PROJECT_REF");
if (stagingRef && !projectRefPattern.test(stagingRef)) {
  failures.push("STAGING_PROJECT_REF must be a 20-character Supabase project ref");
}
if (productionRef && !projectRefPattern.test(productionRef)) {
  failures.push("PRODUCTION_SUPABASE_PROJECT_REF must be a 20-character Supabase project ref");
}
if (stagingRef && productionRef && stagingRef === productionRef) {
  failures.push("The staging and production Supabase project refs must be different");
}

const stagingSupabase = requireHttpsOrigin("STAGING_SUPABASE_URL");
const runtimeSupabase = requireHttpsOrigin("SUPABASE_URL");
const allowedDemoSupabase = requireHttpsOrigin("DEMO_ALLOWED_SUPABASE_URL");
if (stagingSupabase && stagingRef) {
  const expectedOrigin = `https://${stagingRef}.supabase.co`;
  if (stagingSupabase.origin !== expectedOrigin) {
    failures.push("STAGING_SUPABASE_URL must match STAGING_PROJECT_REF exactly");
  }
}
if (stagingSupabase && runtimeSupabase && stagingSupabase.origin !== runtimeSupabase.origin) {
  failures.push("SUPABASE_URL must match STAGING_SUPABASE_URL");
}
if (
  stagingSupabase &&
  allowedDemoSupabase &&
  stagingSupabase.origin !== allowedDemoSupabase.origin
) {
  failures.push("DEMO_ALLOWED_SUPABASE_URL must match STAGING_SUPABASE_URL");
}

const stagingApp = requireHttpsOrigin("STAGING_APP_URL");
const productionApp = requireHttpsOrigin("PRODUCTION_APP_URL");
if (stagingApp && productionApp && stagingApp.origin === productionApp.origin) {
  failures.push("The staging and production application origins must be different");
}

const expectedRelease = requireValue("EXPECTED_RELEASE_SHA");
if (expectedRelease && !fullCommitSha.test(expectedRelease)) {
  failures.push("EXPECTED_RELEASE_SHA must be a full 40-character Git commit SHA");
}

requireSecret("SUPABASE_PUBLISHABLE_KEY", 20);
requireSecret("SUPABASE_SERVICE_ROLE_KEY", 32);
requireSecret("SUPABASE_ACCESS_TOKEN", 20);
requireSecret("SUPABASE_DB_PASSWORD", 16);
requireSecret("DEMO_PASSWORD", 16);
requireValue("DEMO_EMAIL_DOMAIN");

if (value("STAGING_APPLY_CHANGES") === "true") {
  if (value("STAGING_BACKUP_OR_DISPOSABLE_CONFIRMED") !== "true") {
    failures.push(
      "STAGING_BACKUP_OR_DISPOSABLE_CONFIRMED must be true before applying remote changes",
    );
  }
} else if (value("STAGING_APPLY_CHANGES") !== "false") {
  failures.push("STAGING_APPLY_CHANGES must be either true or false");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Protected staging environment preflight passed.");
