import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";
import { ContactCard } from "@/components/marketing/ContactForm";
import { PUBLIC_CONFIG } from "@/lib/public-config";

const TITLE = "Contact Haccora — talk to our UK food safety team";
const DESCRIPTION =
  "Ask a question, book a walkthrough or get help moving your paper diary to Haccora. Our UK team replies on working days.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://haccora.co.uk/contact" },
      { property: "og:image", content: "https://haccora.co.uk/og-haccora.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://haccora.co.uk/og-haccora.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { legal } = PUBLIC_CONFIG;
  return (
    <MarketingShell>
      <section className="bg-[color:var(--color-cream)]">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-14 md:py-20 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] items-start">
          <div>
            <div className="eyebrow">Contact</div>
            <h1 className="mt-4 display-black text-3xl md:text-5xl">
              Talk to the Haccora team.
            </h1>
            <p className="mt-5 max-w-xl text-black/65">
              Tell us about your sites and how you record food safety today. We will show you how
              Haccora replaces the paperwork and what your inspection pack will look like.
            </p>

            <ul className="mt-8 space-y-4 text-sm">
              {legal.email && (
                <li className="flex items-center gap-3">
                  <span className="icon-3d icon-3d-sm">
                    <Mail size={18} strokeWidth={2.3} />
                  </span>
                  <a className="font-semibold hover:underline" href={`mailto:${legal.email}`}>
                    {legal.email}
                  </a>
                </li>
              )}
              {legal.phone && (
                <li className="flex items-center gap-3">
                  <span className="icon-3d icon-3d-sm">
                    <Phone size={18} strokeWidth={2.3} />
                  </span>
                  <a
                    className="font-semibold hover:underline"
                    href={`tel:${legal.phone.replace(/\s/g, "")}`}
                  >
                    {legal.phone}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-3">
                <span className="icon-3d icon-3d-sm">
                  <MapPin size={18} strokeWidth={2.3} />
                </span>
                <Link className="font-semibold hover:underline" to="/legal/company-details">
                  Company details
                </Link>
              </li>
            </ul>

            <p className="mt-8 text-sm text-black/60">
              Already a customer? Visit the{" "}
              <Link to="/help" className="font-semibold underline underline-offset-2">
                Help Centre
              </Link>{" "}
              for step-by-step guides.
            </p>
          </div>

          <ContactCard />
        </div>
      </section>
    </MarketingShell>
  );
}
