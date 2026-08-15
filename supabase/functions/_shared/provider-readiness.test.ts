import { evaluateProviderConfiguration } from "./provider-readiness.ts";

const productionEnvironment: Record<string, string> = {
  PUBLIC_APP_URL: "https://app.haccora.co.uk",
  ALLOWED_ORIGINS: "https://haccora.co.uk,https://app.haccora.co.uk",
  RESEND_API_KEY: "re_production_key_123456",
  NOTIFICATION_FROM_EMAIL: "Haccora Alerts <alerts@haccora.co.uk>",
  EXPO_ACCESS_TOKEN: "expo_production_token_1234567890",
  WEB_PUSH_GATEWAY_URL: "https://push.haccora.co.uk/send",
  WEB_PUSH_GATEWAY_TOKEN: "push_gateway_token_123456789012345",
  MALWARE_SCAN_URL: "https://app.haccora.co.uk/api/public/malware-scan",
  MALWARE_SCAN_TOKEN: "malware_token_1234567890",
  VIRUSTOTAL_API_KEY: "virus_total_key_1234567890",
  STRIPE_SECRET_KEY: "sk_live_haccora123",
  STRIPE_WEBHOOK_SECRET: "whsec_haccora123",
  STRIPE_PRICE_SOLO: "price_solo123",
  STRIPE_PRICE_COMPLETE: "price_complete123",
  STRIPE_PRICE_GROUP: "price_group123",
  STRIPE_LIVE_MODE: "true",
  CRON_SECRET: "cron_secret_123456789012345678901",
  OPERATIONS_MONITOR_SECRET: "monitor_secret_123456789012345678",
  INTEGRATION_ENCRYPTION_KEY: "integration_key_12345678901234567",
  LEGAL_COUNSEL_APPROVAL_REFERENCE: "HACCORA-LEGAL-2026-01",
  LEGAL_COUNSEL_APPROVED_AT: "2026-08-15",
  LEGAL_ICO_FEE_STATUS_CONFIRMED: "true",
};

function evaluate(overrides: Record<string, string> = {}) {
  const environment = { ...productionEnvironment, ...overrides };
  return evaluateProviderConfiguration((name) => environment[name]);
}

function configured(key: string, overrides: Record<string, string> = {}) {
  return evaluate(overrides).find((item) => item.key === key)?.configured;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("production-shaped provider configuration passes every shape check", () => {
  const results = evaluate();
  assert(results.length === 9, "all provider groups must be reported");
  assert(
    results.every((item) => item.configured),
    "all valid groups must pass",
  );

  const responseShape = JSON.stringify(results);
  for (
    const secret of [
      productionEnvironment.STRIPE_SECRET_KEY,
      productionEnvironment.RESEND_API_KEY,
      productionEnvironment.CRON_SECRET,
    ]
  ) {
    assert(
      !responseShape.includes(secret),
      "provider values must never be returned",
    );
  }
});

Deno.test("provider groups fail closed on unsafe production shapes", () => {
  const cases: Array<[string, Record<string, string>]> = [
    ["application", { PUBLIC_APP_URL: "http://app.haccora.co.uk" }],
    ["application", { ALLOWED_ORIGINS: "https://haccora.co.uk" }],
    ["email", { RESEND_API_KEY: "replace_me" }],
    ["email", { NOTIFICATION_FROM_EMAIL: "not-an-email" }],
    ["push", { WEB_PUSH_GATEWAY_TOKEN: "too-short" }],
    ["malware", { VIRUSTOTAL_API_KEY: "" }],
    ["malware", { MALWARE_SCAN_URL: "https://app.haccora.co.uk/scan" }],
    ["billing", { STRIPE_SECRET_KEY: "sk_test_haccora123" }],
    ["billing", { STRIPE_PRICE_GROUP: "product_group123" }],
    ["schedulers", { CRON_SECRET: "too-short" }],
    ["monitoring", { OPERATIONS_MONITOR_SECRET: "too-short" }],
    ["integrations", { INTEGRATION_ENCRYPTION_KEY: "too-short" }],
    ["legal", { LEGAL_COUNSEL_APPROVED_AT: "2026-02-31" }],
    ["legal", { LEGAL_ICO_FEE_STATUS_CONFIRMED: "false" }],
  ];

  for (const [key, overrides] of cases) {
    assert(
      configured(key, overrides) === false,
      `${key} must reject ${JSON.stringify(overrides)}`,
    );
  }
});
