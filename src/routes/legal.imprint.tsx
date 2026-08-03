import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/imprint")({
  head: () => ({
    meta: [
      { title: "Impressum · Imprint — Haccora" },
      { name: "description", content: "Impressum von Haccora gemäß § 5 DDG." },
      { property: "og:title", content: "Impressum — Haccora" },
      { property: "og:url", content: "/legal/imprint" },
    ],
    links: [{ rel: "canonical", href: "/legal/imprint" }],
  }),
  component: () => <LegalPage k="imprint" />,
});
