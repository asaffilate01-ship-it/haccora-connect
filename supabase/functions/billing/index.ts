import { z } from "zod";
import {
  constantTimeEqual,
  env,
  json,
  preflight,
  readJsonBody,
  readLimitedText,
  RequestBodyError,
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
    signal: AbortSignal.timeout(15_000),
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
  const input = Action.parse(await readJsonBody(request, 8 * 1024));
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
  const raw = await readLimitedText(request, 512 * 1024);
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
    subscription?: unknown;
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
  let organizationId = typeof object.metadata?.organization_id === "string"
    ? object.metadata.organization_id
    : typeof object.client_reference_id === "string"
    ? object.client_reference_id
    : null;
  const service = serviceClient();
  if (!organizationId && typeof object.customer === "string") {
    const { data: customerSubscription } = await service.from("subscriptions")
      .select("organization_id")
      .eq("provider_customer_id", object.customer)
      .maybeSingle();
    organizationId = customerSubscription?.organization_id ?? null;
  }
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
  const billingStateEvent = event.type.startsWith("customer.subscription.") ||
    ["invoice.payment_failed", "invoice.payment_succeeded", "invoice.paid"]
      .includes(event.type);
  if (organizationId && billingStateEvent) {
    const status = event.type === "invoice.payment_failed"
      ? "past_due"
      : ["invoice.payment_succeeded", "invoice.paid"].includes(event.type)
      ? "active"
      : String(object.status ?? "unknown");
    const occurredAt = new Date(event.created * 1000).toISOString();
    const { data: existing } = await service.from("subscriptions").select(
      "last_event_at,payment_failed_at,grace_ends_at,access_restricted_at,plan,provider_customer_id,provider_subscription_id,current_period_end,cancel_at_period_end",
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
    const activeAccess = ["active", "trialing"].includes(status);
    const graceAccess = status === "past_due";
    const restrictedAccess = [
      "canceled",
      "unpaid",
      "paused",
      "incomplete_expired",
    ].includes(status);
    const paymentFailedAt = graceAccess
      ? existing?.payment_failed_at ?? occurredAt
      : activeAccess
      ? null
      : existing?.payment_failed_at ?? occurredAt;
    const graceEndsAt = graceAccess
      ? existing?.grace_ends_at ??
        new Date(new Date(paymentFailedAt!).getTime() + 7 * 86400000)
          .toISOString()
      : activeAccess
      ? null
      : existing?.grace_ends_at ?? null;

    await service.from("subscriptions").upsert({
      organization_id: organizationId,
      provider_customer_id: typeof object.customer === "string"
        ? object.customer
        : existing?.provider_customer_id ?? null,
      provider_subscription_id:
        event.type.startsWith("customer.subscription.") &&
          typeof object.id === "string"
          ? object.id
          : typeof object.subscription === "string"
          ? object.subscription
          : existing?.provider_subscription_id ?? null,
      plan: typeof object.metadata?.haccora_plan === "string" &&
          ["solo", "complete", "group", "enterprise"].includes(
            object.metadata.haccora_plan,
          )
        ? object.metadata.haccora_plan
        : existing?.plan ?? "complete",
      status,
      current_period_end: typeof object.current_period_end === "number"
        ? new Date(object.current_period_end * 1000).toISOString()
        : existing?.current_period_end ?? null,
      cancel_at_period_end: typeof object.cancel_at_period_end === "boolean"
        ? object.cancel_at_period_end
        : existing?.cancel_at_period_end ?? false,
      last_event_at: occurredAt,
      payment_failed_at: paymentFailedAt,
      grace_ends_at: graceEndsAt,
      access_restricted_at: restrictedAccess
        ? existing?.access_restricted_at ?? occurredAt
        : activeAccess
        ? null
        : existing?.access_restricted_at ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });
    const enabled = activeAccess || graceAccess;
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

    if (activeAccess) {
      await service.from("organizations").update({
        service_status: "active",
        service_status_reason: null,
        frozen_at: null,
        frozen_by: null,
        updated_at: new Date().toISOString(),
      })
        .eq("id", organizationId)
        .eq("service_status", "frozen")
        .like("service_status_reason", "[billing]%");
    } else if (graceAccess) {
      await service.from("organizations").update({
        service_status_reason:
          `[billing] Payment is overdue. Existing access continues until ${
            new Date(graceEndsAt!).toLocaleDateString("en-GB")
          }; new users and premises are blocked.`,
        updated_at: new Date().toISOString(),
      })
        .eq("id", organizationId)
        .eq("service_status", "active");
    } else if (restrictedAccess) {
      await service.from("organizations").update({
        service_status: "frozen",
        service_status_reason:
          "[billing] Subscription access is restricted. The tenant owner can restore access through billing.",
        frozen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
        .eq("id", organizationId)
        .neq("service_status", "closed");
    }
    const { error: creditControlError } = await service.rpc(
      "sync_credit_control_case",
      {
        p_organization_id: organizationId,
        p_subscription_status: status,
        p_payment_failed_at: paymentFailedAt,
        p_grace_ends_at: graceEndsAt,
        p_access_restricted_at: restrictedAccess
          ? existing?.access_restricted_at ?? occurredAt
          : activeAccess
          ? null
          : existing?.access_restricted_at ?? null,
      },
    );
    if (creditControlError) throw creditControlError;
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
    if (error instanceof RequestBodyError) {
      return json(request, { error: error.code }, error.status);
    }
    const unauthorized = error instanceof Error &&
      error.message === "Unauthorized";
    console.error(error);
    return json(request, {
      error: unauthorized ? "unauthorized" : "billing_request_failed",
    }, unauthorized ? 401 : 400);
  }
});
