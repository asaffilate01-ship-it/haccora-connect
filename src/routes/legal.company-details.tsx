import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { legalPublishReady } from "@/lib/public-config";

export const Route = createFileRoute("/legal/company-details")({
  head: () => ({
    meta: [
      { title: "Company details — Haccora" },
      {
        name: "description",
        content:
          "Company and contact details for Haccora, a trading name of iTechLounge: registered address, company number, email, phone and VAT/ICO registration.",
      },
      {
        name: "robots",
        content: legalPublishReady ? "index, follow" : "noindex, nofollow",
      },
      { property: "og:title", content: "Company details — Haccora" },
      {
        property: "og:description",
        content:
          "Official company and contact details for Haccora (iTechLounge): address, registration number, email, phone and VAT/ICO information.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://haccora.co.uk/legal/company-details" },
      { property: "og:image", content: "https://haccora.co.uk/og-haccora.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://haccora.co.uk/og-haccora.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/legal/company-details" }],
  }),
  component: () => <LegalPage k="company" />,
});
