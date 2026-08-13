import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms and conditions — Haccora" },
      { name: "description", content: "Terms and conditions for the Haccora service." },
      { property: "og:title", content: "Terms and conditions — Haccora" },
      { property: "og:url", content: "https://haccora.co.uk/legal/terms" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/legal/terms" }],
  }),
  component: () => <LegalPage k="terms" />,
});
