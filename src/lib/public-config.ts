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

export const PUBLIC_CONFIG = {
  legal: {
    companyName: value("VITE_LEGAL_COMPANY_NAME"),
    addressLine1: value("VITE_LEGAL_ADDRESS_LINE_1"),
    postalCity: value("VITE_LEGAL_POSTAL_CITY"),
    registeredIn: value("VITE_LEGAL_REGISTERED_IN"),
    companyNumber: value("VITE_LEGAL_COMPANY_NUMBER"),
    email: value("VITE_LEGAL_EMAIL"),
    phone: value("VITE_LEGAL_PHONE"),
    vatId: value("VITE_LEGAL_VAT_ID"),
    icoRegistration: value("VITE_LEGAL_ICO_REGISTRATION"),
  },
  supportUrl: httpsUrl("VITE_SUPPORT_URL"),
  statusUrl: httpsUrl("VITE_STATUS_URL"),
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
