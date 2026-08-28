import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { Pricing } from "@/components/marketing/PricingPlans";

const TITLE = "Pricing — Haccora food safety software from £9.99 a month";
const DESCRIPTION =
  "Simple UK pricing for digital HACCP, temperature logs, cleaning, allergens and inspection evidence. Food Cart, Complete, Group and Enterprise plans with an approval-only two-month trial.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://haccora.co.uk/pricing" },
      { property: "og:image", content: "https://haccora.co.uk/og-haccora.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://haccora.co.uk/og-haccora.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/pricing" }],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <MarketingShell>
      <section className="alert-gradient text-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24">
          <div className="eyebrow text-white/80">Plans and pricing</div>
          <h1 className="mt-4 display-black text-3xl md:text-6xl max-w-4xl">
            Straightforward pricing for UK food businesses.
          </h1>
          <p className="mt-5 max-w-2xl text-white/85">
            Every plan includes digital HACCP, daily records, allergen controls and an
            inspection-ready evidence pack. Upgrade, downgrade or cancel at any time.
          </p>
        </div>
      </section>

      <Pricing />

      <section className="bg-[color:var(--color-cream)]">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-14 md:py-20 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Approval-only trial",
              body: "Haccora approves the tenant owner and activates a two-month trial with plan-bound seats and premises.",
            },
            {
              title: "VAT and UK billing",
              body: "Prices exclude VAT where applicable. Invoices are issued in GBP.",
            },
            {
              title: "Multi-site ready",
              body: "Group and Enterprise plans add site roll-ups, governance and SLA support.",
            },
          ].map((item) => (
            <div key={item.title} className="card-polished p-7">
              <h2 className="display-black text-xl">{item.title}</h2>
              <p className="mt-3 text-sm text-black/65 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-black text-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-14 md:py-20 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <h2 className="display-black text-2xl md:text-4xl max-w-2xl">
            Not sure which plan fits your kitchen?
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/contact" className="btn-red">
              Talk to us
            </Link>
            <Link to="/features" className="btn-red-outline">
              See all features
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
