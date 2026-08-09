import { z } from "zod";
import {
  constantTimeEqual,
  env,
  json,
  preflight,
  requirePost,
  sha256,
} from "../_shared/http.ts";
import { hmacHex } from "../_shared/integration-crypto.ts";
import { requireUser, serviceClient } from "../_shared/supabase.ts";

const Action = z.object({
  action: z.enum(["checkout", "portal"]),
  plan: z.enum(["solo", "complete", "group"]).default("complete"),
});

const PRICE_ENV = {
  solo: "STRIPE_PRICE_SOLO",
  complete: "STRIPE_PRICE_COMPLETE",
  group: "STRIPE_PRICE_GROUP",
} as const;

async function stripeRequest(path: string, body: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const result = await response.json() as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      result.error?.message ?? `Stripe returned ${response.status}`,
    );
  }
  return result;
}

async function authenticatedAction(request: Request) {
  const { client, user } = await requireUser(request);
  const input = Action.parse(await request.json());
  const { data: context, error } = await client.rpc("get_my_context");
  if (error) throw error;
  const workspace = (context ?? {}) as Record<string, unknown>;
  const organizationId = typeof workspace.organization_id === "string"
    ? workspace.organization_id
    : null;
  if (
    !organizationId || String(workspace.role) !== "owner"
  ) {
    return json(request, { error: "forbidden" }, 403);
  }
  const service = serviceClient();
  const { data: subscription } = await service.from("subscriptions").select(
    "provider_customer_id",
  )
    .eq("organization_id", organizationId).maybeSingle();
  const appUrl = env("PUBLIC_APP_URL").replace(/\/$/, "");
  if (input.action === "portal") {
    if (!subscription?.provider_customer_id) {
      return json(request, { error: "customer_required" }, 409);
    }
    const result = await stripeRequest(
      "billing_portal/sessions",
      new URLSearchParams({
        customer: subscription.provider_customer_id,
        return_url: `${appUrl}/app/billing`,
      }),
    );
    return json(request, { ok: true, url: result.url });
  }
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": env(PRICE_ENV[input.plan]),
    "line_items[0][quantity]": "1",
    success_url: `${appUrl}/app/billing?checkout=success`,
    cancel_url: `${appUrl}/app/billing?checkout=cancelled`,
    client_reference_id: organizationId,
    "metadata[organization_id]": organizationId,
    "subscription_data[metadata][organization_id]": organizationId,
    "metadata[haccora_plan]": input.plan,
    "subscription_data[metadata][haccora_plan]": input.plan,
    "allow_promotion_codes": "true",
  });
  if (subscription?.provider_customer_id) {
    body.set("customer", subscription.provider_customer_id);
  } else if (user.email) body.set("customer_email", user.email);
  const result = await stripeRequest("checkout/sessions", body);
  return json(request, { ok: true, url: result.url });
}

async function stripeWebhook(request: Request, signatureHeader: string) {
  const raw = await request.text();
  const signatureParts = signatureHeader.split(",").map((part) => {
    const separator = part.indexOf("=");
    return separator > 0
      ? [part.slice(0, separator).trim(), part.slice(separator + 1).trim()]
      : [part.trim(), ""];
  });
  const timestampText = signatureParts.find(([key]) => key === "t")?.[1] ?? "";
  const signatures = signatureParts.filter(([key]) => key === "v1").map((
    [, value],
  ) => value);
  const timestamp = Number(timestampText);
  if (
    !Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300
  ) {
    return json(request, { error: "stale_signature" }, 400);
  }
  const expected = await hmacHex(
    env("STRIPE_WEBHOOK_SECRET"),
    `${timestampText}.${raw}`,
  );
  if (
    !signatures.length ||
    !signatures.some((value) => constantTimeEqual(value, expected))
  ) {
    return json(request, { error: "invalid_signature" }, 401);
  }
  type StripeObject = {
    id?: unknown;
    customer?: unknown;
    status?: unknown;
    current_period_end?: unknown;
    cancel_at_period_end?: unknown;
    client_reference_id?: unknown;
    metadata?: Record<string, unknown>;
  };
  const event = JSON.parse(raw) as {
    id: string;
    type: string;
    livemode?: boolean;
    created: number;
    data: { object: StripeObject };
  };
  const expectedLiveMode = env("STRIPE_LIVE_MODE") === "true";
  if (event.livemode !== expectedLiveMode) {
    return json(request, { error: "stripe_mode_mismatch" }, 409);
  }
  const object = event.data.object;
  const organizationId = typeof object.metadata?.organization_id === "string"
    ? object.metadata.organization_id
    : typeof object.client_reference_id === "string"
    ? object.client_reference_id
    : null;
  const service = serviceClient();
  const { error: eventError } = await service.from("billing_events").insert({
    provider_event_id: event.id,
    organization_id: organizationId,
    event_type: event.type,
    livemode: event.livemode === true,
    payload_sha256: await sha256(raw),
    payload: event,
    occurred_at: new Date(event.created * 1000).toISOString(),
  });
  if (eventError?.code === "23505") {
    return json(request, { ok: true, duplicate: true });
  }
  if (eventError) throw eventError;
  if (organizationId && event.type.startsWith("customer.subscription.")) {
    const status = String(object.status ?? "unknown");
    const occurredAt = new Date(event.created * 1000).toISOString();
    const { data: existing } = await service.from("subscriptions").select(
      "last_event_at",
    )
      .eq("organization_id", organizationId).maybeSingle();
    if (
      existing?.last_event_at &&
      new Date(existing.last_event_at) > new Date(occurredAt)
    ) {
      await service.from("billing_events").update({
        processing_status: "ignored",
        processing_error: "out_of_order_event",
        processed_at: new Date().toISOString(),
      }).eq("provider_event_id", event.id);
      return json(request, { ok: true, ignored: "out_of_order_event" });
    }
    await service.from("subscriptions").upsert({
      organization_id: organizationId,
      provider_customer_id: typeof object.customer === "string"
        ? object.customer
        : null,
      provider_subscription_id: typeof object.id === "string"
        ? object.id
        : null,
      plan: typeof object.metadata?.haccora_plan === "string" &&
          ["solo", "complete", "group", "enterprise"].includes(
            object.metadata.haccora_plan,
          )
        ? object.metadata.haccora_plan
        : "complete",
      status,
      current_period_end: typeof object.current_period_end === "number"
        ? new Date(object.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: object.cancel_at_period_end === true,
      last_event_at: occurredAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });
    const enabled = ["active", "trialing"].includes(status);
    await service.from("subscription_entitlements").upsert([
      {
        organization_id: organizationId,
        entitlement: "workflows",
        enabled,
        limit_value: null,
      },
      {
        organization_id: organizationId,
        entitlement: "integrations",
        enabled,
        limit_value: 10,
      },
      {
        organization_id: organizationId,
        entitlement: "native_mobile",
        enabled,
        limit_value: null,
      },
    ], { onConflict: "organization_id,entitlement" });
  }
  await service.from("billing_events").update({
    processing_status: organizationId ? "processed" : "ignored",
    processed_at: new Date().toISOString(),
  }).eq("provider_event_id", event.id);
  return json(request, { ok: true });
}

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  try {
    const signature = request.headers.get("stripe-signature");
    return signature
      ? await stripeWebhook(request, signature)
      : await authenticatedAction(request);
  } catch (error) {
    const unauthorized = error instanceof Error &&
      error.message === "Unauthorized";
    console.error(error);
    return json(request, {
      error: unauthorized ? "unauthorized" : "billing_request_failed",
    }, unauthorized ? 401 : 400);
  }
});
