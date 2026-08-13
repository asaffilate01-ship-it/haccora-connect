import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility — Haccora" },
      { name: "description", content: "Haccora accessibility statement and contact route." },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/legal/accessibility" }],
  }),
  component: () => <LegalPage k="accessibility" />,
});
