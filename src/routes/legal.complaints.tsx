import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/complaints")({
  head: () => ({
    meta: [
      { title: "Complaints — Haccora" },
      { name: "description", content: "Haccora customer complaints and escalation procedure." },
      { property: "og:title", content: "Complaints — Haccora" },
      { property: "og:url", content: "https://haccora.co.uk/legal/complaints" },
      {
        property: "og:description",
        content:
          "Haccora customer complaints and escalation procedure.",
      },
      { property: "og:image", content: "https://haccora.co.uk/og-haccora-v2.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:type", content: "image/png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Complaints — Haccora" },
      {
        name: "twitter:description",
        content:
          "Haccora customer complaints and escalation procedure.",
      },
      { name: "twitter:image", content: "https://haccora.co.uk/og-haccora-v2.png" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/legal/complaints" }],
  }),
  component: () => <LegalPage k="complaints" />,
});
