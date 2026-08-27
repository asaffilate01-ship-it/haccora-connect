import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Haccora" },
      {
        name: "description",
        content: "Haccora privacy notice under UK GDPR and the Data Protection Act 2018.",
      },
      { property: "og:title", content: "Privacy — Haccora" },
      {
        property: "og:description",
        content:
          "Haccora privacy notice: how we collect, use and protect personal data under UK GDPR and the Data Protection Act 2018.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://haccora.co.uk/legal/privacy" },
      { property: "og:image", content: "https://haccora.co.uk/og-haccora.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://haccora.co.uk/og-haccora.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/legal/privacy" }],
  }),
  component: () => <LegalPage k="privacy" />,
});
