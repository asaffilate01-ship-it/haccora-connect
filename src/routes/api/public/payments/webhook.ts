import { createFileRoute } from "@tanstack/react-router";
import { getConfiguredStripeEnvironment, verifyWebhook } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const configuredEnvironment = getConfiguredStripeEnvironment();
          const requestedEnvironment = new URL(request.url).searchParams.get("env");
          if (
            requestedEnvironment &&
            requestedEnvironment !== "sandbox" &&
            requestedEnvironment !== "live"
          ) {
            return new Response("Invalid payment environment", { status: 400 });
          }
          if (requestedEnvironment && requestedEnvironment !== configuredEnvironment) {
            return new Response("Payment environment mismatch", { status: 400 });
          }

          const event = await verifyWebhook(request, configuredEnvironment);
          const { applyBillingEvent } = await import("@/lib/payments-state.server");
          const result = await applyBillingEvent(event, configuredEnvironment);
          return Response.json({ received: true, ...result });
        } catch (error) {
          console.error("Payments webhook error:", error);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
