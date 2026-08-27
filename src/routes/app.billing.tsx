import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, CreditCard, ExternalLink, Loader2, ShieldCheck, Users, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/billing")({ component: BillingPage });

type Subscription = {
  plan: string;
  status: string;
  seats: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

function BillingPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.organizationId) return;
    void (supabase as any)
      .from("subscriptions")
      .select("plan,status,seats,current_period_end,cancel_at_period_end")
      .eq("organization_id", user.organizationId)
      .maybeSingle()
      .then(({ data }: { data: Subscription | null }) => setSubscription(data));
  }, [user?.organizationId]);
  const launch = async (action: "checkout" | "portal", plan = "complete") => {
    setBusy(action === "portal" ? action : plan);
    const { data, error } = await supabase.functions.invoke("billing", { body: { action, plan } });
    setBusy(null);
    if (error || !data?.url) toast.error("Billing request failed.");
    else window.location.assign(data.url);
  };
  const canManageBilling = user?.role === "owner";
  return (
    <div className="p-5 md:p-10 space-y-6 max-w-5xl">
      <div>
        <div className="eyebrow">{"Subscription"}</div>
        <h1 className="mt-1 text-3xl md:text-4xl">{"Plan & billing"}</h1>
        <p className="mt-1 text-muted-foreground">
          {"Entitlements come only from verified provider events."}
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
        <section className="surface p-6">
          <CreditCard size={22} />
          <div className="mt-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
            {"Current plan"}
          </div>
          <div className="mt-1 font-display text-3xl capitalize">
            {subscription?.plan ?? "trial"}
          </div>
          <div className="mt-2 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-bold capitalize">
            {subscription?.status ?? "trialing"}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            {subscription?.current_period_end
              ? `${"Period ends"} ${new Date(subscription.current_period_end).toLocaleDateString("en-GB")}`
              : "No paid period yet."}
          </div>
        </section>
        <section className="surface p-6">
          <ShieldCheck size={22} />
          <div className="mt-4 font-display text-2xl">Secure subscription management</div>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              "GBP billing and VAT-ready invoices",
              "Limits enforced server-side",
              "Verified Stripe events control access",
              "No card details stored by Haccora",
            ].map((item) => (
              <li key={item}>
                <Check className="mr-2 inline text-success" size={15} />
                {item}
              </li>
            ))}
          </ul>
          {canManageBilling && subscription && (
            <button
              disabled={!!busy}
              onClick={() => void launch("portal")}
              className="mt-6 min-h-11 rounded-xl border border-border px-4 text-sm font-bold"
            >
              {busy === "portal" ? (
                <Loader2 className="inline animate-spin" />
              ) : (
                <>
                  {"Manage billing"} <ExternalLink className="ml-1 inline" size={13} />
                </>
              )}
            </button>
          )}
        </section>
      </div>
      <section>
        <h2 className="font-display text-2xl">Available plans</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            {
              code: "solo",
              name: "Food Cart",
              price: "£9.99",
              seats: "7 staff",
              sites: "1 premises",
            },
            {
              code: "complete",
              name: "Complete",
              price: "£24.99",
              seats: "Unlimited staff",
              sites: "1 premises",
            },
            {
              code: "group",
              name: "Small Group",
              price: "£59.99",
              seats: "Unlimited staff",
              sites: "Up to 3 premises",
            },
          ].map((plan) => (
            <article
              key={plan.code}
              className={`surface p-5 ${subscription?.plan === plan.code ? "ring-2 ring-primary" : ""}`}
            >
              <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {plan.name}
              </div>
              <div className="mt-2 text-3xl font-black">
                {plan.price}
                <span className="text-xs font-medium text-muted-foreground"> / month + VAT</span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users size={14} /> {plan.seats}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} /> {plan.sites}
                </div>
              </div>
              {canManageBilling && subscription?.plan !== plan.code && (
                <button
                  disabled={!!busy}
                  onClick={() => void launch("checkout", plan.code)}
                  className="btn-alert-solid mt-5 min-h-11 w-full text-sm"
                >
                  {busy === plan.code ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : (
                    "Choose plan"
                  )}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        {"Payment details are processed by Stripe; Haccora does not store card numbers."}
      </p>
    </div>
  );
}
