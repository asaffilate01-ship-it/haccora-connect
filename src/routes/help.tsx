import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { HELP_CENTRE_SECTIONS } from "@/lib/help-centre";
import { PUBLIC_CONFIG } from "@/lib/public-config";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Haccora Help Centre — UK food-safety software" },
      {
        name: "description",
        content:
          "Practical help for setting up and using Haccora records, roles, equipment QR labels, inspection evidence, subscriptions and native apps.",
      },
      { property: "og:title", content: "Haccora Help Centre" },
      {
        property: "og:description",
        content:
          "Guides for Haccora records, roles, equipment QR labels, inspection evidence and subscriptions.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://haccora.co.uk/help" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/help" }],
  }),
  component: HelpCentrePage,
});

function HelpCentrePage() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const sections = useMemo(
    () =>
      HELP_CENTRE_SECTIONS.map((section) => ({
        ...section,
        articles: section.articles.filter(({ question, answer }) =>
          `${section.title} ${question} ${answer}`.toLowerCase().includes(normalizedQuery),
        ),
      })).filter((section) => section.articles.length > 0),
    [normalizedQuery],
  );
  const resultCount = sections.reduce((total, section) => total + section.articles.length, 0);

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-black">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1180px] items-center justify-between gap-4 px-4 py-3 md:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-black/70 hover:text-black"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Home
          </Link>
          <BrandLogo imgClassName="h-8 sm:h-9 w-auto" />
          <Link
            to="/login"
            className="text-sm font-bold text-[color:var(--color-alert-red)] hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[980px] px-4 py-10 md:px-8 md:py-14">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--color-alert-red)]">
            Haccora Help Centre
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] sm:text-4xl md:text-5xl">
            Clear answers for UK food businesses.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/65 sm:text-base">
            Product guidance for owners, managers and teams. Official regulator guidance, your
            documented procedures and competent professional advice remain authoritative.
          </p>
        </div>

        <label className="mt-8 block max-w-2xl">
          <span className="sr-only">Search the Help Centre</span>
          <span className="flex min-h-12 items-center gap-3 rounded-2xl border border-black/15 bg-white px-4 shadow-sm focus-within:border-black/40 focus-within:ring-2 focus-within:ring-black/10">
            <Search size={18} className="shrink-0 text-black/45" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search roles, QR labels, offline records…"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-black/40 sm:text-base"
            />
          </span>
        </label>

        {normalizedQuery && (
          <p className="mt-3 text-sm text-black/60" aria-live="polite">
            {resultCount === 1 ? "1 answer" : `${resultCount} answers`} found.
          </p>
        )}

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section
              key={section.title}
              aria-labelledby={`help-${section.title.toLowerCase().replaceAll(" ", "-")}`}
            >
              <h2
                id={`help-${section.title.toLowerCase().replaceAll(" ", "-")}`}
                className="text-xl font-black tracking-tight sm:text-2xl"
              >
                {section.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-black/60">{section.description}</p>
              <div className="mt-4 divide-y divide-black/10 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                {section.articles.map(({ question, answer }) => (
                  <details key={question} className="group px-4 py-1 sm:px-5">
                    <summary className="cursor-pointer list-none py-4 pr-8 text-sm font-bold leading-snug marker:hidden sm:text-[0.95rem]">
                      {question}
                    </summary>
                    <p className="pb-5 pr-2 text-sm leading-relaxed text-black/65">{answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        {resultCount === 0 && (
          <div className="mt-10 rounded-2xl border border-black/10 bg-white p-6 text-sm leading-relaxed text-black/65">
            No matching answer. Try a shorter search or email{" "}
            <a
              className="font-bold text-black underline"
              href={`mailto:${PUBLIC_CONFIG.legal.email}`}
            >
              {PUBLIC_CONFIG.legal.email}
            </a>
            .
          </div>
        )}
      </main>
    </div>
  );
}
