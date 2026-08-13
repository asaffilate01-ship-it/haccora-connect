import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/complaints")({
  head: () => ({
    meta: [
      { title: "Complaints — Haccora" },
      { name: "description", content: "Haccora customer complaints and escalation procedure." },
      { property: "og:title", content: "Complaints — Haccora" },
      { property: "og:url", content: "https://haccora.co.uk/legal/complaints" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/legal/complaints" }],
  }),
  component: () => <LegalPage k="complaints" />,
});
