import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies — Haccora" },
      { name: "description", content: "Haccora cookie policy under UK privacy rules." },
      { property: "og:title", content: "Cookies — Haccora" },
      { property: "og:url", content: "https://haccora.co.uk/legal/cookies" },
      { property: "og:description", content: "Haccora cookie policy under UK privacy rules." },
      { property: "og:image", content: "https://haccora.co.uk/og-haccora-v2.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:type", content: "image/png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Cookies — Haccora" },
      { name: "twitter:description", content: "Haccora cookie policy under UK privacy rules." },
      { name: "twitter:image", content: "https://haccora.co.uk/og-haccora-v2.png" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/legal/cookies" }],
  }),
  component: () => <LegalPage k="cookies" />,
});
