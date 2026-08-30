import { VAPID_PUBLIC_KEY } from "@/lib/web-push";

const clientEnv = import.meta.env as Record<string, string | boolean | undefined>;
const value = (name: string) => {
  const raw = clientEnv[name];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
};
const httpsUrl = (name: string) => {
  const raw = value(name);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
};

// Committed non-secret defaults for the confirmed UK trading identity. Any value
// can still be overridden per environment; outstanding statutory details (registered
// office, Companies House number, phone, VAT/ICO) remain unset until supplied.
const COMPANY_DOMAIN = "haccora.co.uk";
const withDefault = (name: string, fallback: string) => value(name) ?? fallback;

export const PUBLIC_CONFIG = {
  legal: {
    companyName: withDefault("VITE_LEGAL_COMPANY_NAME", "iTechLounge"),
    tradingName: withDefault("VITE_LEGAL_TRADING_NAME", "Haccora"),
    addressLine1: value("VITE_LEGAL_ADDRESS_LINE_1"),
    postalCity: value("VITE_LEGAL_POSTAL_CITY"),
    registeredIn: withDefault("VITE_LEGAL_REGISTERED_IN", "England and Wales"),
    companyNumber: value("VITE_LEGAL_COMPANY_NUMBER"),
    email: withDefault("VITE_LEGAL_EMAIL", `support@${COMPANY_DOMAIN}`),
    phone: value("VITE_LEGAL_PHONE"),
    vatId: value("VITE_LEGAL_VAT_ID"),
    icoRegistration: value("VITE_LEGAL_ICO_REGISTRATION"),
  },
  // Do not publish guessed subdomains. The public Help Centre remains local
  // until a verified support URL is configured; Status stays hidden until its
  // production monitor is live.
  supportUrl: httpsUrl("VITE_SUPPORT_URL"),
  statusUrl: httpsUrl("VITE_STATUS_URL"),
};

export const TRADING_STATEMENT = `${PUBLIC_CONFIG.legal.tradingName} is a trading name of ${PUBLIC_CONFIG.legal.companyName}.`;

const requiredLegalIdentity = [
  PUBLIC_CONFIG.legal.companyName,
  PUBLIC_CONFIG.legal.addressLine1,
  PUBLIC_CONFIG.legal.postalCity,
  PUBLIC_CONFIG.legal.registeredIn,
  PUBLIC_CONFIG.legal.companyNumber,
  PUBLIC_CONFIG.legal.email,
  PUBLIC_CONFIG.legal.phone,
];

export const legalIdentityComplete = requiredLegalIdentity.every(Boolean);
export const legalPublishReady =
  legalIdentityComplete && value("VITE_LEGAL_CONTENT_APPROVED") === "true";

export const PUBLIC_LAUNCH_READINESS = {
  legalIdentityComplete,
  legalPublishReady,
  supportConfigured: Boolean(PUBLIC_CONFIG.supportUrl),
  statusConfigured: Boolean(PUBLIC_CONFIG.statusUrl),
  browserPushConfigured: Boolean(VAPID_PUBLIC_KEY),
};
