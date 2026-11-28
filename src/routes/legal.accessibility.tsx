import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility — Haccora" },
      { name: "description", content: "Haccora accessibility statement and contact route." },
      { property: "og:title", content: "Accessibility — Haccora" },
      { property: "og:description", content: "Haccora accessibility statement and contact route." },
      { property: "og:url", content: "https://haccora.co.uk/legal/accessibility" },
      { property: "og:image", content: "https://haccora.co.uk/og-haccora-v2.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:type", content: "image/png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Accessibility — Haccora" },
      {
        name: "twitter:description",
        content:
          "Haccora accessibility statement and contact route.",
      },
      { name: "twitter:image", content: "https://haccora.co.uk/og-haccora-v2.png" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/legal/accessibility" }],
  }),
  component: () => <LegalPage k="accessibility" />,
});
