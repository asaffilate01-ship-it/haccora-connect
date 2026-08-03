import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies — Haccora" },
      { name: "description", content: "Cookie-Richtlinie nach § 25 TDDDG und DSGVO." },
      { property: "og:title", content: "Cookies — Haccora" },
      { property: "og:url", content: "/legal/cookies" },
    ],
    links: [{ rel: "canonical", href: "/legal/cookies" }],
  }),
  component: () => <LegalPage k="cookies" />,
});
