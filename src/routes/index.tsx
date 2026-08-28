import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  ClipboardCheck,
  FileText,
  HelpCircle,
  LayoutGrid,
  Layers,
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
import { useI18n } from "@/lib/i18n";
import { PUBLIC_CONFIG, TRADING_STATEMENT } from "@/lib/public-config";
import { openCookieSettings } from "@/lib/cookie-consent";
import { ProductTourDialog } from "@/components/marketing/ProductTourDialog";
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
      { title: "Haccora — Safe. Clean. Compliant." },
      {
        name: "description",
        content:
          "Haccora is one platform for HACCP, temperature logs, cleaning, allergens, training and EHO inspection evidence — web, mobile app and platform console for UK food businesses.",
      },
      { property: "og:title", content: "Haccora — Safe. Clean. Compliant." },
      {
        property: "og:description",
        content:
          "HACCP, daily diary, temperature monitoring, allergens and PPDS, staff compliance and one-tap inspection packs — built for UK kitchens.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://haccora.co.uk/" },
      { property: "og:image", content: "https://haccora.co.uk/images/promo-hero.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://haccora.co.uk/images/promo-hero.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: MARKETING_FAQS.map(({ question, answer }) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
          })),
        }),
      },
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
    caption: "The public Haccora website, pricing, help centre and product tour.",
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
            className="aspect-[4/3] w-full animate-in object-cover object-top fade-in duration-300 sm:aspect-[1440/759]"
          />
        </div>
        <figcaption className="mt-4 min-h-[2.5rem] text-sm leading-relaxed text-white/60">
          {screen.caption}
        </figcaption>
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

        <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scroll-padding-inline:1rem] [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-8 sm:overflow-visible sm:px-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
          {MOBILE_SCREENS.map((item) => (
            <figure
              key={item.id}
              className="flex w-[64vw] max-w-[230px] shrink-0 snap-start flex-col items-center sm:w-full sm:max-w-none"
            >
              <div className="relative mx-auto w-full max-w-[230px] rounded-[2.25rem] border border-white/15 bg-[#0d0d0d] p-2 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.95)]">
                <span className="absolute left-1/2 top-3.5 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/25" />
                <img
                  src={item.src}
                  width={780}
                  height={1688}
                  loading="lazy"
                  alt={item.alt}
                  className="aspect-[780/1688] w-full rounded-[1.75rem] object-cover object-top"
                />
              </div>
              <figcaption className="mt-4 flex flex-1 flex-col text-center">
                <span className="block text-xs font-black uppercase tracking-widest text-white sm:text-sm">
                  {item.label}
                </span>
                <span className="mt-1 block text-[0.8rem] leading-relaxed text-white/55 sm:text-sm">
                  {item.caption}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-3 text-center text-[0.65rem] font-bold uppercase tracking-widest text-white/35 sm:hidden">
          Swipe for more screens
        </p>
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
  { id: "pricing", label: "Pricing" },
  { id: "faqs", label: "FAQs" },
] as const;

const PROMO_PLANS = [
  {
    name: "Food Cart",
    price: "£9.99",
    per: "per site / month",
    blurb: "One small site getting daily records off paper.",
    features: [
      "Daily routines and temperature logs",
      "Document and training expiry alerts",
      "Inspection-ready evidence export",
    ],
    featured: false,
  },
  {
    name: "Complete",
    price: "£24.99",
    per: "per site / month",
    blurb: "Everything a busy kitchen needs, unlimited staff.",
    features: [
      "All Food Cart features",
      "Unlimited staff and all modules",
      "Allergens, PPDS and QR equipment history",
    ],
    featured: true,
  },
  {
    name: "Group",
    price: "£59.99",
    per: "per month",
    blurb: "Up to three locations with group oversight.",
    features: ["Up to three locations", "Group dashboards and alerts", "Scoped inspector access"],
    featured: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    per: "four or more sites",
    blurb: "Groups, contract caterers and consultants.",
    features: [
      "Unlimited locations",
      "SLA and implementation support",
      "Integrations and governance",
    ],
    featured: false,
  },
] as const;

const PROMO_ADVANTAGES = [
  {
    title: "Priced for independents",
    body: "From £9.99 per site a month, with an approval-only two-month trial available for suitable UK food businesses.",
  },
  {
    title: "Evidence that stands up",
    body: "Append-only history links the record to the user, premises, asset and device time, so corrective actions can't be quietly rewritten.",
  },
  {
    title: "Four-nation UK context",
    body: "England, Wales, Scotland and Northern Ireland profiles, SFBB-style safe methods, PPDS and allergen controls built in.",
  },
  {
    title: "Inspector Mode, scoped",
    body: "Time-limited, read-only access for an EHO or head office — not an anonymous public link to your whole account.",
  },
  {
    title: "Works offline, on any phone",
    body: "PWA plus native iOS and Android with an offline write queue, so a weak signal in the walk-in never loses a log.",
  },
  {
    title: "QR scan-to-work equipment",
    body: "Label a fridge or probe once and staff scan straight into the right check, with full service and calibration history.",
  },
] as const;

function useActiveSection() {
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

  return active;
}

function SectionNav() {
  const active = useActiveSection();

  return (
    <nav
      aria-label="Page sections"
      className="hidden border-t border-white/10 bg-black/80 backdrop-blur-md md:block"
    >
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

const MOBILE_TABS = [
  { id: "overview", label: "Home", icon: LayoutGrid },
  { id: "platform", label: "Platform", icon: Layers },
  { id: "screens", label: "Screens", icon: Smartphone },
  { id: "faqs", label: "FAQs", icon: HelpCircle },
] as const;

function MobileTabBar() {
  const active = useActiveSection();

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/85 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.35rem)" }}
    >
      <ul className="mx-auto flex max-w-[520px] items-end justify-between px-2 pt-1.5">
        {MOBILE_TABS.slice(0, 2).map(({ id, label, icon: Icon }) => (
          <MobileTab key={id} id={id} label={label} Icon={Icon} active={active === id} />
        ))}
        <li className="flex-1">
          <Link
            to="/login"
            aria-label="Sign in"
            className="mx-auto -mt-6 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-[color:var(--color-alert-red)] text-white shadow-[0_12px_28px_-8px_rgba(0,0,0,0.9)] ring-4 ring-black/85 active:scale-95 transition-transform"
          >
            <Lock size={18} />
            <span className="mt-0.5 text-[0.5rem] font-black uppercase tracking-[0.12em]">
              Sign in
            </span>
          </Link>
        </li>
        {MOBILE_TABS.slice(2).map(({ id, label, icon: Icon }) => (
          <MobileTab key={id} id={id} label={label} Icon={Icon} active={active === id} />
        ))}
      </ul>
    </nav>
  );
}

function MobileTab({
  id,
  label,
  Icon,
  active,
}: {
  id: string;
  label: string;
  Icon: typeof LayoutGrid;
  active: boolean;
}) {
  return (
    <li className="flex-1">
      <a
        href={`#${id}`}
        aria-current={active ? "true" : undefined}
        className={`flex min-h-[3rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition-colors active:bg-white/10 ${
          active ? "text-white" : "text-white/55"
        }`}
      >
        <span
          className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${
            active ? "bg-[color:var(--color-alert-red)]/20" : ""
          }`}
        >
          <Icon size={18} strokeWidth={active ? 2.6 : 2} />
        </span>
        <span className="text-[0.55rem] font-black uppercase tracking-[0.12em]">{label}</span>
      </a>
    </li>
  );
}

function PromoHome() {
  const { t } = useI18n();

  return (
    <div className="marketing-shell min-h-screen bg-white text-foreground pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-40 bg-black/90 text-white backdrop-blur-md border-b border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-3">
          <BrandLogo
            className="shrink-0"
            light
            imgClassName="h-11 md:h-16 w-auto max-w-[240px] md:max-w-[320px]"
          />
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white/75 sm:inline-flex">
              UK
            </span>
            <Link
              to="/home"
              className="hidden text-xs font-black uppercase tracking-widest text-white/70 hover:text-white sm:inline-flex"
            >
              Product tour
            </Link>
            <Link
              to="/login"
              className="btn-red !px-4 !py-2 !text-xs sm:!text-sm shadow-lg shadow-black/40"
            >
              Sign in <ArrowRight size={14} />
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
              <h1 className="hero-title display-black uppercase tracking-tight">
                Every food safety record, in one place
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75 sm:mt-5 sm:text-base md:text-lg">
                Haccora replaces paper diaries, temperature sheets and folders of printouts with one
                simple system your whole team can use — kitchen, office and inspector.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to="/contact" className="btn-red w-full sm:w-auto">
                  Request two-month trial <ArrowRight size={16} />
                </Link>
                <ProductTourDialog />
              </div>
              <ul className="mt-7 grid gap-2 text-sm text-white/65 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
                {[
                  "Structured for UK food businesses",
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
                            <p className="truncate text-[0.7rem] text-white/60 sm:text-xs">
                              {body}
                            </p>
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
          <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl display-black uppercase tracking-tight">
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
            Structured for food businesses in the United Kingdom
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
              <h3 className="text-xl font-black sm:text-2xl md:text-3xl">Explore Haccora</h3>
              <p className="mt-2 max-w-xl text-sm text-white/70 sm:text-base">
                See the complete product journey, detailed workflows, UK food-safety context and
                platform experience on the full product-tour page.
              </p>
            </div>
            <Link to="/home" className="btn-red relative w-full shrink-0 md:w-auto">
              View product tour <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="border-t border-border bg-white scroll-mt-32"
          aria-labelledby="promo-pricing-heading"
        >
          <div className="mx-auto max-w-[1400px] px-4 py-12 sm:py-16 md:px-8 md:py-24">
            <p className="eyebrow">Pricing</p>
            <h2 id="promo-pricing-heading" className="mt-3 display-black uppercase tracking-tight">
              Simple per-site pricing
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Tenant owners are approved by Haccora for either a two-month trial or a paid plan.
              Prices exclude VAT where applicable and are billed in GBP.
            </p>

            <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden">
              {PROMO_PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex w-[78vw] max-w-[320px] shrink-0 snap-start flex-col p-7 sm:w-full sm:max-w-none ${
                    plan.featured
                      ? "card-polished-dark text-white ring-4 ring-[color:var(--color-alert-red)]/60"
                      : "card-polished text-black"
                  }`}
                >
                  <div className="mb-3 flex min-h-[1.75rem] items-start">
                    {plan.featured && (
                      <span className="inline-flex items-center rounded-full bg-[color:var(--color-alert-red)] px-3 py-1 text-[10px] font-black uppercase leading-tight tracking-[0.14em] text-white shadow-lg">
                        Most popular
                      </span>
                    )}
                  </div>
                  <h3 className="display-black text-2xl">{plan.name}</h3>
                  <p
                    className={`mt-2 min-h-[2.5rem] text-sm leading-snug ${plan.featured ? "text-white/70" : "text-black/60"}`}
                  >
                    {plan.blurb}
                  </p>
                  <div className="mt-5 flex flex-wrap items-baseline gap-x-2">
                    <span className="display-black text-4xl">{plan.price}</span>
                    <span
                      className={`text-xs ${plan.featured ? "text-white/70" : "text-black/60"}`}
                    >
                      {plan.per}
                    </span>
                  </div>
                  <ul className="mt-5 space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className={plan.featured ? "text-white/80" : "text-black/65"}
                      >
                        ✓ {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-6">
                    <Link
                      to="/contact"
                      className={`inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-black uppercase tracking-wider transition ${
                        plan.featured
                          ? "bg-[color:var(--color-alert-green)] text-white hover:brightness-110"
                          : "bg-black text-white hover:bg-[color:var(--color-alert-red)]"
                      }`}
                    >
                      {plan.name === "Enterprise" ? "Talk to us" : "Request trial"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[0.65rem] font-bold uppercase tracking-widest text-black/35 sm:hidden">
              Swipe for more plans
            </p>

            <div className="mt-14">
              <p className="eyebrow">How we compare</p>
              <h3 className="mt-3 display-black text-2xl uppercase tracking-tight sm:text-3xl">
                Where Haccora wins
              </h3>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                UK food-safety apps mostly cover the same daily logs. These are the differences we
                compete on — not hygiene-rating promises, which no software can make.
              </p>
              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {PROMO_ADVANTAGES.map((item) => (
                  <div key={item.title} className="card-polished flex flex-col p-6">
                    <h3 className="text-base font-black text-black">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-black/65">{item.body}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                Haccora helps you build and evidence a HACCP-based food-safety management system.
                Although it cannot guarantee a Food Hygiene Rating, it goes a long way towards it
                and towards compliance with statutory food-safety requirements.
              </p>
            </div>
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
            <Link to="/help" className="btn-red mt-9">
              Search the Haccora Help Centre <ArrowRight size={15} />
            </Link>

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
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10 flex flex-col gap-5 text-xs">
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 font-black uppercase tracking-widest"
          >
            <Link to="/legal/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link to="/legal/cookies" className="hover:text-white">
              Cookies
            </Link>
            <Link to="/legal/terms" className="hover:text-white">
              Terms
            </Link>
            <Link to="/legal/data-processing" className="hover:text-white">
              Data processing
            </Link>
            <Link to="/legal/accessibility" className="hover:text-white">
              Accessibility
            </Link>
            <Link to="/legal/complaints" className="hover:text-white">
              Complaints
            </Link>
            <Link to="/legal/company-details" className="hover:text-white">
              Company details
            </Link>
            <button
              type="button"
              onClick={openCookieSettings}
              className="uppercase tracking-widest hover:text-white"
            >
              Cookie settings
            </button>
          </nav>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p>
              © {new Date().getFullYear()} {PUBLIC_CONFIG.legal.companyName}. {TRADING_STATEMENT}{" "}
              Food safety software for UK food businesses.
            </p>
            <a href={`mailto:${PUBLIC_CONFIG.legal.email}`} className="hover:text-white">
              {PUBLIC_CONFIG.legal.email}
            </a>
          </div>
        </div>
      </footer>

      <MobileTabBar />
    </div>
  );
}
