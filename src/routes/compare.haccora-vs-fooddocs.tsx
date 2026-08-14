import { createFileRoute } from "@tanstack/react-router";
import { ComparisonPage, comparisonSchema, type ComparisonFaq } from "@/components/ComparisonPage";

const URL = "https://haccora.co.uk/compare/haccora-vs-fooddocs";
const DESCRIPTION =
  "Compare Haccora and FoodDocs for UK food businesses: HACCP plan creation, daily monitoring, allergens and PPDS, EHO inspection evidence, mobile use and pricing.";

const FAQS: ComparisonFaq[] = [
  {
    question: "How does Haccora differ from FoodDocs?",
    answer:
      "FoodDocs is known for quickly generating a HACCP plan and monitoring app from a questionnaire, across many countries. Haccora is UK-first: its templates, terminology and evidence pack follow UK enforcement expectations, including SFBB-style diaries, Natasha's Law PPDS labelling and food-handler fitness to work.",
  },
  {
    question: "Do I still need a HACCP template if I use software?",
    answer:
      "The plan itself is the foundation, and both tools help you produce one. You can download the free Haccora HACCP plan template to see the structure before deciding on software.",
  },
  {
    question: "Which suits a business awaiting its first inspection?",
    answer:
      "Either can get a plan written quickly. Haccora additionally starts your dated monitoring records from day one and produces an inspection pack, which is what an EHO asks to see when judging confidence in management.",
  },
  {
    question: "Is Haccora usable offline in a cold room or basement?",
    answer:
      "Yes. Haccora installs as an app on iOS and Android and tolerates weak signal, syncing checks once the device reconnects.",
  },
];

export const Route = createFileRoute("/compare/haccora-vs-fooddocs")({
  head: () => ({
    meta: [
      { title: "Haccora vs FoodDocs — UK food safety software compared" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Haccora vs FoodDocs — UK food safety software compared" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: comparisonSchema({
          competitor: "FoodDocs",
          url: URL,
          description: DESCRIPTION,
          faqs: FAQS,
        }),
      },
    ],
  }),
  component: () => (
    <ComparisonPage
      competitor="FoodDocs"
      heading="Haccora vs FoodDocs"
      intro="Both tools help you produce a HACCP plan and run digital checks. This page compares them on UK-specific compliance, day-to-day evidence and what an EHO actually asks to see."
      positioning={[
        "UK operators who need SFBB-style diaries and UK enforcement terminology out of the box.",
        "Kitchens serving pre-packed for direct sale items that must meet Natasha's Law.",
        "Sites that want fitness-to-work, training expiry and supplier records in the same system.",
        "Owners who want a single inspection pack rather than assembling exports.",
      ]}
      rows={[
        {
          criterion: "Market focus",
          haccora: "United Kingdom, aligned to FSA and local authority expectations",
          competitor: "International, with country-specific templates",
        },
        {
          criterion: "HACCP creation",
          haccora: "Guided UK plan builder plus a free downloadable template",
          competitor: "Questionnaire-generated HACCP plan",
        },
        {
          criterion: "Daily diary",
          haccora: "SFBB-style opening, closing and cleaning diary with photo evidence",
          competitor: "Configurable monitoring tasks",
        },
        {
          criterion: "Allergens & PPDS",
          haccora: "Recipe-level allergen matrix and PPDS labels for Natasha's Law",
          competitor: "Allergen information supported; UK PPDS labelling varies",
        },
        {
          criterion: "People compliance",
          haccora: "Training, inductions and fitness-to-work declarations tracked with expiries",
          competitor: "Training records available depending on plan",
        },
        {
          criterion: "Inspection evidence",
          haccora: "One-tap dated EHO pack covering plan, records and corrective actions",
          competitor: "Reports and PDF exports",
        },
        {
          criterion: "Pricing model",
          haccora: "Transparent per-site subscription with a free start",
          competitor: "Tiered subscription, varies by features and locations",
        },
      ]}
      faqs={FAQS}
    />
  ),
});
