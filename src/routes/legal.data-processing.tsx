import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/data-processing")({
  head: () => ({
    meta: [
      { title: "Data processing — Haccora" },
      { name: "description", content: "Summary of Haccora's UK GDPR processor commitments." },
    ],
    links: [{ rel: "canonical", href: "/legal/data-processing" }],
  }),
  component: () => <LegalPage k="dataProcessing" />,
});
