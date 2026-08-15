import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/haccora-client";
import { isSupabaseConfigured } from "@/integrations/supabase/config";
import {
  Search,
  Phone,
  ArrowRight,
  ChevronRight,
  FileText,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ClipboardCheck,
  Thermometer,
  Wheat,
  Users,
  Scale,
  CheckCircle2,
  Building2,
  TrendingUp,
  Zap,
  Recycle,
  CalendarCheck,
  Utensils,
  Hotel,
  Coffee,
  Beer,
  Truck as TruckIcon,
  ChefHat,
  Plus,
  Minus,
  Smartphone,
  Bell,
  Server,
  Plug,
  Play,
} from "lucide-react";

import heroChef from "@/assets/hero-chef.jpg";
import { FollowBar } from "@/components/SocialIcons";
import { BrandLogo } from "@/components/BrandLogo";
import { PUBLIC_CONFIG } from "@/lib/public-config";
import { MARKETING_FAQS } from "@/lib/marketing-faqs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Haccora — Food safety software for UK businesses" },
      {
        name: "description",
        content:
          "Simplify HACCP, temperature, cleaning, allergens, staff compliance and inspection prep — one simple platform built for UK food businesses.",
      },
      { property: "og:title", content: "Haccora — Food safety software for the UK" },
      {
        property: "og:description",
        content:
          "HACCP, SFBB-style workflows, allergen controls and structured inspection evidence in one platform.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://haccora.co.uk/" },
      { property: "og:image", content: "https://haccora.co.uk/og-haccora.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Haccora — food safety software for UK businesses",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://haccora.co.uk/og-haccora.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/" }],
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
              applicationSubCategory: "Food safety compliance software",
              operatingSystem: "Web, iOS, Android",
              url: "https://haccora.co.uk/",
              description:
                "Digital HACCP, temperature monitoring, cleaning schedules, allergen and PPDS controls and EHO inspection evidence for UK food businesses.",
              areaServed: "GB",
              inLanguage: "en-GB",
              offers: [
                { "@type": "Offer", name: "Solo", price: "9.99", priceCurrency: "GBP" },
                { "@type": "Offer", name: "Complete", price: "24.99", priceCurrency: "GBP" },
                { "@type": "Offer", name: "Group", price: "59.99", priceCurrency: "GBP" },
              ],
              featureList: [
                "Digital HACCP plan",
                "Fridge, freezer and probe temperature logs",
                "SFBB-style daily diary",
                "Allergen matrix and PPDS labelling",
                "Staff training and fitness to work",
                "One-tap EHO inspection pack",
              ],
              publisher: {
                "@type": "Organization",
                name: PUBLIC_CONFIG.legal.companyName,
                url: "https://haccora.co.uk/",
              },
            },
            {
              "@type": "Organization",
              name: PUBLIC_CONFIG.legal.companyName,
              url: "https://haccora.co.uk/",
              email: PUBLIC_CONFIG.legal.email,
              areaServed: "GB",
            },
            {
              "@type": "FAQPage",
              mainEntity: MARKETING_FAQS.map(({ question, answer }) => ({
                "@type": "Question",
                name: question,
                acceptedAnswer: { "@type": "Answer", text: answer },
              })),
            },
          ],
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="marketing-shell min-h-screen bg-white text-foreground pb-20 md:pb-0">
      <TopBar />
      <SubNav />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <ChefsMarquee />
        <OutcomesBand />
        <Support360 />
        <ModulePillars />
        <IndustriesStrip />
        <PlatformPillars />

        <ProductPreview />
        <InspectorBand />
        <Regulation />
        <Pricing />
        <ResourcesBand />
        <FaqSection />
        <CtaFooter />
      </main>
      <SiteFooter />
      <StickyMobileCTA />
    </div>
  );
}

/* ────────────────────────────────────────────── marquee: built for UK food businesses */
function ChefsMarquee() {
  const { t } = useI18n();
  const phrase = t("marquee.phrase") ?? "Built for UK kitchens · Safe. Simple. Evidenced.";
  const line = Array.from({ length: 8 }, (_, i) => (
    <span key={i} className="inline-flex items-center gap-4 md:gap-6">
      <span className="display-black uppercase tracking-tight text-[clamp(1rem,2.2vw,1.75rem)]">
        {phrase}
      </span>
      <span className="h-2 w-2 md:h-3 md:w-3 rounded-full bg-[color:var(--color-alert-red)] shrink-0" />
    </span>
  ));
  return (
    <section
      aria-hidden="true"
      className="bg-black text-white overflow-hidden border-y border-white/10"
    >
      <div className="marquee-track py-3 md:py-4">
        {line}
        {line}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── sticky mobile CTA */
function StickyMobileCTA() {
  const { t } = useI18n();
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-black/95 backdrop-blur border-t border-white/10 pb-safe">
      <div className="px-4 py-3 flex items-center gap-2">
        {PUBLIC_CONFIG.legal.phone && (
          <a
            href={`tel:${PUBLIC_CONFIG.legal.phone.replace(/\s/g, "")}`}
            className="btn-red-outline flex-1 !py-2.5 !text-xs"
          >
            <Phone size={14} /> {PUBLIC_CONFIG.legal.phone}
          </a>
        )}
        <a href="#contact" className="btn-red flex-[1.4] !py-2.5 !text-xs">
          {t("nav.contact") ?? "Contact us"} <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────── top bar (black) */
function TopBar() {
  const { t } = useI18n();
  return (
    <div className="bg-black text-white">
      <div className="mx-auto max-w-[1400px] px-3 md:px-8 h-14 md:h-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:gap-4">
        <BrandLogo imgClassName="h-8 md:h-14 w-auto" />

        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          <Link
            to="/help"
            aria-label="Search the Haccora Help Centre"
            className="hidden md:flex items-center h-10 rounded-full bg-white/8 border border-white/12 px-4 min-w-[220px] text-sm text-white/60 hover:bg-white/12 hover:text-white transition"
          >
            <Search size={14} />
            <span className="ml-2">{t("nav.search") ?? "Search help centre"}</span>
          </Link>
          <Link
            to="/login"
            className="btn-red-outline !px-3 !py-2 !text-xs sm:!px-5 sm:!py-3 sm:!text-sm"
          >
            {t("nav.login") ?? "Login"}
          </Link>
          <a href="#contact" className="btn-red !px-3 !py-2 !text-xs md:!px-5 md:!py-3 md:!text-sm">
            {t("nav.contact") ?? "Contact Us"}
          </a>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────── sub nav (white) */
function SubNav() {
  const { t } = useI18n();
  const links = [
    { href: "#pillars", label: t("nav.modules") ?? "Food Safety Software" },
    { href: "#regulation", label: t("nav.regulation") ?? "Regulation" },
    { href: "#inspector", label: "Inspector Mode" },
    { href: "#pricing", label: t("nav.pricing") ?? "Pricing" },
  ];
  return (
    <div className="border-b border-black/10 bg-white">
      <div className="mx-auto max-w-[1400px] px-3 md:px-8 h-12 md:h-14 flex items-center justify-between gap-4">
        <nav
          className="flex-1 flex items-center gap-4 md:gap-10 text-[0.78rem] md:text-[0.95rem] font-bold text-black whitespace-nowrap overflow-x-auto no-scrollbar -mx-1 px-1"
          style={{ scrollbarWidth: "none" }}
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hover:text-[color:var(--color-alert-red)] transition shrink-0"
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/blog"
            className="hover:text-[color:var(--color-alert-red)] transition shrink-0"
          >
            {t("nav.blog") ?? "Blog"}
          </Link>
        </nav>
        {PUBLIC_CONFIG.legal.phone && (
          <a
            href={`tel:${PUBLIC_CONFIG.legal.phone.replace(/\s/g, "")}`}
            className="hidden md:inline-flex items-center gap-2 text-black font-black text-lg shrink-0"
          >
            <Phone size={16} className="text-[color:var(--color-alert-red)]" />{" "}
            {PUBLIC_CONFIG.legal.phone}
          </a>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────── hero (red→orange) */
function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden bg-black">
      {/* photo layer */}
      <div className="absolute inset-0">
        <img
          src={heroChef}
          alt=""
          width={1600}
          height={1200}
          className="w-full h-full object-cover object-[center_30%]"
        />
        {/* red-orange overlay bleeding from bottom-left */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 30%, rgba(255,90,40,0.55) 60%, rgba(255,60,25,0.92) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,60,25,0) 0%, rgba(255,60,25,0.85) 60%, rgba(255,50,15,1) 100%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 md:px-8 pt-10 md:pt-20 pb-14 md:pb-24">
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-8 md:gap-16 items-start">
          <div className="text-white">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/35 bg-black/35 px-3.5 py-1.5 text-[10px] leading-[1.35] md:text-[11px] font-black tracking-[0.16em] text-white uppercase backdrop-blur-sm">
              {t("brand.tagline")}
            </div>

            <h1 lang="en-GB" className="hero-title mt-4 display-black">
              {t("hero.title")}
            </h1>
            <p className="mt-5 md:mt-7 max-w-xl text-sm md:text-lg text-white/90 leading-relaxed [text-wrap:pretty]">
              {t("hero.subtitle")}
            </p>

            <div className="mt-6 md:mt-8 flex flex-wrap items-center gap-3 md:gap-4">
              <ProductTourDialog />
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 md:px-4 md:py-3 text-black text-[11px] md:text-xs font-bold">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black text-white text-[10px]">
                  <ShieldCheck size={13} />
                </span>
                <span>{t("hero.review.readOur")}</span>
                <span className="mx-1.5 md:mx-2 h-4 w-px bg-black/15" />
                <span className="text-[color:var(--color-alert-red)]">
                  {t("hero.review.stars")}
                </span>
              </div>
            </div>
          </div>

          <ContactCard />
        </div>
      </div>
    </section>
  );
}

function ProductTourDialog() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={!mounted}
          className="group inline-flex items-center gap-3 rounded-2xl bg-black/75 px-3 py-2.5 text-left text-sm text-white shadow-lg backdrop-blur-sm transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:px-4 md:py-3"
          aria-label={`${t("hero.video.title")}. ${t("hero.play")}.`}
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 transition group-hover:scale-105 md:h-9 md:w-9">
            <Play size={15} fill="currentColor" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-xs font-bold md:text-sm">{t("hero.video.title")}</span>
            <span className="mt-0.5 block text-[10px] font-bold tracking-widest text-[#4ade80] md:text-xs">
              {t("hero.play")}
            </span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[94dvh] w-[calc(100%-1.5rem)] max-w-4xl overflow-y-auto border-white/10 bg-[#0d0d0d] p-3 text-white shadow-2xl sm:p-5">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-lg font-black sm:text-xl">
            {t("hero.video.modalTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-white/65 sm:text-sm">
            {t("hero.video.description")}
          </DialogDescription>
        </DialogHeader>
        <video
          controls
          playsInline
          preload="metadata"
          poster="/media/haccora-product-tour-poster.svg"
          className="aspect-video w-full rounded-xl border border-white/10 bg-black"
          aria-label={t("hero.video.modalTitle")}
        >
          <source src="/media/haccora-product-tour.mp4" type="video/mp4" />
          <track
            default
            kind="captions"
            src="/media/haccora-product-tour.en.vtt"
            srcLang="en-GB"
            label="English"
          />
          {t("hero.video.unsupported")}
        </video>
        <details className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white/75 sm:text-sm">
          <summary className="cursor-pointer font-bold text-white">
            {t("hero.video.transcriptTitle")}
          </summary>
          <p className="mt-2 leading-relaxed">{t("hero.video.transcript")}</p>
        </details>
      </DialogContent>
    </Dialog>
  );
}

function ContactCard() {
  const { t, lang } = useI18n();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setState("sending");
    setError("");
    if (!isSupabaseConfigured()) {
      setState("error");
      setError(`The form is temporarily unavailable. Email ${PUBLIC_CONFIG.legal.email}.`);
      return;
    }
    const form = new FormData(formElement);
    try {
      const { error: invokeError } = await supabase.functions.invoke("contact", {
        body: {
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          phone: form.get("phone"),
          businessName: form.get("businessName"),
          website: form.get("website"),
          locale: lang,
          consent: form.get("consent") === "on",
        },
      });
      if (invokeError) throw invokeError;
    } catch {
      setState("error");
      setError(`Your request could not be sent. Email ${PUBLIC_CONFIG.legal.email}.`);
      return;
    }
    formElement.reset();
    setState("sent");
  };
  return (
    <form
      id="contact"
      onSubmit={submit}
      className="rounded-2xl md:rounded-3xl bg-white p-5 md:p-8 shadow-2xl border border-black/5"
    >
      <h3 className="display-black text-xl md:text-3xl text-black text-center">
        {t("contact.title") ?? "Get More Information"}
      </h3>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          name="firstName"
          aria-label={t("contact.first") ?? "First Name"}
          required
          autoComplete="given-name"
          maxLength={80}
          placeholder={t("contact.first") ?? "First Name"}
          className="fld"
        />
        <input
          name="lastName"
          aria-label={t("contact.last") ?? "Last Name"}
          required
          autoComplete="family-name"
          maxLength={80}
          placeholder={t("contact.last") ?? "Last Name"}
          className="fld"
        />
      </div>
      <div className="mt-3 grid gap-3">
        <input
          name="email"
          aria-label={t("contact.email") ?? "Email Address"}
          required
          type="email"
          autoComplete="email"
          maxLength={254}
          placeholder={t("contact.email") ?? "Email Address"}
          className="fld"
        />
        <input
          name="phone"
          aria-label={t("contact.phone") ?? "Phone Number"}
          type="tel"
          autoComplete="tel"
          maxLength={40}
          placeholder={t("contact.phone") ?? "Phone Number"}
          className="fld"
        />
        <input
          name="businessName"
          aria-label={t("contact.business") ?? "Business Name"}
          autoComplete="organization"
          maxLength={160}
          placeholder={t("contact.business") ?? "Business Name"}
          className="fld"
        />
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
      </div>
      <label className="mt-4 flex items-start gap-2 text-[11px] text-black/60">
        <input name="consent" type="checkbox" required className="mt-0.5" />
        <span>
          By submitting this form, you agree to our{" "}
          <Link
            to="/legal/privacy"
            className="font-semibold underline underline-offset-2 hover:text-black"
          >
            privacy policy
          </Link>
          .
        </span>
      </label>
      <button
        disabled={state === "sending"}
        type="submit"
        className="btn-red w-full mt-5 justify-center uppercase tracking-widest text-xs md:text-sm disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : (t("contact.cta") ?? "Get In Touch")}
      </button>
      {state === "sent" && (
        <p role="status" className="mt-3 text-sm text-success text-center">
          {"Thank you. We will be in touch shortly."}
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="mt-3 text-sm text-destructive text-center">
          {error}
        </p>
      )}
    </form>
  );
}

/* ────────────────────────────────────────────── 360° support (white cards on gradient) */
function Support360() {
  const { t } = useI18n();
  const items = [
    {
      icon: FileText,
      k: "docs",
      title: t("s360.docs.t") ?? "Digital records",
      body: t("s360.docs.b") ?? "HACCP, checklists and evidence — all in one place.",
    },
    {
      icon: Clock,
      k: "realtime",
      title: t("s360.time.t") ?? "Sensor and temperature notices",
      body: t("s360.time.b") ?? "Capture configured deviations and notify responsible users.",
    },
    {
      icon: AlertTriangle,
      k: "alerts",
      title: t("s360.alert.t") ?? "Incident response",
      body: t("s360.alert.b") ?? "Record incidents and corrections with a clear history.",
    },
  ];
  return (
    <section className="relative alert-gradient text-white">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 pt-16 pb-24 md:pt-20 md:pb-32">
        <h2 className="display-black text-3xl md:text-6xl text-center text-black">
          360°{" "}
          <span className="text-white">{t("s360.title") ?? "food-safety workflow support"}</span>
        </h2>
        <div className="mt-12 md:mt-16 grid md:grid-cols-3 gap-6">
          {items.map(({ icon: Icon, k, title, body }) => (
            <div key={k} className="card-polished p-8 md:p-10 text-black">
              <span className="icon-3d">
                <Icon size={30} strokeWidth={2.4} />
              </span>
              <h3 className="display-black text-2xl md:text-3xl mt-6">{title}</h3>
              <p className="mt-3 text-black/70 text-sm leading-relaxed">{body}</p>
              <a
                href="#pillars"
                className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-[color:var(--color-alert-red)]"
              >
                {t("s360.more") ?? "Learn more"} <ArrowRight size={14} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── module pillars */
function ModulePillars() {
  const { t } = useI18n();
  const items = [
    { icon: ShieldCheck, k: "haccp" },
    { icon: ClipboardCheck, k: "ops" },
    { icon: Thermometer, k: "temp" },
    { icon: Wheat, k: "recipes" },
    { icon: Users, k: "team" },
    { icon: Scale, k: "regulation" },
  ] as const;

  return (
    <section id="pillars" className="bg-white">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-32">
        <div className="max-w-3xl">
          <div className="eyebrow">{t("pillars.eyebrow") ?? "The Platform"}</div>
          <h2 className="mt-4 display-black text-3xl md:text-6xl">{t("pillars.title")}</h2>
          <p className="mt-5 text-black/60 max-w-2xl">{t("pillars.subtitle")}</p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(({ icon: Icon, k }) => (
            <div key={k} className="group card-polished p-8">
              <div className="flex items-start justify-between">
                <span className="icon-3d">
                  <Icon size={28} strokeWidth={2.4} />
                </span>
                <ChevronRight
                  size={18}
                  className="text-black/25 group-hover:text-[color:var(--color-alert-red)] group-hover:translate-x-1 transition"
                />
              </div>
              <h3 className="mt-7 display-black text-xl md:text-2xl">
                {t(`pillar.${k}.title`) ?? k}
              </h3>
              <p className="mt-3 text-sm text-black/60 leading-relaxed">
                {t(`pillar.${k}.body`) ?? ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── inspector band (black) */
function InspectorBand() {
  const { t } = useI18n();
  const items = ["plan", "temp", "clean", "allergen", "training", "traceability"] as const;
  return (
    <section id="inspector" className="bg-black text-white">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-start">
          <div>
            <div className="text-[color:var(--color-alert-red-on-dark)] uppercase tracking-widest text-xs font-black">
              {t("inspector.eyebrow") ?? "Inspector Mode"}
            </div>
            <h2 className="mt-4 display-black text-3xl md:text-6xl">{t("inspector.title")}</h2>
            <p className="mt-5 text-white/70 max-w-xl">{t("inspector.body")}</p>
            <ul className="mt-8 grid sm:grid-cols-2 gap-3">
              {items.map((k) => (
                <li key={k} className="flex items-start gap-2 text-sm">
                  <CheckCircle2
                    size={18}
                    className="text-[color:var(--color-alert-green)] shrink-0 mt-0.5"
                  />
                  <span>{t(`inspector.item.${k}`)}</span>
                </li>
              ))}
            </ul>
            <Link to="/help" className="btn-red mt-9">
              {t("inspector.cta")} <ArrowRight size={16} />
            </Link>
          </div>

          <div className="rounded-3xl bg-white text-black p-6 md:p-8 border-4 border-[color:var(--color-alert-red)]/80">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-alert-red)]">
                {t("inspector.demo.header")}
              </div>
              <span className="text-xs font-bold text-black/60">UK</span>
            </div>
            <h3 className="mt-3 display-black text-2xl md:text-3xl">{t("inspector.demo.title")}</h3>
            <p className="mt-1 text-sm text-black/60">{t("inspector.demo.sub")}</p>

            <div className="mt-6 divide-y divide-black/10">
              {(["plan", "temp", "clean", "allerg", "ifsg", "trace"] as const).map((k) => (
                <div key={k} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{t(`inspector.demo.${k}.t`)}</div>
                    <div className="text-xs text-black/55 truncate">
                      {t(`inspector.demo.${k}.b`)}
                    </div>
                  </div>
                  <CheckCircle2
                    size={18}
                    className="text-[color:var(--color-alert-green)] shrink-0"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── regulation */
function Regulation() {
  const { t } = useI18n();
  const cards = (
    ["england", "wales", "scotland", "northernIreland", "haccp", "allergens"] as const
  ).map((k) => ({ k, title: t(`reg.card.${k}.t`), body: t(`reg.card.${k}.b`) }));

  return (
    <section id="regulation" className="bg-[color:var(--color-cream)]">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-32 grid md:grid-cols-3 gap-10 md:gap-16">
        <div className="md:col-span-1">
          <div className="eyebrow">{t("reg.eyebrow") ?? "UK compliance framework"}</div>
          <h2 className="mt-4 display-black text-3xl md:text-4xl lg:text-[2.75rem] leading-[1.05] [overflow-wrap:anywhere]">
            {t("reg.title") ?? "Structured for UK food businesses."}
          </h2>
          <p className="mt-5 text-black/60">
            {t("reg.body") ??
              "A versioned overview for all four UK nations. Always verify requirements using linked official sources and qualified advice."}
          </p>
        </div>
        <div className="md:col-span-2 grid sm:grid-cols-2 gap-5">
          {cards.map((c) => (
            <div key={c.k} className="card-polished p-6">
              <div className="flex items-center gap-3">
                <span
                  className="icon-3d"
                  style={{ height: "2.75rem", width: "2.75rem", borderRadius: "0.85rem" }}
                >
                  <Building2 size={18} strokeWidth={2.4} />
                </span>
                <h4 className="font-black text-base">{c.title}</h4>
              </div>
              <p className="mt-3 text-sm text-black/60">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── pricing */
function Pricing() {
  const { t } = useI18n();
  const plans = [
    {
      k: "solo",
      price: "£9.99",
      featured: false,
      features: [
        "Daily routines and temperature logs",
        "Document and training expiry alerts",
        "Inspection-ready exports",
      ],
    },
    {
      k: "complete",
      price: "£24.99",
      featured: true,
      features: [
        "All Solo features",
        "Unlimited staff and all modules",
        "Printable QR equipment history",
      ],
    },
    {
      k: "group",
      price: "£59.99",
      featured: false,
      features: ["Up to three locations", "Group oversight and alerts", "Scoped inspector access"],
    },
    {
      k: "enterprise",
      price: "Custom",
      featured: false,
      features: [
        "Four or more locations",
        "SLA and implementation support",
        "Integrations and governance",
      ],
    },
  ] as const;
  return (
    <section id="pricing" className="bg-white">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-32">
        <div className="max-w-3xl">
          <div className="eyebrow">{t("pricing.eyebrow") ?? "Plans"}</div>
          <h2 className="mt-4 display-black text-3xl md:text-6xl">{t("pricing.title")}</h2>
          <p className="mt-5 text-black/60">{t("pricing.subtitle")}</p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          {plans.map((p) => (
            <div
              key={p.k}
              className={`relative flex h-full flex-col p-8 ${
                p.featured
                  ? "card-polished-dark text-white ring-4 ring-[color:var(--color-alert-red)]/60"
                  : "card-polished text-black"
              }`}
            >
              <div className="mb-4 flex min-h-[1.75rem] items-start">
                {p.featured && (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black leading-tight tracking-[0.14em] uppercase text-white bg-[color:var(--color-alert-red)] shadow-lg">
                    {t("pricing.featured") ?? "Most Popular"}
                  </span>
                )}
              </div>

              <h3 className="display-black text-2xl">{t(`pricing.plan.${p.k}`)}</h3>
              <p
                className={`text-sm mt-2 min-h-[2.5rem] leading-snug ${p.featured ? "text-white/70" : "text-black/60"}`}
              >
                {t(`pricing.plan.${p.k}.desc`)}
              </p>
              <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="display-black text-5xl">{p.price}</span>
                {p.k !== "enterprise" && (
                  <span className={`text-sm ${p.featured ? "text-white/70" : "text-black/60"}`}>
                    {t("pricing.perMonth")}
                  </span>
                )}
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((feature) => (
                  <li key={feature} className={p.featured ? "text-white/80" : "text-black/65"}>
                    ✓ {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-7">
                <a
                  href={p.k === "enterprise" ? "#contact" : "/login"}
                  className={`inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-black tracking-wider uppercase transition ${
                    p.featured
                      ? "bg-[color:var(--color-alert-green)] text-white hover:brightness-110"
                      : "bg-black text-white hover:bg-[color:var(--color-alert-red)]"
                  }`}
                >
                  {p.k === "enterprise" ? "Contact sales" : "Start 7-day free trial"}
                </a>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-black/60">
          VAT is added where applicable. No card required for the trial; cancel before renewal.
        </p>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── cta */
function CtaFooter() {
  const { t } = useI18n();
  return (
    <section className="alert-gradient text-white">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-14 md:py-28 grid md:grid-cols-[minmax(0,1fr)_auto] gap-8 items-center">
        <h2 className="display-black text-3xl md:text-6xl">{t("cta.title")}</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/app" className="btn-primary">
            {t("cta.primary")} <ArrowRight size={16} />
          </Link>
          <a href="#contact" className="btn-red-outline">
            {t("cta.secondary")}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── outcomes band (black) */
function OutcomesBand() {
  const { t } = useI18n();
  const stats = [
    { icon: Clock, v: t("outcomes.hours.value"), l: t("outcomes.hours.label") },
    { icon: Zap, v: t("outcomes.faster.value"), l: t("outcomes.faster.label") },
    { icon: Recycle, v: t("outcomes.waste.value"), l: t("outcomes.waste.label") },
    { icon: CalendarCheck, v: t("outcomes.audit.value"), l: t("outcomes.audit.label") },
  ];
  return (
    <section className="bg-black text-white">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-14 md:py-28">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[color:var(--color-alert-red-on-dark)] uppercase tracking-widest text-xs font-black">
            <TrendingUp size={14} /> {t("outcomes.eyebrow")}
          </div>
          <h2 className="mt-4 display-black text-3xl md:text-6xl">{t("outcomes.title")}</h2>
          <p className="mt-4 text-white/70 max-w-2xl">{t("outcomes.subtitle")}</p>
        </div>
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map(({ icon: Icon, v, l }) => (
            <div key={l} className="card-polished-dark p-6 md:p-8">
              <span className="icon-3d icon-3d-sm">
                <Icon size={20} strokeWidth={2.4} />
              </span>

              <div className="mt-5 display-black text-3xl md:text-4xl leading-none">{v}</div>
              <div className="mt-2 text-sm text-white/70 leading-snug">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── industries strip */
function IndustriesStrip() {
  const { t } = useI18n();
  const items = [
    { icon: Utensils, k: "restaurant" },
    { icon: Hotel, k: "hotel" },
    { icon: Coffee, k: "cafe" },
    { icon: Beer, k: "pub" },
    { icon: TruckIcon, k: "takeaway" },
    { icon: ChefHat, k: "canteen" },
  ];
  return (
    <section className="bg-[color:var(--color-cream)]">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-20 md:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow">{t("industries.title").split(".")[0]}.</div>
          <h2 className="mt-4 display-black text-3xl md:text-5xl">{t("industries.title")}</h2>
          <p className="mt-4 text-black/60 max-w-2xl">{t("industries.subtitle")}</p>
        </div>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {items.map(({ icon: Icon, k }) => {
            const inner = (
              <>
                <span className="icon-3d icon-3d-sm">
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <div className="mt-3 font-black text-sm">{t(`industries.${k}`)}</div>
              </>
            );
            const className = "card-polished p-5 flex flex-col items-center text-center";
            return k === "restaurant" || k === "cafe" ? (
              <Link
                key={k}
                to="/industries/restaurants-and-cafes"
                className={`${className} transition hover:-translate-y-0.5`}
              >
                {inner}
              </Link>
            ) : (
              <div key={k} className={className}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── platform pillars */
function PlatformPillars() {
  const { t } = useI18n();
  const pillars = [
    { icon: Smartphone, k: "mobile" },
    { icon: Bell, k: "alerts" },
    { icon: Server, k: "hosting" },
    { icon: Plug, k: "integrations" },
  ];
  return (
    <section className="bg-white border-t border-black/5">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-28">
        <div className="max-w-3xl">
          <div className="eyebrow">{t("platform.eyebrow")}</div>
          <h2 className="mt-4 display-black text-3xl md:text-5xl" style={{ hyphens: "auto" }}>
            {t("platform.title")}
          </h2>
          <p className="mt-4 text-black/60 max-w-2xl">{t("platform.subtitle")}</p>
        </div>
        <div className="mt-10 md:mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {pillars.map(({ icon: Icon, k }) => (
            <div key={k} className="group card-polished p-6 md:p-7">
              <span className={k === "hosting" ? "icon-3d-dark icon-3d-sm" : "icon-3d icon-3d-sm"}>
                <Icon size={20} strokeWidth={2.2} />
              </span>

              <div className="mt-5 font-black text-lg md:text-xl leading-tight">
                {t(`platform.${k}.title`)}
              </div>
              <p className="mt-2 text-sm text-black/60 leading-relaxed">
                {t(`platform.${k}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── resources / internal links */
function ResourcesBand() {
  const resources = [
    {
      to: "/free-tools/haccp-plan-template",
      title: "Free HACCP plan template (UK)",
      body: "Download an editable HACCP plan built around SFBB-style records and EHO expectations.",
    },
    {
      to: "/industries/restaurants-and-cafes",
      title: "Food safety software for restaurants and cafés",
      body: "See how daily diaries, temperature logs and allergen controls work in a busy kitchen.",
    },
    {
      to: "/industries/takeaways-and-fast-food",
      title: "Takeaways and fast food",
      body: "Fryer and hot-hold checks, oil quality logs and allergen answers that match your listings.",
    },
    {
      to: "/industries/pubs-and-bars",
      title: "Pubs and bars",
      body: "Kitchen, cellar and line cleaning records in one dated compliance trail.",
    },
    {
      to: "/industries/care-homes-and-schools",
      title: "Care homes and school kitchens",
      body: "Cook-chill, regeneration and special-diet evidence built for vulnerable diners.",
    },

    {
      to: "/compare/haccora-vs-logit",
      title: "Haccora vs Logit",
      body: "Compare pricing, modules and inspection evidence side by side.",
    },
    {
      to: "/compare/haccora-vs-fooddocs",
      title: "Haccora vs FoodDocs",
      body: "Understand the differences before you choose a digital food safety system.",
    },
  ] as const;
  return (
    <section id="resources" className="bg-white border-t border-black/5">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow">Guides and resources</div>
          <h2 className="mt-4 display-black text-3xl md:text-5xl">
            Free tools, sector guides and honest comparisons.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {resources.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className="card-polished p-6 transition hover:-translate-y-0.5"
            >
              <h3 className="font-black text-base leading-tight">{r.title}</h3>
              <p className="mt-3 text-sm text-black/60">{r.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[color:var(--color-alert-red)]">
                Read more <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── product preview */
function ProductPreview() {
  const checks = [
    { label: "Walk-in fridge", value: "3.1°C", state: "ok" as const, time: "07:12" },
    { label: "Chest freezer", value: "-19.4°C", state: "ok" as const, time: "07:14" },
    { label: "Hot hold — curry", value: "61.8°C", state: "warn" as const, time: "12:05" },
    { label: "Probe — chicken", value: "78.2°C", state: "ok" as const, time: "12:22" },
  ];
  const tasks = [
    { label: "Opening checks", done: true },
    { label: "Fridge and freezer temperatures", done: true },
    { label: "Allergen matrix review", done: false },
    { label: "Closing clean — kitchen line", done: false },
  ];
  return (
    <section
      id="product-preview"
      className="bg-[#0b0b0c] text-white border-t border-white/10"
      aria-labelledby="product-preview-heading"
    >
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow text-white/60">What you actually see</div>
          <h2 id="product-preview-heading" className="mt-4 display-black text-3xl md:text-5xl">
            A day in Haccora, before you sign up.
          </h2>
          <p className="mt-4 text-sm md:text-base text-white/70 leading-relaxed">
            Staff open the app, complete the checks for their shift and capture evidence as they
            work. Managers see the gaps in real time and export an inspection pack in one tap.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/12 bg-white/[0.04] p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white/70">
                Today&rsquo;s diary
              </h3>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">
                2 of 4 done
              </span>
            </div>
            <ul className="mt-5 space-y-3">
              {tasks.map((task) => (
                <li key={task.label} className="flex items-center gap-3 text-sm">
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      task.done
                        ? "bg-[color:var(--color-alert-red)] text-white"
                        : "border border-white/25 text-white/40"
                    }`}
                  >
                    {task.done ? <CheckCircle2 size={14} /> : <Clock size={13} />}
                  </span>
                  <span className={task.done ? "text-white/60 line-through" : "text-white"}>
                    {task.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/12 bg-white/[0.04] p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white/70">
                Temperature log
              </h3>
              <Thermometer size={16} className="text-[color:var(--color-alert-red)]" />
            </div>
            <ul className="mt-5 space-y-3">
              {checks.map((check) => (
                <li
                  key={check.label}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-black/40 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{check.label}</p>
                    <p className="text-[11px] text-white/45">Logged {check.time}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                      check.state === "ok"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {check.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/12 bg-white/[0.04] p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white/70">
                Inspection pack
              </h3>
              <ClipboardCheck size={16} className="text-[color:var(--color-alert-red)]" />
            </div>
            <p className="mt-5 text-sm text-white/70">
              Every record, photo and corrective action from the period you choose, exported as one
              time-stamped PDF for the inspector.
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              {[
                { k: "Records", v: "1,284" },
                { k: "Photos", v: "312" },
                { k: "Corrective actions", v: "7" },
                { k: "Signed off", v: "100%" },
              ].map((item) => (
                <div key={item.k} className="rounded-2xl bg-black/40 px-3.5 py-3">
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                    {item.k}
                  </dt>
                  <dd className="mt-1 text-lg font-black">{item.v}</dd>
                </div>
              ))}
            </dl>
            <a href="#contact" className="btn-red mt-5 w-full justify-center !py-2.5 !text-xs">
              See it on your own data <ArrowRight size={14} />
            </a>
          </div>
        </div>
        <p className="mt-6 text-xs text-white/70">
          Illustrative example using sample data. Figures shown are not customer records.
        </p>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── FAQ */
function FaqSection() {
  const { t } = useI18n();
  return (
    <section className="bg-white border-t border-black/10" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-[860px] px-4 sm:px-6 md:px-8 py-14 sm:py-18 md:py-24">
        <h2 id="faq-heading" className="display-black text-2xl sm:text-3xl md:text-4xl text-center">
          {t("faq.title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-black/60">
          Clear answers about UK compliance, inspections, devices, security and subscriptions.
        </p>
        <div className="mt-8 sm:mt-10 divide-y divide-black/10 border-y border-black/10">
          {MARKETING_FAQS.map(({ question, answer }) => (
            <details key={question} className="group py-4 sm:py-5">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-alert-red)]">
                <span className="font-black text-[0.95rem] sm:text-base md:text-lg leading-snug">
                  {question}
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full bg-black text-white group-open:hidden"
                >
                  <Plus size={15} />
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 hidden group-open:inline-flex items-center justify-center h-8 w-8 rounded-full bg-[color:var(--color-alert-red)] text-white"
                >
                  <Minus size={15} />
                </span>
              </summary>
              <p className="mt-3 pr-10 text-sm md:text-[0.95rem] leading-relaxed text-black/70">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="bg-black text-white/70">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-12 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <BrandLogo to="" imgClassName="h-12 w-auto" />

          <p className="mt-2 text-white/50 text-xs leading-relaxed max-w-xs">{t("brand.tag")}</p>
          <div className="mt-5">
            <FollowBar dark />
          </div>
        </div>
        <div>
          <div className="text-white text-xs font-black uppercase tracking-widest">
            {t("footer.section.platform")}
          </div>
          <ul className="mt-3 space-y-2">
            <li>
              <a href="#pillars" className="hover:text-white">
                {t("nav.modules")}
              </a>
            </li>
            <li>
              <a href="#inspector" className="hover:text-white">
                Inspector Mode
              </a>
            </li>
            <li>
              <a href="#regulation" className="hover:text-white">
                {t("nav.regulation")}
              </a>
            </li>
            <li>
              <a href="#pricing" className="hover:text-white">
                {t("nav.pricing")}
              </a>
            </li>
            <li>
              <Link to="/blog" className="hover:text-white">
                {t("nav.blog") ?? "Blog"}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-white text-xs font-black uppercase tracking-widest">
            {t("footer.section.support")}
          </div>
          <ul className="mt-3 space-y-2">
            <li>
              <Link to="/legal/complaints" className="hover:text-white">
                {t("footer.complaints")}
              </Link>
            </li>
            <li>
              {PUBLIC_CONFIG.supportUrl ? (
                <a href={PUBLIC_CONFIG.supportUrl} className="hover:text-white">
                  {t("footer.help")}
                </a>
              ) : (
                <Link to="/help" className="hover:text-white">
                  {t("footer.help")}
                </Link>
              )}
            </li>
            {PUBLIC_CONFIG.statusUrl && (
              <li>
                <a href={PUBLIC_CONFIG.statusUrl} className="hover:text-white">
                  {t("footer.status")}
                </a>
              </li>
            )}
          </ul>
        </div>
        <div>
          <div className="text-white text-xs font-black uppercase tracking-widest">
            {t("footer.section.legal")}
          </div>
          <ul className="mt-3 space-y-2">
            <li>
              <Link to="/legal/company-details" className="hover:text-white">
                {t("footer.company")}
              </Link>
            </li>
            <li>
              <Link to="/legal/privacy" className="hover:text-white">
                {t("footer.privacy")}
              </Link>
            </li>
            <li>
              <Link to="/legal/terms" className="hover:text-white">
                {t("footer.terms")}
              </Link>
            </li>
            <li>
              <Link to="/legal/cookies" className="hover:text-white">
                {t("footer.cookies")}
              </Link>
            </li>
            <li>
              <Link to="/legal/data-processing" className="hover:text-white">
                {t("footer.dataProcessing")}
              </Link>
            </li>
            <li>
              <Link to="/legal/accessibility" className="hover:text-white">
                {t("footer.accessibility")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-5 text-xs text-white/70">
          {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
