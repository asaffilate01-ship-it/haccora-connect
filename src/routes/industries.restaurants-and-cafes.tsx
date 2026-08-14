import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import {
  ArrowRight,
  CheckCircle2,
  Thermometer,
  ClipboardCheck,
  Wheat,
  Users,
  ShieldCheck,
  Bell,
} from "lucide-react";

const TITLE = "Food Safety Software for Restaurants & Cafés (UK) — Haccora";
const DESCRIPTION =
  "Digital HACCP, fridge and probe temperature logs, cleaning schedules, allergen and PPDS controls for UK restaurants and cafés. Inspection-ready evidence for your food hygiene rating.";
const URL = "https://haccora.co.uk/industries/restaurants-and-cafes";

const PAINS = [
  {
    icon: Thermometer,
    title: "Temperature logs that never go missing",
    body: "Fridge, freezer, hot-hold, cook and cool checks on any phone. Out-of-range readings raise a corrective action automatically.",
  },
  {
    icon: ClipboardCheck,
    title: "Opening, closing and cleaning checks",
    body: "SFBB-style daily diary with photo evidence, signed by the person who actually did the task.",
  },
  {
    icon: Wheat,
    title: "Allergens and Natasha's Law",
    body: "Recipe-level allergen matrix and PPDS labelling so front of house always gives the same answer as the kitchen.",
  },
  {
    icon: Users,
    title: "Staff training and fitness to work",
    body: "Level 2 certificates, inductions and return-to-work declarations tracked with expiry reminders.",
  },
  {
    icon: Bell,
    title: "Nothing forgotten on a busy service",
    body: "Scheduled reminders by shift, escalation to the manager when a check is missed.",
  },
  {
    icon: ShieldCheck,
    title: "Walk-in inspection pack",
    body: "One tap produces a dated evidence pack for the EHO — plan, records, corrective actions and training.",
  },
];

const FAQS = [
  {
    question: "Will Haccora help improve our food hygiene rating?",
    answer:
      "Your rating reflects hygiene, structure and confidence in management. Haccora targets the third area directly by keeping your HACCP plan, daily checks and corrective actions complete, dated and instantly retrievable during an inspection.",
  },
  {
    question: "We're awaiting our first inspection — what should we have ready?",
    answer:
      "A written HACCP or SFBB-style plan, daily monitoring records from the day you opened, staff training records, supplier and delivery records, cleaning schedules and allergen information. Haccora sets all of these up from a restaurant or café template on day one.",
  },
  {
    question: "How long does set-up take for a single site café?",
    answer:
      "Most single-site cafés are running the same day. You pick a restaurant/café template, confirm your fridges and equipment, add your team, and start logging checks.",
  },
  {
    question: "Can we use it on our existing phones and tablets?",
    answer:
      "Yes. Haccora runs in the browser and installs as an app on iOS and Android devices, with offline-tolerant logging for cold rooms and basements.",
  },
];

export const Route = createFileRoute("/industries/restaurants-and-cafes")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Food safety software for UK restaurants and cafés" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
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
              "@type": "SoftwareApplication",
              name: "Haccora",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, iOS, Android",
              url: URL,
              description: DESCRIPTION,
              areaServed: "GB",
              audience: {
                "@type": "Audience",
                audienceType: "Restaurants and cafés in the United Kingdom",
              },
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
  component: RestaurantsPage,
});

function RestaurantsPage() {
  return (
    <MarketingShell>
      <section className="border-b border-black/10">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-14 md:py-20">
          <div className="eyebrow">Restaurants &amp; cafés</div>
          <h1 className="mt-4 display-black text-4xl md:text-6xl max-w-4xl">
            Food safety software for UK restaurants and cafés
          </h1>
          <p className="mt-5 max-w-3xl text-black/60 text-lg">
            Replace the folder of paper checks with digital HACCP, temperature logs, cleaning
            schedules and allergen controls — so a surprise EHO visit is a five-minute conversation,
            not a panic.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-alert-red)] px-6 py-3 text-sm font-black uppercase tracking-widest text-white"
            >
              Start free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/free-tools/haccp-plan-template"
              className="inline-flex items-center gap-2 rounded-full border border-black/15 px-6 py-3 text-sm font-black uppercase tracking-widest hover:bg-black hover:text-white transition"
            >
              Free HACCP template
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f7f8] border-b border-black/10">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-14">
          <h2 className="display-black text-2xl md:text-3xl">Built for service, not admin</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PAINS.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-3xl border border-black/10 bg-white p-6">
                <Icon className="h-6 w-6 text-[color:var(--color-alert-red)]" aria-hidden="true" />
                <h3 className="mt-4 font-black text-lg">{title}</h3>
                <p className="mt-2 text-black/60 text-sm leading-relaxed">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-black/10">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-14 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="display-black text-2xl md:text-3xl">
              Your first two weeks with Haccora
            </h2>
            <ul className="mt-6 space-y-3">
              {[
                "Day 1 — pick the restaurant/café template and confirm fridges, freezers and hot-hold units",
                "Day 2 — add the team, roles and training certificates",
                "Week 1 — daily opening, closing and temperature checks running on shift",
                "Week 2 — allergen matrix and PPDS labels signed off, inspection pack generated",
              ].map((item) => (
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
          <div className="rounded-3xl border border-black/10 bg-black text-white p-8">
            <h2 className="display-black text-2xl">Comparing options?</h2>
            <p className="mt-4 text-white/70">
              See how Haccora lines up against the tools most UK operators shortlist.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/compare/haccora-vs-logit"
                className="rounded-full border border-white/25 px-5 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition"
              >
                Haccora vs Logit
              </Link>
              <Link
                to="/compare/haccora-vs-fooddocs"
                className="rounded-full border border-white/25 px-5 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition"
              >
                Haccora vs FoodDocs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-14">
          <h2 className="display-black text-2xl md:text-3xl">
            Restaurant and café questions we hear most
          </h2>
          <dl className="mt-8 grid gap-5 md:grid-cols-2">
            {FAQS.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-black/10 p-6">
                <dt className="font-black">{faq.question}</dt>
                <dd className="mt-2 text-black/60">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </MarketingShell>
  );
}
