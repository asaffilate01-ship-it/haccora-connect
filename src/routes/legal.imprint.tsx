import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/imprint")({
  head: () => ({
    meta: [
      { title: "Company information — Haccora" },
      { name: "description", content: "Company and contact information for Haccora." },
      { property: "og:title", content: "Company information — Haccora" },
      { property: "og:url", content: "/legal/imprint" },
    ],
    links: [{ rel: "canonical", href: "/legal/imprint" }],
  }),
  component: () => <LegalPage k="imprint" />,
});
