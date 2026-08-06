export const DEMO_ORGANIZATION_ID = "d0000000-0000-4000-8000-000000000001";
export const DEMO_LOCATION_ID = "d0000000-0000-4000-8000-000000000002";
export const DEMO_ORGANIZATION_SLUG = "riverside-kitchen-demo";

export function requireDemoEnvironment() {
  const required = [
    "SUPABASE_URL",
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
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function demoEmails() {
  const domain = process.env.DEMO_EMAIL_DOMAIN ?? "example.test";
  if (!/^[a-z0-9.-]+$/i.test(domain)) throw new Error("DEMO_EMAIL_DOMAIN is invalid.");
  return {
    owner: `owner@${domain}`,
    manager: `manager@${domain}`,
    staff: `staff@${domain}`,
  };
}
