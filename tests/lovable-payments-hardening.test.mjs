import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Lovable Stripe uses the SDK-supported API version and a server-owned mode", async () => {
  const [server, functions, checkout, billingPage] = await Promise.all([
    read("src/lib/stripe.server.ts"),
    read("src/utils/payments.functions.ts"),
    read("src/components/StripeEmbeddedCheckout.tsx"),
    read("src/routes/app.billing.tsx"),
  ]);

  assert.match(server, /apiVersion: "2026-03-25\.dahlia"/);
  assert.match(server, /getConfiguredStripeEnvironment/);
  assert.match(server, /PAYMENTS_ENVIRONMENT/);
  assert.match(functions, /createStripeClient\(getConfiguredStripeEnvironment\(\)\)/);
  assert.doesNotMatch(functions, /data\.environment|environment: StripeEnv/);
  assert.doesNotMatch(checkout, /getStripeEnvironment|environment:/);
  assert.doesNotMatch(billingPage, /getStripeEnvironment|environment:/);
});

test("Lovable Stripe webhooks fail closed on mode mismatch", async () => {
  const [server, webhook] = await Promise.all([
    read("src/lib/stripe.server.ts"),
    read("src/routes/api/public/payments/webhook.ts"),
  ]);

  assert.match(server, /constantTimeEqual/);
  assert.match(server, /event\.livemode !== \(env === "live"\)/);
  assert.match(webhook, /getConfiguredStripeEnvironment/);
  assert.match(webhook, /Payment environment mismatch/);
  assert.match(webhook, /status: 400/);
  assert.doesNotMatch(webhook, /received: true, ignored: "invalid env"/);
});

test("public and protected readiness use the Lovable payment boundary without exposing keys", async () => {
  const [publicReadiness, providerReadiness, workflow] = await Promise.all([
    read("src/routes/readiness[.]json.ts"),
    read("supabase/functions/_shared/provider-readiness.ts"),
    read(".github/workflows/release-readiness.yml"),
  ]);

  for (const marker of [
    "PAYMENTS_RUNTIME_PROVIDER",
    "PAYMENTS_ENVIRONMENT",
    "PAYMENTS_WEBHOOK_URL",
  ]) {
    assert.match(providerReadiness, new RegExp(marker));
    assert.match(workflow, new RegExp(marker));
  }
  for (const secret of [
    "STRIPE_LIVE_API_KEY",
    "LOVABLE_API_KEY",
    "PAYMENTS_LIVE_WEBHOOK_SECRET",
  ]) {
    assert.match(publicReadiness, new RegExp(secret));
    assert.match(workflow, new RegExp(secret));
  }
  assert.match(publicReadiness, /payments: lovablePaymentsReady\(\)/);
});
