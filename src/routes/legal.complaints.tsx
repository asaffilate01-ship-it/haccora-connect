import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/complaints")({
  head: () => ({
    meta: [
      { title: "Beschwerden · Complaints — Haccora" },
      { name: "description", content: "Beschwerdeverfahren und Hinweisgeberschutz bei Haccora." },
      { property: "og:title", content: "Beschwerden — Haccora" },
      { property: "og:url", content: "/legal/complaints" },
    ],
    links: [{ rel: "canonical", href: "/legal/complaints" }],
  }),
  component: () => <LegalPage k="complaints" />,
});
