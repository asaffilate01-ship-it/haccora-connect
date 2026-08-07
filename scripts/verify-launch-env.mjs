import { readFile } from "node:fs/promises";

const failures = [];
const value = (name) => (process.env[name] ?? "").trim();
const placeholder = /(replace|your_project|example\.com|example\.supabase|set_with)/i;

function requireValue(name) {
  const current = value(name);
  if (!current) failures.push(`${name} is missing`);
  else if (placeholder.test(current)) failures.push(`${name} still contains a placeholder`);
  return current;
}

function requireHttps(name) {
  const current = requireValue(name);
  if (!current) return;
  try {
    const parsed = new URL(current);
    if (parsed.protocol !== "https:") failures.push(`${name} must use HTTPS`);
  } catch {
    failures.push(`${name} is not a valid URL`);
  }
}

function requireHttpsList(name) {
  const current = requireValue(name);
  for (const entry of current
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)) {
    try {
      const parsed = new URL(entry);
      if (parsed.protocol !== "https:") failures.push(`${name} entries must use HTTPS`);
    } catch {
      failures.push(`${name} contains an invalid URL`);
    }
  }
}

function requireSecret(name, minimumLength = 32) {
  const current = requireValue(name);
  if (current && current.length < minimumLength) {
    failures.push(`${name} must contain at least ${minimumLength} characters`);
  }
}

function requireIsoDate(name) {
  const current = requireValue(name);
  if (!current) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(current) || Number.isNaN(Date.parse(`${current}T00:00:00Z`))) {
    failures.push(`${name} must be a valid date in YYYY-MM-DD format`);
  }
}

for (const name of [
  "VITE_SUPABASE_URL",
  "SUPABASE_URL",
  "PUBLIC_APP_URL",
  "MALWARE_SCAN_URL",
  "VITE_SUPPORT_URL",
  "VITE_STATUS_URL",
  "WEB_PUSH_GATEWAY_URL",
])
  requireHttps(name);
requireHttpsList("ALLOWED_ORIGINS");

for (const name of [
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "RESEND_API_KEY",
  "NOTIFICATION_FROM_EMAIL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_PRO",
  "MALWARE_SCAN_TOKEN",
  "VITE_WEB_PUSH_PUBLIC_KEY",
])
  requireValue(name);

for (const name of [
  "CONTACT_HASH_SALT",
  "CRON_SECRET",
  "INTEGRATION_ENCRYPTION_KEY",
  "WEB_PUSH_GATEWAY_TOKEN",
])
  requireSecret(name);

for (const name of [
  "VITE_LEGAL_COMPANY_NAME",
  "VITE_LEGAL_ADDRESS_LINE_1",
  "VITE_LEGAL_POSTAL_CITY",
  "VITE_LEGAL_REGISTERED_IN",
  "VITE_LEGAL_COMPANY_NUMBER",
  "VITE_LEGAL_EMAIL",
  "VITE_LEGAL_PHONE",
  "LEGAL_COUNSEL_APPROVAL_REFERENCE",
])
  requireValue(name);

requireIsoDate("LEGAL_COUNSEL_APPROVED_AT");

if (value("LEGAL_ICO_FEE_STATUS_CONFIRMED") !== "true") {
  failures.push(
    "LEGAL_ICO_FEE_STATUS_CONFIRMED must be true after documenting ICO registration or exemption",
  );
}

if (value("VITE_LEGAL_CONTENT_APPROVED") !== "true") {
  failures.push("VITE_LEGAL_CONTENT_APPROVED must be true after documented counsel approval");
}
if (value("STRIPE_LIVE_MODE") !== "true") {
  failures.push("STRIPE_LIVE_MODE must be true for a production launch");
}

const mobileConfig = JSON.parse(await readFile("mobile/app.json", "utf8"));
const projectId = String(mobileConfig?.expo?.extra?.eas?.projectId ?? "");
if (!projectId || placeholder.test(projectId)) {
  failures.push("mobile/app.json still has an EAS project placeholder");
}
if (!mobileConfig?.expo?.ios?.bundleIdentifier) {
  failures.push("mobile/app.json is missing the iOS bundle identifier");
}
if (!mobileConfig?.expo?.android?.package) {
  failures.push("mobile/app.json is missing the Android package identifier");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Production environment preflight passed.");
