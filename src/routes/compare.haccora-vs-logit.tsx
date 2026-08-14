import { createFileRoute } from "@tanstack/react-router";
import { ComparisonPage, comparisonSchema, type ComparisonFaq } from "@/components/ComparisonPage";

const URL = "https://haccora.co.uk/compare/haccora-vs-logit";
const DESCRIPTION =
  "Compare Haccora and Logit for UK food safety compliance: digital HACCP, temperature monitoring, allergens and PPDS, inspection evidence, pricing model and set-up time.";

const FAQS: ComparisonFaq[] = [
  {
    question: "What is the main difference between Haccora and Logit?",
    answer:
      "Logit is an established digital checklist and monitoring platform used widely in hospitality. Haccora is built specifically around UK inspection evidence: your HACCP plan, daily records, corrective actions, allergens and staff training all roll up into one dated pack you can hand to an EHO.",
  },
  {
    question: "Can we move our existing checklists across?",
    answer:
      "Yes. You can rebuild your current checks from Haccora templates for restaurants, cafés, takeaways and catering, or recreate your own wording step by step. Historic paper records can be attached as evidence documents.",
  },
  {
    question: "Do both support wireless temperature sensors?",
    answer:
      "Both approaches support manual probe and fridge logging. Haccora also accepts sensor readings through its integrations layer, so automated readings and manual checks live in the same audit trail.",
  },
  {
    question: "Which is better for a small independent site?",
    answer:
      "If you want a fast, low-admin set-up with UK-specific templates, allergen and PPDS handling and a one-tap inspection pack, Haccora is designed for exactly that. Larger multi-site estates should compare both on reporting depth and rollout support.",
  },
];

export const Route = createFileRoute("/compare/haccora-vs-logit")({
  head: () => ({
    meta: [
      { title: "Haccora vs Logit — UK food safety software compared" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Haccora vs Logit — UK food safety software compared" },
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
          competitor: "Logit",
          url: URL,
          description: DESCRIPTION,
          faqs: FAQS,
        }),
      },
    ],
  }),
  component: () => (
    <ComparisonPage
      competitor="Logit"
      heading="Haccora vs Logit"
      intro="Both platforms digitise food safety checks. This page sets out how they differ on UK inspection evidence, allergens and PPDS, set-up time and day-to-day use on a busy service."
      positioning={[
        "Independent restaurants and cafés that want to be inspection-ready in days, not months.",
        "Operators who need allergen and Natasha's Law (PPDS) controls tied to their recipes.",
        "Teams that want corrective actions raised automatically when a check fails.",
        "Growing groups that need one evidence standard across every site.",
      ]}
      rows={[
        {
          criterion: "Core focus",
          haccora: "UK food safety management system with inspection evidence built in",
          competitor: "Digital checklists and monitoring across hospitality operations",
        },
        {
          criterion: "HACCP plan",
          haccora: "Guided HACCP and SFBB-style plan, plus a free downloadable template",
          competitor: "Checklist-led; HACCP documentation typically maintained alongside",
        },
        {
          criterion: "Allergens & PPDS",
          haccora: "Recipe-level allergen matrix and PPDS label workflow included",
          competitor: "Available depending on modules selected",
        },
        {
          criterion: "Corrective actions",
          haccora: "Raised automatically on out-of-range readings and missed checks",
          competitor: "Supported through task and alerting features",
        },
        {
          criterion: "Inspection pack",
          haccora: "One-tap dated evidence pack for the EHO",
          competitor: "Reports and exports available",
        },
        {
          criterion: "Set-up",
          haccora: "Self-serve, same-day for a single site",
          competitor: "Typically guided onboarding",
        },
        {
          criterion: "Pricing model",
          haccora: "Transparent per-site subscription with a free start",
          competitor: "Quote-based, varies by modules and sites",
        },
      ]}
      faqs={FAQS}
    />
  ),
});
