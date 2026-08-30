import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import type Stripe from "stripe";

type CheckoutSessionResult = { clientSecret: string } | { error: string };
type PortalSessionResult = { url: string } | { error: string };

const PLAN_BY_PRICE: Record<string, string> = {
  haccora_food_cart_monthly: "solo",
  haccora_complete_monthly: "complete",
  haccora_group_monthly: "group",
};

async function requireBillingOwner(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("organization_memberships")
    .select("organization_id, role, status")
    .eq("user_id", context.userId)
    .eq("role", "owner")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data?.organization_id) throw new Error("Only the tenant owner can manage billing.");
  return data.organization_id as string;
}

async function resolveOrCreateCustomer(
  stripe: Stripe,
  options: { email?: string; userId: string; organizationId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length && found.data[0]) return found.data[0].id;

  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: {
            ...customer.metadata,
            userId: options.userId,
            organization_id: options.organizationId,
          },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId, organization_id: options.organizationId },
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { priceId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!PLAN_BY_PRICE[data.priceId]) throw new Error("Unknown plan");
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    const organizationId = await requireBillingOwner(context as any);
    const plan = PLAN_BY_PRICE[data.priceId]!;

    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const stripePrice = prices.data[0];
      if (!stripePrice) throw new Error("Plan is not available for purchase yet.");

      const {
        data: { user },
      } = await (context as any).supabase.auth.getUser();

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email ?? undefined,
        userId: (context as any).userId,
        organizationId,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        client_reference_id: organizationId,
        metadata: {
          userId: (context as any).userId,
          organization_id: organizationId,
          haccora_plan: plan,
        },
        subscription_data: {
          metadata: {
            userId: (context as any).userId,
            organization_id: organizationId,
            haccora_plan: plan,
          },
        },
        managed_payments: { enabled: true },
      } as Stripe.Checkout.SessionCreateParams);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    const organizationId = await requireBillingOwner(context as any);

    const { data: sub } = await (context as any).supabase
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!sub?.provider_customer_id) return { error: "No billing account found yet." };

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.provider_customer_id,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
