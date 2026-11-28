import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/data-processing")({
  head: () => ({
    meta: [
      { title: "Data processing — Haccora" },
      { name: "description", content: "Summary of Haccora's UK GDPR processor commitments." },
      { property: "og:title", content: "Data processing — Haccora" },
      {
        property: "og:description",
        content:
          "Summary of Haccora's UK GDPR processor commitments.",
      },
      { property: "og:url", content: "https://haccora.co.uk/legal/data-processing" },
      { property: "og:image", content: "https://haccora.co.uk/og-haccora-v2.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:type", content: "image/png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Data processing — Haccora" },
      {
        name: "twitter:description",
        content:
          "Summary of Haccora's UK GDPR processor commitments.",
      },
      { name: "twitter:image", content: "https://haccora.co.uk/og-haccora-v2.png" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/legal/data-processing" }],
  }),
  component: () => <LegalPage k="dataProcessing" />,
});
