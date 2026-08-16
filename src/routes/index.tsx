import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
import heroKitchen from "@/assets/promo-hero-kitchen.jpg";
import shotToday from "@/assets/screenshot-today.jpg";
import shotTemperature from "@/assets/screenshot-temperature.jpg";
import shotInspection from "@/assets/screenshot-inspection.jpg";
import shotDiary from "@/assets/screenshot-diary.jpg";
import shotHome from "@/assets/screenshot-home.jpg";


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
    tone: "icon-3d",
    title: "Digital HACCP & safe methods",
    body: "SFBB-style safe methods, hazard analysis, critical limits and corrective actions kept current and signed off.",
  },
  {
    icon: Thermometer,
    tone: "icon-3d-green",
    title: "Temperature & monitoring",
    body: "Fridge, freezer, probe, cooking and cooling logs with out-of-range alerts and sensor integration.",
  },
  {
    icon: FileText,
    tone: "icon-3d-dark",
    title: "Daily diary & opening checks",
    body: "Opening, closing and cleaning routines completed on any device, timestamped with photo evidence.",
  },
  {
    icon: Wheat,
    tone: "icon-3d-green",
    title: "Allergens & PPDS labelling",
    body: "Recipe-level allergen matrix, Natasha's Law compliant PPDS labels and menu change control.",
  },
  {
    icon: Users,
    tone: "icon-3d-dark",
    title: "Staff compliance & training",
    body: "Inductions, training records, fitness to work and expiry reminders across every site.",
  },
  {
    icon: ShieldCheck,
    tone: "icon-3d",
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

const HERO_CARDS: [string, string, typeof ClipboardCheck][] = [
  ["Compliance workspace", "Diary, checks, HACCP, allergens, training", ClipboardCheck],
  ["Mobile app", "Capture evidence and scan equipment QR codes", Smartphone],
  ["Platform console", "Multi-site oversight, support and audit trail", ShieldCheck],
];

const SCREENS = [
  {
    id: "today",
    label: "Today's shift",
    src: shotToday,
    caption: "Open, monitor and close — the day's work in one focused screen.",
    alt: "Haccora Today's shift screen showing opening checks, monitoring and closing routines",
  },
  {
    id: "temperature",
    label: "Temperatures",
    src: shotTemperature,
    caption: "Fridge, freezer and probe readings with instant out-of-range flags.",
    alt: "Haccora temperature monitoring screen with walk-in fridge and freezer readings",
  },
  {
    id: "inspection",
    label: "Inspector mode",
    src: shotInspection,
    caption: "Generate a read-only evidence pack for the food control authority.",
    alt: "Haccora inspector mode screen generating a read-only evidence pack",
  },
  {
    id: "diary",
    label: "Daily diary",
    src: shotDiary,
    caption: "Timestamped opening, closing and cleaning records with sign-off.",
    alt: "Haccora daily diary screen listing completed opening and closing records",
  },
  {
    id: "site",
    label: "Website",
    src: shotHome,
    caption: "The full marketing site, pricing and help centre behind the gate.",
    alt: "Haccora marketing website homepage",
  },
] as const;

function ScreenshotGallery() {
  const [active, setActive] = useState(0);
  const screen = SCREENS[active]!;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {SCREENS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(index)}
            aria-pressed={index === active}
            className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
              index === active
                ? "bg-[color:var(--color-alert-red)] text-white shadow-lg shadow-black/20"
                : "border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <figure className="mt-6">
        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0d0d0d] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.95)]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="ml-3 truncate rounded-md bg-white/5 px-3 py-1 text-[0.65rem] font-bold tracking-wide text-white/45">
              haccora.co.uk
            </span>
          </div>
          <img
            key={screen.id}
            src={screen.src}
            width={1440}
            height={759}
            loading="lazy"
            alt={screen.alt}
            className="w-full animate-in fade-in duration-300"
          />
        </div>
        <figcaption className="mt-4 text-sm text-white/60">{screen.caption}</figcaption>
      </figure>
    </div>
  );
}



function PromoHome() {
  return (
    <div className="marketing-shell min-h-screen bg-white text-foreground">
      <header className="sticky top-0 z-40 bg-black/90 text-white backdrop-blur-md border-b border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-3">
          <BrandLogo imgClassName="h-9 md:h-12 w-auto" />
          <div className="flex items-center gap-3">
            <FollowBar dark />
            <Link
              to="/unlock"
              className="btn-red !px-4 !py-2 !text-xs sm:!text-sm shadow-lg shadow-black/40"
            >
              Enter site <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-black text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(70% 55% at 12% 0%, color-mix(in oklab, var(--color-alert-red) 42%, transparent) 0%, transparent 62%), radial-gradient(55% 45% at 92% 18%, color-mix(in oklab, var(--color-alert-orange) 28%, transparent) 0%, transparent 65%)",
            }}
          />
          <div className="relative mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24 grid gap-10 md:grid-cols-[1.15fr_0.85fr] items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/80 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-alert-red)]" />
                Preview access · UK food safety software
              </p>
              <h1 className="hero-title mt-5 display-black uppercase tracking-tight">
                Every food safety record, in one place
              </h1>
              <p className="mt-5 max-w-xl text-white/75 text-base md:text-lg leading-relaxed">
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
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/65">
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

            <div className="relative">
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 shadow-[0_50px_100px_-40px_rgba(0,0,0,0.9)]">
                <img
                  src={heroKitchen}
                  width={1600}
                  height={1200}
                  alt="Chef reviewing digital food safety checks on a tablet in a busy commercial kitchen"
                  className="h-[320px] w-full object-cover md:h-[460px]"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, color-mix(in oklab, black 10%, transparent) 0%, color-mix(in oklab, black 78%, transparent) 100%)",
                  }}
                />
                <div className="absolute inset-x-4 bottom-4 md:inset-x-6 md:bottom-6">
                  <div className="rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
                    <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-white/50">
                      What you get
                    </p>
                    <div className="mt-3 grid gap-2">
                      {HERO_CARDS.map(([title, body, Icon]) => (
                        <div key={title} className="flex items-start gap-3">
                          <span className="icon-3d icon-3d-sm shrink-0">
                            <Icon size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-black leading-tight">{title}</p>
                            <p className="truncate text-xs text-white/60">{body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Proof strip */}
          <div className="relative border-t border-white/10">
            <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px px-4 md:grid-cols-4 md:px-8">
              {[
                ["6", "compliance modules"],
                ["1 tap", "inspection evidence pack"],
                ["Offline", "capture in the kitchen"],
                ["Multi-site", "oversight and audit trail"],
              ].map(([stat, label]) => (
                <div key={label} className="py-8 md:py-10">
                  <p className="text-2xl md:text-3xl font-black text-white">{stat}</p>
                  <p className="mt-1 text-xs md:text-sm text-white/55 leading-snug">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modules */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24">
          <p className="eyebrow">The platform</p>
          <h2 className="mt-3 display-black uppercase tracking-tight">
            Everything a UK food business has to prove
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ icon: Icon, tone, title, body }) => (
              <article key={title} className="card-polished group p-6 md:p-7">
                <span className={`${tone} icon-3d-sm`}>
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <h3 className="mt-5 text-lg font-black leading-tight">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[color:var(--color-alert-red)] opacity-0 transition-opacity group-hover:opacity-100">
                  Included
                  <ArrowRight size={13} />
                </span>
              </article>
            ))}
          </div>
        </section>

        {/* Platform strip */}
        <section className="bg-black text-white">
          <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-20 grid gap-5 md:grid-cols-3">
            {PLATFORM.map(({ icon: Icon, title, body }) => (
              <article key={title} className="card-polished-dark p-6 md:p-7">
                <span className="icon-3d-dark icon-3d-sm">
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <h3 className="mt-5 text-lg font-black leading-tight">{title}</h3>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Who it's for */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24">
          <p className="eyebrow">Who it&apos;s for</p>
          <h2 className="mt-3 display-black uppercase tracking-tight">
            Built for UK food businesses
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Restaurants and cafés, takeaways and fast food, pubs and bars, care homes and schools,
            bakeries, dark kitchens and multi-site groups.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              "Restaurants & cafés",
              "Takeaways",
              "Pubs & bars",
              "Care homes",
              "Schools",
              "Bakeries",
              "Dark kitchens",
              "Multi-site groups",
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs font-bold text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="relative mt-12 overflow-hidden rounded-[1.75rem] bg-black text-white p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 120% at 90% 20%, color-mix(in oklab, var(--color-alert-red) 40%, transparent) 0%, transparent 60%)",
              }}
            />
            <div className="relative">
              <h3 className="text-2xl md:text-3xl font-black">This is a private preview</h3>
              <p className="mt-2 text-white/70 max-w-xl">
                The full website, pricing, help centre and product workspace are behind a password
                while we finish our launch. Enter the promo password to continue.
              </p>
            </div>
            <Link to="/unlock" className="btn-red relative shrink-0">
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
