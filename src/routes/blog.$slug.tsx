import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ShareBar, FollowBar } from "@/components/SocialIcons";
import { posts, getPost, formatDate, type BlogBlock, type BlogPost } from "@/lib/blog";
import { ArrowLeft, Clock } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }): BlogPost => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Not found — Haccora Blog" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.title} — Haccora`;
    const desc = loaderData.excerpt;
    const url = `/blog/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: loaderData.image },
        { property: "article:published_time", content: loaderData.date },
        { property: "article:author", content: loaderData.author },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: loaderData.title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: loaderData.image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: loaderData.title,
            description: desc,
            author: { "@type": "Organization", name: loaderData.author },
            datePublished: loaderData.date,
            image: loaderData.image,
          }),
        },
      ],
    };
  },
  component: BlogPostPage,
  notFoundComponent: NotFound,
});

function BlogPostPage() {
  const post = Route.useLoaderData() as BlogPost;
  const { t } = useI18n();
  const url = `/blog/${post.slug}`;
  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-foreground">
      {/* black top bar */}
      <div className="bg-black text-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-4">
          <Link to="/" className="font-display text-2xl md:text-3xl tracking-tight text-white">
            Hacc<span className="text-[color:var(--color-alert-red)]">ora</span>
          </Link>
          <div className="flex items-center gap-3">
            <FollowBar dark />
            <LanguageToggle variant="dark" />
          </div>
        </div>
      </div>

      {/* hero */}
      <section className="relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0">
          <img
            src={post.image}
            alt={post.imageAlt}
            width={1600}
            height={900}
            className="w-full h-full object-cover opacity-60"
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.85) 100%)",
            }}
          />
        </div>
        <div className="relative mx-auto max-w-[900px] px-4 md:px-8 pt-16 md:pt-24 pb-14 md:pb-20">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm"
          >
            <ArrowLeft size={14} /> {t("blog.all") ?? "All articles"}
          </Link>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-alert-red)] px-3 py-1 text-[10px] font-black tracking-widest uppercase">
            {post.category}
          </div>
          <h1 className="mt-5 display-black text-3xl md:text-5xl leading-[1.08]">{post.title}</h1>
          <p className="mt-5 max-w-2xl text-white/80 text-base md:text-lg">{post.excerpt}</p>
          <div className="mt-6 flex flex-wrap items-center gap-5 text-xs text-white/70">
            <span>{post.author}</span>
            <span>{formatDate(post.date)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {post.readMinutes} {t("blog.min") ?? "min"}
            </span>
          </div>
        </div>
      </section>

      {/* body */}
      <article className="mx-auto max-w-[760px] px-4 md:px-8 py-14 md:py-20">
        <aside className="mb-10 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
          Editorial product information, not legal or food-safety advice. Verify requirements with
          official authorities and qualified professionals.
        </aside>
        <div className="prose-gs">
          {post.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-black/5 text-black/70 text-xs font-bold px-3 py-1"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-black/10">
          <ShareBar url={url} title={post.title} />
        </div>

        <div className="mt-14 rounded-3xl bg-black text-white p-8 md:p-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-[color:var(--color-alert-green)]">
              {t("blog.cta.eyebrow") ?? "Try it live"}
            </div>
            <h3 className="mt-2 display-black text-2xl md:text-3xl">
              {t("blog.cta.title") ?? "See Haccora in your kitchen"}
            </h3>
          </div>
          <Link to="/app" className="btn-primary">
            {t("blog.cta.button") ?? "Get started"}
          </Link>
        </div>
      </article>

      {/* related */}
      <section className="bg-black/[0.02] border-t border-black/10">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16">
          <h2 className="display-black text-3xl md:text-4xl">
            {t("blog.related") ?? "Related articles"}
          </h2>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {related.map((p) => (
              <Link
                key={p.slug}
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="group card-polished overflow-hidden flex flex-col"
              >
                <div className="aspect-[16/10] overflow-hidden bg-black">
                  <img
                    src={p.image}
                    alt={p.imageAlt}
                    width={1600}
                    height={900}
                    loading="lazy"
                    className="h-full w-full object-cover group-hover:scale-[1.05] transition duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-alert-red)]">
                    {p.category}
                  </div>
                  <h3 className="mt-2 display-black text-lg leading-tight group-hover:text-[color:var(--color-alert-red)] transition">
                    {p.title}
                  </h3>
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

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="display-black text-2xl md:text-3xl mt-10 mb-4">{block.text}</h2>;
    case "p":
      return <p className="text-black/80 leading-relaxed mb-5 text-lg">{block.text}</p>;
    case "ul":
      return (
        <ul className="mb-6 space-y-2">
          {block.items.map((it, i) => (
            <li key={i} className="pl-5 relative text-black/80">
              <span className="absolute left-0 top-3 h-1.5 w-1.5 rounded-full bg-[color:var(--color-alert-red)]" />
              {it}
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="my-8 border-l-4 border-[color:var(--color-alert-red)] pl-5 italic text-xl text-black">
          "{block.text}"
          {block.cite && (
            <div className="not-italic mt-2 text-xs font-black uppercase tracking-widest text-black/50">
              — {block.cite}
            </div>
          )}
        </blockquote>
      );
  }
}

function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-white text-black">
      <div className="text-center">
        <div className="display-black text-4xl">Not found</div>
        <Link to="/blog" className="btn-primary mt-6 inline-flex">
          Back to blog
        </Link>
      </div>
    </div>
  );
}
