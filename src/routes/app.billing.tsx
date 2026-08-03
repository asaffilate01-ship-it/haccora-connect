import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, CreditCard, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

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
  const { lang } = useI18n();
  const tr = useCallback((de: string, en: string) => (lang === "de" ? de : en), [lang]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  useEffect(() => {
    if (!user?.organizationId) return;
    void (supabase as any)
      .from("subscriptions")
      .select("plan,status,seats,current_period_end,cancel_at_period_end")
      .eq("organization_id", user.organizationId)
      .maybeSingle()
      .then(({ data }: { data: Subscription | null }) => setSubscription(data));
  }, [user?.organizationId]);
  const launch = async (action: "checkout" | "portal") => {
    setBusy(action);
    const { data, error } = await supabase.functions.invoke("billing", { body: { action } });
    setBusy(null);
    if (error || !data?.url)
      toast.error(tr("Billing-Anfrage fehlgeschlagen.", "Billing request failed."));
    else window.location.assign(data.url);
  };
  const manager = user?.role === "owner" || user?.role === "manager";
  return (
    <div className="p-5 md:p-10 space-y-6 max-w-5xl">
      <div>
        <div className="eyebrow">{tr("Abonnement", "Subscription")}</div>
        <h1 className="mt-1 text-3xl md:text-4xl">{tr("Plan & Billing", "Plan & billing")}</h1>
        <p className="mt-1 text-muted-foreground">
          {tr(
            "Entitlements kommen ausschließlich aus verifizierten Provider-Events.",
            "Entitlements come only from verified provider events.",
          )}
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="surface p-6">
          <CreditCard size={22} />
          <div className="mt-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
            {tr("Aktueller Plan", "Current plan")}
          </div>
          <div className="mt-1 font-display text-3xl capitalize">
            {subscription?.plan ?? "trial"}
          </div>
          <div className="mt-2 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-bold capitalize">
            {subscription?.status ?? "trialing"}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            {subscription?.current_period_end
              ? `${tr("Zeitraum bis", "Period ends")} ${new Date(subscription.current_period_end).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB")}`
              : tr("Noch kein bezahlter Zeitraum.", "No paid period yet.")}
          </div>
        </section>
        <section className="surface p-6">
          <ShieldCheck size={22} />
          <div className="mt-4 font-display text-2xl">Haccora Pro</div>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              tr("Versionierte Workflows", "Versioned workflows"),
              tr("Native iOS/Android Apps", "Native iOS/Android apps"),
              tr("Signierte Webhooks", "Signed webhooks"),
              tr("Kontrollzentrum & Sensor-Automation", "Control centre & sensor automation"),
            ].map((item) => (
              <li key={item}>
                <Check className="mr-2 inline text-success" size={15} />
                {item}
              </li>
            ))}
          </ul>
          {manager && (
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                disabled={!!busy}
                onClick={() => void launch("checkout")}
                className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
              >
                {busy === "checkout" ? (
                  <Loader2 className="inline animate-spin" />
                ) : (
                  tr("Pro wählen", "Choose Pro")
                )}
              </button>
              {subscription && (
                <button
                  disabled={!!busy}
                  onClick={() => void launch("portal")}
                  className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold"
                >
                  {busy === "portal" ? (
                    <Loader2 className="inline animate-spin" />
                  ) : (
                    <>
                      {tr("Billing verwalten", "Manage billing")}{" "}
                      <ExternalLink className="ml-1 inline" size={13} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
      <p className="text-xs text-muted-foreground">
        {tr(
          "Zahlungsdaten werden bei Stripe verarbeitet; Haccora speichert keine Kartennummern.",
          "Payment details are processed by Stripe; Haccora does not store card numbers.",
        )}
      </p>
    </div>
  );
}
