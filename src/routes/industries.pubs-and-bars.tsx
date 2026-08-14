import { createFileRoute } from "@tanstack/react-router";
import { IndustryPage, industryHead } from "@/components/IndustryPage";
import { PUBS } from "@/lib/industries";

export const Route = createFileRoute("/industries/pubs-and-bars")({
  head: () => industryHead(PUBS),
  component: () => <IndustryPage content={PUBS} />,
});
