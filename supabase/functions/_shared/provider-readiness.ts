export type ProviderConfiguration = {
  key: string;
  label: string;
  configured: boolean;
};

type EnvironmentReader = (name: string) => string | undefined;

const placeholder =
  /(replace|your[_-]?project|example\.com|example\.supabase|set[_-]?with)/i;

function value(readEnvironment: EnvironmentReader, name: string) {
  return readEnvironment(name)?.trim() ?? "";
}

function isConfigured(current: string) {
  return current.length > 0 && !placeholder.test(current);
}

function configuredValue(readEnvironment: EnvironmentReader, name: string) {
  return isConfigured(value(readEnvironment, name));
}

function validHttpsUrl(current: string) {
  if (!isConfigured(current)) return false;
  try {
    const parsed = new URL(current);
    return parsed.protocol === "https:" &&
      parsed.username === "" &&
      parsed.password === "";
  } catch {
    return false;
  }
}

function validHttpsOrigin(current: string) {
  if (!validHttpsUrl(current)) return false;
  const parsed = new URL(current);
  return parsed.pathname === "/" && parsed.search === "" && parsed.hash === "";
}

function applicationConfigured(readEnvironment: EnvironmentReader) {
  const applicationUrl = value(readEnvironment, "PUBLIC_APP_URL");
  const allowedOrigins = value(readEnvironment, "ALLOWED_ORIGINS");
  if (!validHttpsOrigin(applicationUrl) || !isConfigured(allowedOrigins)) {
    return false;
  }

  const entries = allowedOrigins.split(",").map((entry) => entry.trim());
  if (
    entries.length === 0 || entries.some((entry) => !validHttpsOrigin(entry))
  ) {
    return false;
  }
  const allowed = new Set(entries.map((entry) => new URL(entry).origin));
  return allowed.has(new URL(applicationUrl).origin);
}

function validEmail(current: string) {
  if (!isConfigured(current)) return false;
  const address = current.match(/<([^<>]+)>$/)?.[1] ?? current;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address);
}

function minimumLength(
  readEnvironment: EnvironmentReader,
  name: string,
  length: number,
) {
  const current = value(readEnvironment, name);
  return isConfigured(current) && current.length >= length;
}

function matches(
  readEnvironment: EnvironmentReader,
  name: string,
  pattern: RegExp,
) {
  const current = value(readEnvironment, name);
  return isConfigured(current) && pattern.test(current);
}

function malwareConfigured(readEnvironment: EnvironmentReader) {
  const endpoint = value(readEnvironment, "MALWARE_SCAN_URL");
  if (!validHttpsUrl(endpoint)) return false;
  return new URL(endpoint).pathname.endsWith("/api/public/malware-scan") &&
    minimumLength(readEnvironment, "MALWARE_SCAN_TOKEN", 20) &&
    minimumLength(readEnvironment, "VIRUSTOTAL_API_KEY", 20);
}

function validIsoDate(current: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(current)) return false;
  const parsed = new Date(`${current}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === current;
}

export function evaluateProviderConfiguration(
  readEnvironment: EnvironmentReader,
): ProviderConfiguration[] {
  return [
    {
      key: "application",
      label: "Application URL and CORS",
      configured: applicationConfigured(readEnvironment),
    },
    {
      key: "email",
      label: "Transactional email",
      configured:
        matches(readEnvironment, "RESEND_API_KEY", /^re_[A-Za-z0-9_-]{8,}$/) &&
        validEmail(value(readEnvironment, "NOTIFICATION_FROM_EMAIL")),
    },
    {
      key: "push",
      label: "Native and browser push",
      configured: minimumLength(readEnvironment, "EXPO_ACCESS_TOKEN", 20) &&
        validHttpsUrl(value(readEnvironment, "WEB_PUSH_GATEWAY_URL")) &&
        minimumLength(readEnvironment, "WEB_PUSH_GATEWAY_TOKEN", 32),
    },
    {
      key: "malware",
      label: "Document malware scanning",
      configured: malwareConfigured(readEnvironment),
    },
    {
      key: "billing",
      label: "Lovable-hosted Stripe routing",
      configured:
        value(readEnvironment, "PAYMENTS_RUNTIME_PROVIDER") === "lovable" &&
        value(readEnvironment, "PAYMENTS_ENVIRONMENT") === "live" &&
        validHttpsUrl(value(readEnvironment, "PAYMENTS_WEBHOOK_URL")) &&
        (() => {
          try {
            const application = new URL(
              value(readEnvironment, "PUBLIC_APP_URL"),
            );
            const webhook = new URL(
              value(readEnvironment, "PAYMENTS_WEBHOOK_URL"),
            );
            return webhook.origin === application.origin &&
              webhook.pathname === "/api/public/payments/webhook" &&
              webhook.search === "" &&
              webhook.hash === "";
          } catch {
            return false;
          }
        })(),
    },
    {
      key: "schedulers",
      label: "Scheduled dispatchers",
      configured: minimumLength(readEnvironment, "CRON_SECRET", 32),
    },
    {
      key: "monitoring",
      label: "Operations monitoring",
      configured: minimumLength(
        readEnvironment,
        "OPERATIONS_MONITOR_SECRET",
        32,
      ),
    },
    {
      key: "integrations",
      label: "Encrypted outbound integrations",
      configured: minimumLength(
        readEnvironment,
        "INTEGRATION_ENCRYPTION_KEY",
        32,
      ),
    },
    {
      key: "legal",
      label: "UK legal approval record",
      configured:
        configuredValue(readEnvironment, "LEGAL_COUNSEL_APPROVAL_REFERENCE") &&
        validIsoDate(value(readEnvironment, "LEGAL_COUNSEL_APPROVED_AT")) &&
        value(readEnvironment, "LEGAL_ICO_FEE_STATUS_CONFIRMED") === "true",
    },
  ];
}
