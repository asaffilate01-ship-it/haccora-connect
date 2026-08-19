export const CONSENT_KEY = "haccora-cookie-consent-v2";
export const CONSENT_EVENT = "haccora-cookie-consent";
const CONSENT_VERSION = 2;

export type ConsentCategories = {
  necessary: true;
  preferences: boolean;
  statistics: boolean;
};

export type ConsentRecord = ConsentCategories & {
  version: number;
  ts: number;
};

export const DEFAULT_CONSENT: ConsentCategories = {
  necessary: true,
  preferences: false,
  statistics: false,
};

export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (parsed?.version !== CONSENT_VERSION) return null;
    return {
      necessary: true,
      preferences: Boolean(parsed.preferences),
      statistics: Boolean(parsed.statistics),
      version: CONSENT_VERSION,
      ts: typeof parsed.ts === "number" ? parsed.ts : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeConsent(categories: ConsentCategories): ConsentRecord {
  const record: ConsentRecord = {
    ...categories,
    necessary: true,
    version: CONSENT_VERSION,
    ts: Date.now(),
  };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable — consent stays session-only */
  }
  applyConsent(record);
  window.dispatchEvent(new CustomEvent<ConsentRecord>(CONSENT_EVENT, { detail: record }));
  return record;
}

/**
 * Enforces the stored choice. Non-necessary storage is cleared whenever the
 * matching category is refused, so the banner is genuinely wired to behaviour.
 */
export function applyConsent(record: ConsentRecord) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  root.dataset["consentPreferences"] = String(record.preferences);
  root.dataset["consentStatistics"] = String(record.statistics);

  if (!record.preferences) clearPrefixed(["haccora-pref-", "haccora-ui-"]);
  if (!record.statistics) clearPrefixed(["haccora-stats-", "haccora-analytics-"]);
}

function clearPrefixed(prefixes: string[]) {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && prefixes.some((p) => key.startsWith(p))) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* noop */
  }
}

export function hasConsent(category: keyof ConsentCategories): boolean {
  const record = readConsent();
  if (!record) return category === "necessary";
  return Boolean(record[category]);
}

export function openCookieSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("haccora-cookie-settings-open"));
}
