import { createFileRoute } from "@tanstack/react-router";
import { IndustryPage, industryHead } from "@/components/IndustryPage";
import { TAKEAWAYS } from "@/lib/industries";

export const Route = createFileRoute("/industries/takeaways-and-fast-food")({
  head: () => industryHead(TAKEAWAYS),
  component: () => <IndustryPage content={TAKEAWAYS} />,
});
