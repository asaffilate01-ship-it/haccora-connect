import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies — Haccora" },
      { name: "description", content: "Haccora cookie policy under UK privacy rules." },
      { property: "og:title", content: "Cookies — Haccora" },
      { property: "og:url", content: "https://haccora.co.uk/legal/cookies" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/legal/cookies" }],
  }),
  component: () => <LegalPage k="cookies" />,
});
