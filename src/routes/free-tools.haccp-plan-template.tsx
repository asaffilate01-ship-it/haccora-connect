import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { CheckCircle2, Download, FileText, ArrowRight } from "lucide-react";

const TITLE = "Free HACCP Plan Template UK (PDF + editable) — Haccora";
const DESCRIPTION =
  "Download a free UK HACCP plan template — printable PDF plus an editable version. Hazard analysis, CCPs, critical limits, monitoring and corrective action records for EHO inspections.";
const URL = "https://haccora.co.uk/free-tools/haccp-plan-template";

const FAQS = [
  {
    question: "Is this HACCP template suitable for UK food businesses?",
    answer:
      "Yes. It follows the Codex HACCP principles used by UK enforcement officers and mirrors the structure of Safer Food, Better Business (SFBB) style documentation for small and medium food businesses in England, Wales, Scotland and Northern Ireland.",
  },
  {
    question: "Do I need to pay or sign up to download it?",
    answer:
      "No. The PDF and the editable Markdown version are free to download and use in your own food safety management system.",
  },
  {
    question: "Does a template replace a food safety management system?",
    answer:
      "No. A template documents your plan; an EHO also expects dated monitoring records, corrective actions and staff training evidence. Haccora keeps those records automatically so your paperwork is always inspection-ready.",
  },
];

const CONTENTS = [
  "Business and scope details, plus your HACCP team",
  "Product description, intended use and vulnerable groups",
  "Process flow diagram worksheet with verification sign-off",
  "Hazard analysis table (biological, chemical, physical, allergenic)",
  "Critical control points with critical limits and justification",
  "Monitoring procedures: who, what, when and how",
  "Corrective actions and deviation log",
  "Verification, review and record-keeping schedule",
  "Allergen matrix and Natasha's Law (PPDS) labelling checklist",
];

export const Route = createFileRoute("/free-tools/haccp-plan-template")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Free HACCP Plan Template UK (PDF + editable)" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "HowTo",
              name: "How to write a HACCP plan for a UK food business",
              description: DESCRIPTION,
              step: [
                { "@type": "HowToStep", name: "Describe your business, products and processes" },
                { "@type": "HowToStep", name: "Draw and verify your process flow diagram" },
                { "@type": "HowToStep", name: "Analyse hazards at each step" },
                { "@type": "HowToStep", name: "Set critical control points and critical limits" },
                { "@type": "HowToStep", name: "Define monitoring and corrective actions" },
                { "@type": "HowToStep", name: "Verify, review and keep dated records" },
              ],
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQS.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
            },
          ],
        }),
      },
    ],
  }),
  component: HaccpTemplatePage,
});

function HaccpTemplatePage() {
  return (
    <MarketingShell>
      <section className="border-b border-black/10">
        <div className="mx-auto max-w-[1100px] px-4 md:px-8 py-14 md:py-20">
          <div className="eyebrow">Free download</div>
          <h1 className="mt-4 display-black text-4xl md:text-6xl">
            HACCP Plan Template UK — PDF and editable
          </h1>
          <p className="mt-5 max-w-3xl text-black/60 text-lg">
            A complete, EHO-friendly HACCP plan template for UK restaurants, cafés, takeaways and
            catering businesses. Print it, or edit it and make it your own. No sign-up required.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/downloads/haccp-plan-template-uk.pdf"
              download
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-alert-red)] px-6 py-3 text-sm font-black uppercase tracking-widest text-white"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download PDF
            </a>
            <a
              href="/downloads/haccp-plan-template-uk.md"
              download
              className="inline-flex items-center gap-2 rounded-full border border-black/15 px-6 py-3 text-sm font-black uppercase tracking-widest hover:bg-black hover:text-white transition"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download editable version
            </a>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f7f8] border-b border-black/10">
        <div className="mx-auto max-w-[1100px] px-4 md:px-8 py-14 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="display-black text-2xl md:text-3xl">What's inside</h2>
            <ul className="mt-6 space-y-3">
              {CONTENTS.map((item) => (
                <li key={item} className="flex gap-3 text-black/70">
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-[color:var(--color-alert-red)]"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-black/10 bg-white p-8">
            <h2 className="display-black text-2xl">From template to living records</h2>
            <p className="mt-4 text-black/60">
              A template proves you have a plan. An inspector also wants dated evidence that the
              plan is followed every day — fridge and probe temperatures, cleaning sign-offs,
              deliveries, allergen checks and corrective actions.
            </p>
            <p className="mt-4 text-black/60">
              Haccora turns this template into scheduled checks on phones and tablets, with
              automatic reminders, photo evidence and an inspection pack you can hand over in
              seconds.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-black uppercase tracking-widest text-white"
            >
              Start free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1100px] px-4 md:px-8 py-14">
          <h2 className="display-black text-2xl md:text-3xl">Questions about the template</h2>
          <dl className="mt-8 space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-black/10 p-6">
                <dt className="font-black">{faq.question}</dt>
                <dd className="mt-2 text-black/60">{faq.answer}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-sm text-black/50">
            Related reading:{" "}
            <Link to="/blog" className="underline">
              the Haccora blog
            </Link>{" "}
            and{" "}
            <Link to="/industries/restaurants-and-cafes" className="underline">
              food safety software for restaurants and cafés
            </Link>
            .
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
