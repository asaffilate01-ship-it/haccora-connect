import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";
import type { IndustryContent } from "@/lib/industries";
import { INDUSTRY_BASE_URL } from "@/lib/industries";

export function industryHead(content: IndustryContent) {
  const url = `${INDUSTRY_BASE_URL}/${content.slug}`;
  return {
    meta: [
      { title: content.metaTitle },
      { name: "description", content: content.description },
      { property: "og:title", content: content.title },
      { property: "og:description", content: content.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:image", content: "https://haccora.co.uk/og-haccora.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://haccora.co.uk/og-haccora.jpg" },
    ],
    links: [{ rel: "canonical", href: url }],
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
              url,
              description: content.description,
              areaServed: "GB",
              audience: { "@type": "Audience", audienceType: content.audience },
            },
            {
              "@type": "FAQPage",
              mainEntity: content.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
            },
          ],
        }),
      },
    ],
  };
}

export function IndustryPage({ content }: { content: IndustryContent }) {
  return (
    <MarketingShell>
      <section className="border-b border-black/10">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-14 md:py-20">
          <div className="eyebrow">{content.eyebrow}</div>
          <h1 className="mt-4 display-black text-4xl md:text-6xl max-w-4xl">{content.title}</h1>
          <p className="mt-5 max-w-3xl text-black/60 text-lg">{content.intro}</p>
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
            {content.pains.map(({ icon: Icon, title, body }) => (
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
            <h2 className="display-black text-2xl md:text-3xl">Your first two weeks with Haccora</h2>
            <ul className="mt-6 space-y-3">
              {content.timeline.map((item) => (
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
              <Link
                to="/industries/restaurants-and-cafes"
                className="rounded-full border border-white/25 px-5 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition"
              >
                Restaurants &amp; cafés
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-14">
          <h2 className="display-black text-2xl md:text-3xl">Questions we hear most</h2>
          <dl className="mt-8 grid gap-5 md:grid-cols-2">
            {content.faqs.map((faq) => (
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
