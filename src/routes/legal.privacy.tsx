import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Datenschutz · Privacy — Haccora" },
      { name: "description", content: "Haccora Datenschutzerklärung nach DSGVO und BDSG." },
      { property: "og:title", content: "Datenschutz — Haccora" },
      { property: "og:url", content: "/legal/privacy" },
    ],
    links: [{ rel: "canonical", href: "/legal/privacy" }],
  }),
  component: () => <LegalPage k="privacy" />,
});
