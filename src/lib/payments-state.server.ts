/**
 * Haccora billing state machine.
 *
 * Translates verified provider subscription events into tenant access:
 * subscription row, entitlements, organisation service status and the
 * platform credit-control case. Entitlements come only from verified events.
 */
import type { StripeEnv } from "@/lib/stripe.server";

const GRACE_PERIOD_MS = 7 * 86_400_000;

const PRICE_TO_PLAN: Record<string, string> = {
  haccora_food_cart_monthly: "solo",
  haccora_complete_monthly: "complete",
  haccora_group_monthly: "group",
};

const KNOWN_PLANS = ["solo", "complete", "group", "enterprise"];

export type StripeEventShape = {
  id: string;
  type: string;
  created: number;
  livemode?: boolean;
  data: { object: Record<string, any> };
  raw: string;
};

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function planFromEvent(object: Record<string, any>, fallback: string | null): string {
  const metadataPlan = object?.metadata?.haccora_plan;
  if (typeof metadataPlan === "string" && KNOWN_PLANS.includes(metadataPlan)) return metadataPlan;
  const lookupKey = object?.items?.data?.[0]?.price?.lookup_key;
  if (typeof lookupKey === "string" && PRICE_TO_PLAN[lookupKey]) return PRICE_TO_PLAN[lookupKey];
  return fallback ?? "complete";
}

export async function applyBillingEvent(event: StripeEventShape, env: StripeEnv) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const service = supabaseAdmin as any;
  const object = event.data.object ?? {};

  let organizationId: string | null =
    typeof object.metadata?.organization_id === "string"
      ? object.metadata.organization_id
      : typeof object.client_reference_id === "string"
        ? object.client_reference_id
        : null;

  if (!organizationId && typeof object.customer === "string") {
    const { data: byCustomer } = await service
      .from("subscriptions")
      .select("organization_id")
      .eq("provider_customer_id", object.customer)
      .maybeSingle();
    organizationId = byCustomer?.organization_id ?? null;
  }

  const { error: eventError } = await service.from("billing_events").insert({
    provider_event_id: event.id,
    organization_id: organizationId,
    event_type: event.type,
    livemode: env === "live",
    payload_sha256: await sha256Hex(event.raw),
    payload: JSON.parse(event.raw),
    occurred_at: new Date(event.created * 1000).toISOString(),
  });
  if (eventError?.code === "23505") return { ok: true, duplicate: true };
  if (eventError) throw eventError;

  const billingStateEvent =
    event.type.startsWith("customer.subscription.") ||
    ["invoice.payment_failed", "invoice.payment_succeeded", "invoice.paid"].includes(event.type);

  if (organizationId && billingStateEvent) {
    const status =
      event.type === "invoice.payment_failed"
        ? "past_due"
        : ["invoice.payment_succeeded", "invoice.paid"].includes(event.type)
          ? "active"
          : String(object.status ?? "unknown");
    const occurredAt = new Date(event.created * 1000).toISOString();

    const { data: existing } = await service
      .from("subscriptions")
      .select(
        "last_event_at,payment_failed_at,grace_ends_at,access_restricted_at,plan,provider_customer_id,provider_subscription_id,current_period_end,cancel_at_period_end",
      )
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (existing?.last_event_at && new Date(existing.last_event_at) > new Date(occurredAt)) {
      await service
        .from("billing_events")
        .update({
          processing_status: "ignored",
          processing_error: "out_of_order_event",
          processed_at: new Date().toISOString(),
        })
        .eq("provider_event_id", event.id);
      return { ok: true, ignored: "out_of_order_event" };
    }

    const activeAccess = ["active", "trialing"].includes(status);
    const graceAccess = status === "past_due";
    const restrictedAccess = ["canceled", "unpaid", "paused", "incomplete_expired"].includes(status);

    const paymentFailedAt = activeAccess ? null : (existing?.payment_failed_at ?? occurredAt);
    const graceEndsAt = graceAccess
      ? (existing?.grace_ends_at ??
        new Date(new Date(paymentFailedAt!).getTime() + GRACE_PERIOD_MS).toISOString())
      : activeAccess
        ? null
        : (existing?.grace_ends_at ?? null);
    const accessRestrictedAt = restrictedAccess
      ? (existing?.access_restricted_at ?? occurredAt)
      : activeAccess
        ? null
        : (existing?.access_restricted_at ?? null);

    const periodEndSeconds =
      typeof object.current_period_end === "number"
        ? object.current_period_end
        : typeof object.items?.data?.[0]?.current_period_end === "number"
          ? object.items.data[0].current_period_end
          : null;

    await service.from("subscriptions").upsert(
      {
        organization_id: organizationId,
        provider_customer_id:
          typeof object.customer === "string"
            ? object.customer
            : (existing?.provider_customer_id ?? null),
        provider_subscription_id:
          event.type.startsWith("customer.subscription.") && typeof object.id === "string"
            ? object.id
            : typeof object.subscription === "string"
              ? object.subscription
              : (existing?.provider_subscription_id ?? null),
        plan: planFromEvent(object, existing?.plan ?? null),
        status,
        current_period_end: periodEndSeconds
          ? new Date(periodEndSeconds * 1000).toISOString()
          : (existing?.current_period_end ?? null),
        cancel_at_period_end:
          typeof object.cancel_at_period_end === "boolean"
            ? object.cancel_at_period_end
            : (existing?.cancel_at_period_end ?? false),
        last_event_at: occurredAt,
        payment_failed_at: paymentFailedAt,
        grace_ends_at: graceEndsAt,
        access_restricted_at: accessRestrictedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );

    const enabled = activeAccess || graceAccess;
    await service.from("subscription_entitlements").upsert(
      [
        { organization_id: organizationId, entitlement: "workflows", enabled, limit_value: null },
        { organization_id: organizationId, entitlement: "integrations", enabled, limit_value: 10 },
        { organization_id: organizationId, entitlement: "native_mobile", enabled, limit_value: null },
      ],
      { onConflict: "organization_id,entitlement" },
    );

    if (activeAccess) {
      await service
        .from("organizations")
        .update({
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
      await service
        .from("organizations")
        .update({
          service_status_reason: `[billing] Payment is overdue. Existing access continues until ${new Date(
            graceEndsAt!,
          ).toLocaleDateString("en-GB")}; new users and premises are blocked.`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId)
        .eq("service_status", "active");
    } else if (restrictedAccess) {
      await service
        .from("organizations")
        .update({
          service_status: "frozen",
          service_status_reason:
            "[billing] Subscription access is restricted. The tenant owner can restore access through billing.",
          frozen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId)
        .neq("service_status", "closed");
    }

    const { error: creditControlError } = await service.rpc("sync_credit_control_case", {
      p_organization_id: organizationId,
      p_subscription_status: status,
      p_payment_failed_at: paymentFailedAt,
      p_grace_ends_at: graceEndsAt,
      p_access_restricted_at: accessRestrictedAt,
    });
    if (creditControlError) throw creditControlError;
  }

  await service
    .from("billing_events")
    .update({
      processing_status: organizationId ? "processed" : "ignored",
      processed_at: new Date().toISOString(),
    })
    .eq("provider_event_id", event.id);

  return { ok: true };
}
