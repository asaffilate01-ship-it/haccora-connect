import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  Plus,
  Minus,
} from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { MARKETING_FAQS } from "@/lib/marketing-faqs";
import { PUBLIC_CONFIG } from "@/lib/public-config";
import heroKitchen from "@/assets/promo-hero-kitchen.jpg";
import shotToday from "@/assets/screenshot-today.jpg";
import shotTemperature from "@/assets/screenshot-temperature.jpg";
import shotInspection from "@/assets/screenshot-inspection.jpg";
import shotDiary from "@/assets/screenshot-diary.jpg";
import shotHome from "@/assets/screenshot-home.jpg";
import mobileToday from "@/assets/mobile-today.jpg";
import mobileTemperature from "@/assets/mobile-temperature.jpg";
import mobileDiary from "@/assets/mobile-diary.jpg";

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

const MOBILE_SCREENS = [
  {
    id: "m-today",
    label: "Today's shift",
    src: mobileToday,
    caption: "Next required action, progress and one-tap start.",
    alt: "Haccora mobile app showing today's shift screen with next required action",
  },
  {
    id: "m-temperature",
    label: "Temperatures",
    src: mobileTemperature,
    caption: "Log fridge, freezer and probe readings in seconds.",
    alt: "Haccora mobile app temperature logging screen",
  },
  {
    id: "m-diary",
    label: "Daily diary",
    src: mobileDiary,
    caption: "Timestamped records with photo evidence and sign-off.",
    alt: "Haccora mobile app daily diary screen",
  },
] as const;

function ScreenshotGallery() {
  const [active, setActive] = useState(0);
  const screen = SCREENS[active]!;

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
        {SCREENS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(index)}
            aria-pressed={index === active}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[0.68rem] font-black uppercase tracking-widest transition-colors sm:px-4 sm:text-xs ${
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
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.95)] sm:rounded-[1.5rem]">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
            <span className="h-2 w-2 rounded-full bg-white/20 sm:h-2.5 sm:w-2.5" />
            <span className="h-2 w-2 rounded-full bg-white/20 sm:h-2.5 sm:w-2.5" />
            <span className="h-2 w-2 rounded-full bg-white/20 sm:h-2.5 sm:w-2.5" />
            <span className="ml-2 truncate rounded-md bg-white/5 px-2.5 py-1 text-[0.6rem] font-bold tracking-wide text-white/45 sm:ml-3 sm:px-3 sm:text-[0.65rem]">
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


      <div className="mt-12 md:mt-14">
        <p className="eyebrow text-[color:var(--color-alert-red)]">On the floor</p>
        <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
          Built mobile-first for kitchen teams
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          The same workspace as an installable app — thumb-friendly navigation, quick capture and
          offline-safe records on any phone.
        </p>

        <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-8 sm:overflow-visible sm:px-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
          {MOBILE_SCREENS.map((item) => (
            <figure
              key={item.id}
              className="flex w-[62vw] max-w-[240px] shrink-0 snap-center flex-col items-center sm:w-full sm:max-w-none"
            >
              <div className="relative w-full max-w-[240px] rounded-[2.25rem] border border-white/15 bg-[#0d0d0d] p-2 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.95)]">
                <span className="absolute left-1/2 top-3.5 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/25" />
                <img
                  src={item.src}
                  width={780}
                  height={1688}
                  loading="lazy"
                  alt={item.alt}
                  className="w-full rounded-[1.75rem]"
                />
              </div>
              <figcaption className="mt-4 text-center">
                <span className="block text-xs font-black uppercase tracking-widest text-white sm:text-sm">
                  {item.label}
                </span>
                <span className="mt-1 block text-sm text-white/55">{item.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

    </div>
  );
}

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "platform", label: "Platform" },
  { id: "screens", label: "Screens" },
  { id: "operations", label: "Operations" },
  { id: "who-its-for", label: "Who it's for" },
  { id: "faqs", label: "FAQs" },
] as const;

function SectionNav() {
  const [active, setActive] = useState<string>("overview");

  useEffect(() => {
    const targets = SECTIONS.map(({ id }) => document.getElementById(id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Page sections" className="border-t border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <ul className="flex items-center gap-1.5 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map(({ id, label }) => {
            const isActive = active === id;
            return (
              <li key={id} className="shrink-0">
                <a
                  href={`#${id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.14em] transition-colors ${
                    isActive
                      ? "border-[color:var(--color-alert-red)] bg-[color:var(--color-alert-red)] text-white"
                      : "border-white/15 bg-white/5 text-white/65 hover:border-white/35 hover:text-white"
                  }`}
                >
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function PromoHome() {
  return (
    <div className="marketing-shell min-h-screen bg-white text-foreground">
      <header className="sticky top-0 z-40 bg-black/90 text-white backdrop-blur-md border-b border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-3">
          <BrandLogo imgClassName="h-9 md:h-12 w-auto" />
          <div className="flex items-center gap-3">
            <Link
              to="/unlock"
              className="btn-red !px-4 !py-2 !text-xs sm:!text-sm shadow-lg shadow-black/40"
            >
              Enter site <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <SectionNav />
      </header>

      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <section
          id="overview"
          className="relative isolate overflow-hidden bg-black text-white scroll-mt-32"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(70% 55% at 12% 0%, color-mix(in oklab, var(--color-alert-red) 42%, transparent) 0%, transparent 62%), radial-gradient(55% 45% at 92% 18%, color-mix(in oklab, var(--color-alert-orange) 28%, transparent) 0%, transparent 65%)",
            }}
          />
          <div className="relative mx-auto grid max-w-[1400px] items-center gap-8 px-4 py-12 sm:py-16 md:grid-cols-[1.15fr_0.85fr] md:gap-10 md:px-8 md:py-24">
            <div>
              <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[0.6rem] font-black uppercase tracking-[0.16em] text-white/80 backdrop-blur sm:text-[0.68rem] sm:tracking-[0.2em]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-alert-red)]" />
                Preview access · UK food safety software
              </p>
              <h1 className="hero-title mt-4 display-black uppercase tracking-tight sm:mt-5">
                Every food safety record, in one place
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75 sm:mt-5 sm:text-base md:text-lg">
                Haccora replaces paper diaries, temperature sheets and folders of printouts with one
                simple system your whole team can use — kitchen, office and inspector.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to="/unlock" className="btn-red w-full sm:w-auto">
                  Enter with promo password <ArrowRight size={16} />
                </Link>
                <a
                  href={`mailto:${PUBLIC_CONFIG.legal.email}`}
                  className="btn-red-outline w-full sm:w-auto"
                >
                  Request access
                </a>
              </div>
              <ul className="mt-7 grid gap-2 text-sm text-white/65 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
                {[
                  "Built for UK regulation",
                  "Works offline in the kitchen",
                  "Inspector-ready evidence",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2
                      size={16}
                      className="shrink-0 text-[color:var(--color-alert-red)]"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_50px_100px_-40px_rgba(0,0,0,0.9)] sm:rounded-[1.75rem]">
                <img
                  src={heroKitchen}
                  width={1600}
                  height={1200}
                  alt="Chef reviewing digital food safety checks on a tablet in a busy commercial kitchen"
                  className="h-[380px] w-full object-cover sm:h-[420px] md:h-[460px]"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, color-mix(in oklab, black 10%, transparent) 0%, color-mix(in oklab, black 78%, transparent) 100%)",
                  }}
                />
                <div className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4 md:inset-x-6 md:bottom-6">
                  <div className="rounded-2xl border border-white/15 bg-black/50 p-3.5 backdrop-blur-md sm:p-4">
                    <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-white/50 sm:text-[0.65rem]">
                      What you get
                    </p>
                    <div className="mt-3 grid gap-2.5">
                      {HERO_CARDS.map(([title, body, Icon]) => (
                        <div key={title} className="flex items-start gap-3">
                          <span className="icon-3d icon-3d-sm shrink-0">
                            <Icon size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[0.82rem] font-black leading-tight sm:text-sm">
                              {title}
                            </p>
                            <p className="truncate text-[0.7rem] text-white/60 sm:text-xs">{body}</p>
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
            <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-x-4 px-4 md:grid-cols-4 md:gap-px md:px-8">
              {[
                ["6", "compliance modules"],
                ["1 tap", "inspection evidence pack"],
                ["Offline", "capture in the kitchen"],
                ["Multi-site", "oversight and audit trail"],
              ].map(([stat, label]) => (
                <div key={label} className="py-6 md:py-10">
                  <p className="text-xl font-black text-white sm:text-2xl md:text-3xl">{stat}</p>
                  <p className="mt-1 text-xs leading-snug text-white/55 md:text-sm">{label}</p>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* Modules */}
        <section
          id="platform"
          className="mx-auto max-w-[1400px] scroll-mt-32 px-4 py-12 sm:py-16 md:px-8 md:py-24"
        >
          <p className="eyebrow">The platform</p>
          <h2 className="mt-3 display-black uppercase tracking-tight">
            Everything a UK food business has to prove
          </h2>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">

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

        {/* Screenshots */}
        <section id="screens" className="bg-black text-white scroll-mt-32">
          <div className="mx-auto max-w-[1400px] px-4 py-12 sm:py-16 md:px-8 md:py-24">
            <p className="eyebrow text-[color:var(--color-alert-red)]">Inside Haccora</p>
            <h2 className="mt-3 display-black uppercase tracking-tight">
              Real screens from the live product
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-white/65 sm:text-base">
              These are captured straight from the Haccora workspace — no mockups. Pick a screen to
              see how the day-to-day evidence is recorded and produced for inspection.
            </p>
            <div className="mt-8 sm:mt-10">

              <ScreenshotGallery />
            </div>
          </div>
        </section>

        {/* Platform strip */}
        <section id="operations" className="bg-black text-white scroll-mt-32">
          <div className="mx-auto grid max-w-[1400px] gap-4 px-4 py-12 sm:gap-5 sm:py-16 md:grid-cols-3 md:px-8 md:py-20">
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
        <section
          id="who-its-for"
          className="mx-auto max-w-[1400px] scroll-mt-32 px-4 py-12 sm:py-16 md:px-8 md:py-24"
        >
          <p className="eyebrow">Who it&apos;s for</p>
          <h2 className="mt-3 display-black uppercase tracking-tight">
            Built for UK food businesses
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
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
          <div className="relative mt-10 flex flex-col gap-5 overflow-hidden rounded-2xl bg-black p-6 text-white shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] sm:rounded-[1.75rem] sm:p-8 md:mt-12 md:flex-row md:items-center md:justify-between md:gap-6 md:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 120% at 90% 20%, color-mix(in oklab, var(--color-alert-red) 40%, transparent) 0%, transparent 60%)",
              }}
            />
            <div className="relative">
              <h3 className="text-xl font-black sm:text-2xl md:text-3xl">
                This is a private preview
              </h3>
              <p className="mt-2 max-w-xl text-sm text-white/70 sm:text-base">
                The full website, pricing, help centre and product workspace are behind a password
                while we finish our launch. Enter the promo password to continue.
              </p>
            </div>
            <Link to="/unlock" className="btn-red relative w-full shrink-0 md:w-auto">
              Enter site <ArrowRight size={16} />
            </Link>
          </div>

        </section>

        {/* FAQs */}
        <section
          id="faqs"
          className="border-t border-border bg-secondary/40 scroll-mt-32"
          aria-labelledby="promo-faq-heading"
        >
          <div className="mx-auto max-w-[900px] px-4 py-12 sm:py-16 md:px-8 md:py-24">
            <p className="eyebrow">FAQs</p>
            <h2 id="promo-faq-heading" className="mt-3 display-black uppercase tracking-tight">
              Questions, answered
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Clear answers about UK compliance, inspections, devices, security and subscriptions.
            </p>

            <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_60px_-45px_rgba(0,0,0,0.5)] sm:mt-10">
              {MARKETING_FAQS.map(({ question, answer }) => (
                <details key={question} className="group px-4 py-4 sm:px-6 sm:py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-alert-red)]">
                    <span className="text-[0.95rem] font-black leading-snug sm:text-base">
                      {question}
                    </span>
                    <span
                      aria-hidden
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-colors group-open:bg-[color:var(--color-alert-red)] group-open:text-white"
                    >
                      <Plus size={15} className="group-open:hidden" />
                      <Minus size={15} className="hidden group-open:block" />
                    </span>
                  </summary>
                  <p className="mt-3 pr-10 text-sm leading-relaxed text-muted-foreground">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
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
