import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { FollowBar } from "@/components/SocialIcons";
import { posts, formatDate } from "@/lib/blog";
import { ArrowRight, Clock } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — Haccora" },
      {
        name: "description",
        content:
          "HACCP, Food-handler health, food hygiene and daily operations — practical guides for UK food businesses.",
      },
      {
        property: "og:title",
        content: "Haccora Blog — Food safety insights for UK food businesses",
      },
      {
        property: "og:description",
        content:
          "HACCP, Food-handler health, food hygiene and daily operations — practical guides for UK food businesses.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://haccora.co.uk/blog" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { t } = useI18n();
  const [featured, ...rest] = posts;

  return (
    <div className="min-h-screen bg-white text-foreground">
      {/* black top bar */}
      <div className="bg-black text-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-4">
          <BrandLogo light imgClassName="h-14 md:h-16 w-auto" />

          <div className="flex items-center gap-3">
            <FollowBar dark />
          </div>
        </div>
      </div>

      {/* header */}
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24 grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-10 items-end">
          <div>
            <div className="eyebrow">{t("blog.eyebrow") ?? "Insights"}</div>
            <h1 className="mt-4 display-black text-4xl md:text-6xl">
              {t("blog.title") ?? "Haccora Blog"}
            </h1>
            <p className="mt-5 max-w-2xl text-black/60 text-lg">
              {t("blog.subtitle") ??
                "Practical guides on HACCP, inspections and daily operations for UK food businesses."}
            </p>
          </div>
          <nav className="text-sm">
            <Link to="/" className="text-black/60 hover:text-black">
              ← {t("blog.backHome") ?? "Back to home"}
            </Link>
          </nav>
        </div>
      </section>

      {/* featured */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10">
          <Link
            to="/blog/$slug"
            params={{ slug: featured.slug }}
            className="group grid md:grid-cols-2 gap-8 rounded-3xl overflow-hidden border border-black/10 hover:shadow-2xl transition"
          >
            <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden bg-black">
              <img
                src={featured.image}
                alt={featured.imageAlt}
                width={1600}
                height={900}
                className="h-full w-full object-cover group-hover:scale-[1.03] transition duration-500"
              />
              <span className="absolute top-4 left-4 rounded-full bg-[color:var(--color-alert-red)] text-white text-[10px] font-black tracking-widest uppercase px-3 py-1">
                {t("blog.featured") ?? "Featured"}
              </span>
            </div>
            <div className="p-6 md:p-10 flex flex-col justify-center">
              <div className="text-xs font-black uppercase tracking-widest text-[color:var(--color-alert-red)]">
                {featured.category}
              </div>
              <h2 className="mt-3 display-black text-2xl md:text-4xl leading-[1.08] group-hover:text-[color:var(--color-alert-red)] transition">
                {featured.title}
              </h2>
              <p className="mt-4 text-black/60">{featured.excerpt}</p>
              <div className="mt-6 flex items-center gap-4 text-xs text-black/50">
                <span>{formatDate(featured.date)}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> {featured.readMinutes} {t("blog.min") ?? "min"}
                </span>
                <span>{featured.author}</span>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 font-black text-sm uppercase tracking-widest text-black">
                {t("blog.readMore") ?? "Read article"} <ArrowRight size={16} />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* grid */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 pb-24">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((p) => (
              <Link
                key={p.slug}
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="group card-polished overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-black">
                  <img
                    src={p.image}
                    alt={p.imageAlt}
                    width={1600}
                    height={900}
                    loading="lazy"
                    className="h-full w-full object-cover group-hover:scale-[1.05] transition duration-500"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-alert-red)]">
                    {p.category}
                  </div>
                  <h3 className="mt-2 display-black text-xl leading-tight group-hover:text-[color:var(--color-alert-red)] transition">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm text-black/60 line-clamp-3">{p.excerpt}</p>
                  <div className="mt-5 flex items-center justify-between text-xs text-black/50">
                    <span>{formatDate(p.date)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} /> {p.readMinutes} {t("blog.min") ?? "min"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-black text-white/70">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10 flex flex-wrap items-center justify-between gap-6 text-sm">
          <div>© {new Date().getFullYear()} Haccora</div>
          <FollowBar dark />
        </div>
      </footer>
    </div>
  );
}
