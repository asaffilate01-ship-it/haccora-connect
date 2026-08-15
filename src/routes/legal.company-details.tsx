import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { legalPublishReady } from "@/lib/public-config";

export const Route = createFileRoute("/legal/company-details")({
  head: () => ({
    meta: [
      { title: "Company details — Haccora" },
      { name: "description", content: "UK company and contact details for Haccora." },
      {
        name: "robots",
        content: legalPublishReady ? "index, follow" : "noindex, nofollow",
      },
      { property: "og:title", content: "Company details — Haccora" },
      { property: "og:url", content: "https://haccora.co.uk/legal/company-details" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/legal/company-details" }],
  }),
  component: () => <LegalPage k="company" />,
});
