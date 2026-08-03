import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "AGB · Terms — Haccora" },
      { name: "description", content: "Allgemeine Geschäftsbedingungen für Haccora." },
      { property: "og:title", content: "AGB — Haccora" },
      { property: "og:url", content: "/legal/terms" },
    ],
    links: [{ rel: "canonical", href: "/legal/terms" }],
  }),
  component: () => <LegalPage k="terms" />,
});
