import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms and conditions — Haccora" },
      {
        name: "description",
        content:
          "Read the Haccora terms and conditions: subscription terms, acceptable use, data ownership, liability limits and how to end your account.",
      },
      { property: "og:title", content: "Terms and conditions — Haccora" },
      {
        property: "og:description",
        content:
          "Haccora terms of service, acceptable use, data ownership, liability and cancellation terms for UK food businesses.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://haccora.co.uk/legal/terms" },
      { property: "og:image", content: "https://haccora.co.uk/og-haccora.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://haccora.co.uk/og-haccora.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/legal/terms" }],
  }),
  component: () => <LegalPage k="terms" />,
});
