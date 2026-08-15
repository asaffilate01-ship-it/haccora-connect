import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function Pricing() {
  const { t } = useI18n();
  const plans = [
    {
      k: "solo",
      price: "£9.99",
      featured: false,
      features: [
        "Daily routines and temperature logs",
        "Document and training expiry alerts",
        "Inspection-ready exports",
      ],
    },
    {
      k: "complete",
      price: "£24.99",
      featured: true,
      features: [
        "All Solo features",
        "Unlimited staff and all modules",
        "Printable QR equipment history",
      ],
    },
    {
      k: "group",
      price: "£59.99",
      featured: false,
      features: ["Up to three locations", "Group oversight and alerts", "Scoped inspector access"],
    },
    {
      k: "enterprise",
      price: "Custom",
      featured: false,
      features: [
        "Four or more locations",
        "SLA and implementation support",
        "Integrations and governance",
      ],
    },
  ] as const;
  return (
    <section id="pricing" className="bg-white">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-32">
        <div className="max-w-3xl">
          <div className="eyebrow">{t("pricing.eyebrow") ?? "Plans"}</div>
          <h2 className="mt-4 display-black text-3xl md:text-6xl">{t("pricing.title")}</h2>
          <p className="mt-5 text-black/60">{t("pricing.subtitle")}</p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          {plans.map((p) => (
            <div
              key={p.k}
              className={`relative flex h-full flex-col p-8 ${
                p.featured
                  ? "card-polished-dark text-white ring-4 ring-[color:var(--color-alert-red)]/60"
                  : "card-polished text-black"
              }`}
            >
              <div className="mb-4 flex min-h-[1.75rem] items-start">
                {p.featured && (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black leading-tight tracking-[0.14em] uppercase text-white bg-[color:var(--color-alert-red)] shadow-lg">
                    {t("pricing.featured") ?? "Most Popular"}
                  </span>
                )}
              </div>

              <h3 className="display-black text-2xl">{t(`pricing.plan.${p.k}`)}</h3>
              <p
                className={`text-sm mt-2 min-h-[2.5rem] leading-snug ${p.featured ? "text-white/70" : "text-black/60"}`}
              >
                {t(`pricing.plan.${p.k}.desc`)}
              </p>
              <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="display-black text-5xl">{p.price}</span>
                {p.k !== "enterprise" && (
                  <span className={`text-sm ${p.featured ? "text-white/70" : "text-black/60"}`}>
                    {t("pricing.perMonth")}
                  </span>
                )}
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((feature) => (
                  <li key={feature} className={p.featured ? "text-white/80" : "text-black/65"}>
                    ✓ {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-7">
                <a
                  href={p.k === "enterprise" ? "/contact" : "/login"}
                  className={`inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-black tracking-wider uppercase transition ${
                    p.featured
                      ? "bg-[color:var(--color-alert-green)] text-white hover:brightness-110"
                      : "bg-black text-white hover:bg-[color:var(--color-alert-red)]"
                  }`}
                >
                  {p.k === "enterprise" ? "Contact sales" : "Start 7-day free trial"}
                </a>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-black/60">
          VAT is added where applicable. No card required for the trial; cancel before renewal.
        </p>
      </div>
    </section>
  );
}

