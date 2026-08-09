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
const httpsUrlWithDefault = (name: string, fallback: string) => httpsUrl(name) ?? fallback;

export const PUBLIC_CONFIG = {
  legal: {
    companyName: withDefault("VITE_LEGAL_COMPANY_NAME", "Haccora Ltd"),
    addressLine1: value("VITE_LEGAL_ADDRESS_LINE_1"),
    postalCity: value("VITE_LEGAL_POSTAL_CITY"),
    registeredIn: withDefault("VITE_LEGAL_REGISTERED_IN", "England and Wales"),
    companyNumber: value("VITE_LEGAL_COMPANY_NUMBER"),
    email: withDefault("VITE_LEGAL_EMAIL", `hello@${COMPANY_DOMAIN}`),
    phone: value("VITE_LEGAL_PHONE"),
    vatId: value("VITE_LEGAL_VAT_ID"),
    icoRegistration: value("VITE_LEGAL_ICO_REGISTRATION"),
  },
  supportUrl: httpsUrlWithDefault("VITE_SUPPORT_URL", `https://support.${COMPANY_DOMAIN}`),
  statusUrl: httpsUrlWithDefault("VITE_STATUS_URL", `https://status.${COMPANY_DOMAIN}`),
};


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
