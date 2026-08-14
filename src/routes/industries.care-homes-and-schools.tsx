import { createFileRoute } from "@tanstack/react-router";
import { IndustryPage, industryHead } from "@/components/IndustryPage";
import { CARE_HOMES } from "@/lib/industries";

export const Route = createFileRoute("/industries/care-homes-and-schools")({
  head: () => industryHead(CARE_HOMES),
  component: () => <IndustryPage content={CARE_HOMES} />,
});
