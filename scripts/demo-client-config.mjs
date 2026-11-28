export const DEMO_ORGANIZATION_ID = "d0000000-0000-4000-8000-000000000001";
export const DEMO_LOCATION_ID = "d0000000-0000-4000-8000-000000000002";
export const DEMO_ORGANIZATION_SLUG = "riverside-kitchen-demo";
export const ISOLATION_ORGANIZATION_ID = "d0000000-0000-4000-8000-000000000003";
export const ISOLATION_LOCATION_ID = "d0000000-0000-4000-8000-000000000004";
export const ISOLATION_ORGANIZATION_SLUG = "harbour-cafe-isolation-demo";

export function requireDemoEnvironment() {
  const required = [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DEMO_ALLOWED_SUPABASE_URL",
    "DEMO_SEED_CONFIRM",
  ];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing ${key}. Load a private .env.demo file.`);
  }
  if (process.env.DEMO_SEED_CONFIRM !== "HACCORA_DEMO_ONLY") {
    throw new Error("Refusing to continue: DEMO_SEED_CONFIRM is not HACCORA_DEMO_ONLY.");
  }
  if (process.env.SUPABASE_URL !== process.env.DEMO_ALLOWED_SUPABASE_URL) {
    throw new Error("Refusing to continue: the exact demo Supabase URL is not allow-listed.");
  }
  if (
    /prod(?:uction)?/i.test(process.env.NODE_ENV ?? "") ||
    /prod(?:uction)?/i.test(process.env.HACCORA_ENV ?? "")
  ) {
    throw new Error("Refusing to seed or verify while a production environment is selected.");
  }
  return {
    url: process.env.SUPABASE_URL,
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function demoEmails(env = process.env) {
  const domain = env.DEMO_EMAIL_DOMAIN || "example.test";
  if (!/^[a-z0-9.-]+$/i.test(domain)) throw new Error("DEMO_EMAIL_DOMAIN is invalid.");
  const identities = {
    platformOwner: `saas-owner@${domain}`,
    platformSupport: `saas-support@${domain}`,
    platformAuditor: `saas-auditor@${domain}`,
    owner: env.DEMO_OWNER_EMAIL?.trim().toLowerCase() || `tenant-admin@${domain}`,
    manager: `manager@${domain}`,
    chef: `chef@${domain}`,
    staff: `staff@${domain}`,
    inspector: `inspector@${domain}`,
    isolationOwner: `isolation-owner@${domain}`,
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identities.owner)) {
    throw new Error("DEMO_OWNER_EMAIL must be a valid email address.");
  }
  const addresses = Object.values(identities).map((email) => email.toLowerCase());
  if (new Set(addresses).size !== addresses.length) {
    throw new Error("Demo identities must use distinct email addresses.");
  }
  return identities;
}

/** A separately shared tenant-owner credential never doubles as an operator password. */
export function demoPasswordFor(email, env = process.env) {
  const identities = demoEmails(env);
  const password = env.DEMO_PASSWORD;
  if (!password || password.length < 16) {
    throw new Error("DEMO_PASSWORD must contain at least 16 characters.");
  }
  const ownerEmail = env.DEMO_OWNER_EMAIL?.trim();
  const ownerPassword = env.DEMO_OWNER_PASSWORD;
  if (ownerEmail || ownerPassword) {
    if (!ownerEmail || !ownerPassword || ownerPassword.length < 12 || ownerPassword === password) {
      throw new Error("Use a distinct demo owner email and a separate password of 12+ characters.");
    }
    if (email.toLowerCase() === identities.owner) return ownerPassword;
  }
  return password;
}
