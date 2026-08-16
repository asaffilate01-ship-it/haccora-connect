import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  ClipboardCheck,
  FileText,
  Lock,
  ShieldCheck,
  Smartphone,
  Thermometer,
  Users,
  Wheat,
  CheckCircle2,
} from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { FollowBar } from "@/components/SocialIcons";
import { PUBLIC_CONFIG } from "@/lib/public-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Haccora — Digital food safety for UK food businesses" },
      {
        name: "description",
        content:
          "Haccora is one platform for HACCP, temperature logs, cleaning, allergens, training and EHO inspection evidence — web, mobile app and platform console for UK food businesses.",
      },
      { property: "og:title", content: "Haccora — Digital food safety for UK food businesses" },
      {
        property: "og:description",
        content:
          "HACCP, daily diary, temperature monitoring, allergens and PPDS, staff compliance and one-tap inspection packs — built for UK kitchens.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://haccora.co.uk/og-haccora.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://haccora.co.uk/og-haccora.jpg" },
    ],
  }),
  component: PromoHome,
});

const MODULES = [
  {
    icon: ClipboardCheck,
    title: "Digital HACCP & safe methods",
    body: "SFBB-style safe methods, hazard analysis, critical limits and corrective actions kept current and signed off.",
  },
  {
    icon: Thermometer,
    title: "Temperature & monitoring",
    body: "Fridge, freezer, probe, cooking and cooling logs with out-of-range alerts and sensor integration.",
  },
  {
    icon: FileText,
    title: "Daily diary & opening checks",
    body: "Opening, closing and cleaning routines completed on any device, timestamped with photo evidence.",
  },
  {
    icon: Wheat,
    title: "Allergens & PPDS labelling",
    body: "Recipe-level allergen matrix, Natasha's Law compliant PPDS labels and menu change control.",
  },
  {
    icon: Users,
    title: "Staff compliance & training",
    body: "Inductions, training records, fitness to work and expiry reminders across every site.",
  },
  {
    icon: ShieldCheck,
    title: "Inspection evidence packs",
    body: "One tap produces a structured evidence pack for your EHO — no folders, no last-minute panic.",
  },
];

const PLATFORM = [
  {
    icon: Smartphone,
    title: "Mobile app and PWA",
    body: "iOS and Android app plus an installable web app, with offline capture that syncs when signal returns.",
  },
  {
    icon: Bell,
    title: "Alerts and notifications",
    body: "Push, email and in-app alerts for missed checks, breaches, expiries and corrective actions.",
  },
  {
    icon: Lock,
    title: "Roles, permissions and audit",
    body: "Owner, manager, chef, staff and read-only inspector roles with tenant isolation and full audit trails.",
  },
];

function PromoHome() {
  return (
    <div className="marketing-shell min-h-screen bg-white text-foreground">
      <header className="bg-black text-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-3">
          <BrandLogo imgClassName="h-9 md:h-12 w-auto" />
          <div className="flex items-center gap-3">
            <FollowBar dark />
            <Link to="/unlock" className="btn-red !px-4 !py-2 !text-xs sm:!text-sm">
              Enter site <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <section className="bg-black text-white">
          <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24 grid gap-10 md:grid-cols-[1.15fr_0.85fr] items-center">
            <div>
              <p className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-[color:var(--color-alert-red)]">
                Preview access · UK food safety software
              </p>
              <h1 className="hero-title mt-4 display-black uppercase tracking-tight">
                Every food safety record, in one place
              </h1>
              <p className="mt-5 max-w-xl text-white/70 text-base md:text-lg leading-relaxed">
                Haccora replaces paper diaries, temperature sheets and folders of printouts with one
                simple system your whole team can use — kitchen, office and inspector.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/unlock" className="btn-red">
                  Enter with promo password <ArrowRight size={16} />
                </Link>
                <a href={`mailto:${PUBLIC_CONFIG.legal.email}`} className="btn-red-outline">
                  Request access
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
                {[
                  "Built for UK regulation",
                  "Works offline in the kitchen",
                  "Inspector-ready evidence",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[color:var(--color-alert-red)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-polished-dark rounded-3xl p-6 md:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-white/50">
                What you get
              </p>
              <div className="mt-5 grid gap-4">
                {[
                  ["Compliance workspace", "Diary, checks, HACCP, allergens, training"],
                  ["Mobile app", "Capture evidence and scan equipment QR codes"],
                  ["Platform console", "Multi-site oversight, support and audit trail"],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <p className="font-black">{title}</p>
                    <p className="mt-1 text-sm text-white/60">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24">
          <p className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-[color:var(--color-alert-red)]">
            The platform
          </p>
          <h2 className="mt-3 display-black uppercase tracking-tight">
            Everything a UK food business has to prove
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="card-polished rounded-3xl p-6">
                <span className="icon-3d inline-flex h-12 w-12 items-center justify-center rounded-2xl">
                  <Icon size={22} />
                </span>
                <h3 className="mt-4 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Platform strip */}
        <section className="bg-black text-white">
          <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-20 grid gap-6 md:grid-cols-3">
            {PLATFORM.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <span className="icon-3d-dark inline-flex h-12 w-12 items-center justify-center rounded-2xl">
                  <Icon size={22} />
                </span>
                <h3 className="mt-4 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Who it's for */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24">
          <h2 className="display-black uppercase tracking-tight">Built for UK food businesses</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Restaurants and cafés, takeaways and fast food, pubs and bars, care homes and schools,
            bakeries, dark kitchens and multi-site groups.
          </p>
          <div className="mt-10 rounded-3xl bg-black text-white p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-2xl md:text-3xl font-black">This is a private preview</h3>
              <p className="mt-2 text-white/60 max-w-xl">
                The full website, pricing, help centre and product workspace are behind a password
                while we finish our launch. Enter the promo password to continue.
              </p>
            </div>
            <Link to="/unlock" className="btn-red shrink-0">
              Enter site <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-black text-white/60">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-xs">
          <p>
            © {new Date().getFullYear()} {PUBLIC_CONFIG.legal.companyName}. Food safety software for
            UK food businesses.
          </p>
          <a href={`mailto:${PUBLIC_CONFIG.legal.email}`} className="hover:text-white">
            {PUBLIC_CONFIG.legal.email}
          </a>
        </div>
      </footer>
    </div>
  );
}
