import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { posts } from "@/lib/blog";

const BASE_URL = process.env.PUBLIC_APP_URL || "https://haccora.co.uk";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/help", changefreq: "weekly", priority: "0.7" },
          { path: "/blog", changefreq: "weekly", priority: "0.8" },
          {
            path: "/free-tools/haccp-plan-template",
            changefreq: "monthly",
            priority: "0.9",
          },
          {
            path: "/industries/restaurants-and-cafes",
            changefreq: "monthly",
            priority: "0.9",
          },
          { path: "/compare/haccora-vs-logit", changefreq: "monthly", priority: "0.7" },
          { path: "/compare/haccora-vs-fooddocs", changefreq: "monthly", priority: "0.7" },
          { path: "/legal/privacy", changefreq: "monthly", priority: "0.3" },
          { path: "/legal/terms", changefreq: "monthly", priority: "0.3" },
          { path: "/legal/cookies", changefreq: "monthly", priority: "0.3" },
          { path: "/legal/company-details", changefreq: "monthly", priority: "0.3" },
          { path: "/legal/data-processing", changefreq: "monthly", priority: "0.3" },
          { path: "/legal/accessibility", changefreq: "monthly", priority: "0.3" },
          { path: "/legal/complaints", changefreq: "monthly", priority: "0.3" },
          ...posts.map((post) => ({
            path: `/blog/${post.slug}`,
            changefreq: "monthly",
            priority: "0.6",
          })),
        ];
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            `    <changefreq>${e.changefreq}</changefreq>`,
            `    <priority>${e.priority}</priority>`,
            `  </url>`,
          ].join("\n"),
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
