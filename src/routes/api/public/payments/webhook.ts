import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Payments webhook received invalid env parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          const { applyBillingEvent } = await import("@/lib/payments-state.server");
          const result = await applyBillingEvent(event, env);
          return Response.json({ received: true, ...result });
        } catch (error) {
          console.error("Payments webhook error:", error);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
