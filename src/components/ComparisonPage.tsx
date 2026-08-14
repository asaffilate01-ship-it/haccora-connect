import { Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { ArrowRight } from "lucide-react";

export interface ComparisonRow {
  criterion: string;
  haccora: string;
  competitor: string;
}

export interface ComparisonFaq {
  question: string;
  answer: string;
}

export interface ComparisonPageProps {
  competitor: string;
  heading: string;
  intro: string;
  positioning: string[];
  rows: ComparisonRow[];
  faqs: ComparisonFaq[];
}

export function ComparisonPage({
  competitor,
  heading,
  intro,
  positioning,
  rows,
  faqs,
}: ComparisonPageProps) {
  return (
    <MarketingShell>
      <section className="border-b border-black/10">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-14 md:py-20">
          <div className="eyebrow">Comparison</div>
          <h1 className="mt-4 display-black text-4xl md:text-6xl max-w-4xl">{heading}</h1>
          <p className="mt-5 max-w-3xl text-black/60 text-lg">{intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-alert-red)] px-6 py-3 text-sm font-black uppercase tracking-widest text-white"
            >
              Try Haccora free
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
          <h2 className="display-black text-2xl md:text-3xl">
            Haccora vs {competitor} at a glance
          </h2>
          <div className="mt-8 overflow-x-auto rounded-3xl border border-black/10 bg-white">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Feature comparison between Haccora and {competitor}
              </caption>
              <thead className="bg-black text-white">
                <tr>
                  <th scope="col" className="px-5 py-4 font-black uppercase tracking-widest text-xs">
                    Criterion
                  </th>
                  <th scope="col" className="px-5 py-4 font-black uppercase tracking-widest text-xs">
                    Haccora
                  </th>
                  <th scope="col" className="px-5 py-4 font-black uppercase tracking-widest text-xs">
                    {competitor}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.criterion} className="border-t border-black/10 align-top">
                    <th scope="row" className="px-5 py-4 font-black text-black/80">
                      {row.criterion}
                    </th>
                    <td className="px-5 py-4 text-black/70">{row.haccora}</td>
                    <td className="px-5 py-4 text-black/60">{row.competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-black/45">
            Comparison based on publicly available information about {competitor} at the time of
            writing. Vendors change their products and pricing — always confirm current details
            directly with each supplier before deciding.
          </p>
        </div>
      </section>

      <section className="border-b border-black/10">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-14">
          <h2 className="display-black text-2xl md:text-3xl">Where Haccora fits best</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {positioning.map((item) => (
              <li key={item} className="rounded-2xl border border-black/10 p-6 text-black/70">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-14">
          <h2 className="display-black text-2xl md:text-3xl">Common questions</h2>
          <dl className="mt-8 grid gap-5 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-black/10 p-6">
                <dt className="font-black">{faq.question}</dt>
                <dd className="mt-2 text-black/60">{faq.answer}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-sm text-black/50">
            Running a restaurant or café?{" "}
            <Link to="/industries/restaurants-and-cafes" className="underline">
              See the restaurants &amp; cafés overview
            </Link>
            .
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}

export function comparisonSchema({
  competitor,
  url,
  description,
  faqs,
}: {
  competitor: string;
  url: string;
  description: string;
  faqs: ComparisonFaq[];
}) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Haccora",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        url,
        description,
        areaServed: "GB",
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://haccora.co.uk/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: `Haccora vs ${competitor}`,
            item: url,
          },
        ],
      },
    ],
  });
}
