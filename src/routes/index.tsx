import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/LanguageToggle";
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
} from "lucide-react";

import heroChef from "@/assets/hero-chef.jpg";
import { FollowBar } from "@/components/SocialIcons";
import { BrandLogo } from "@/components/BrandLogo";
import { PUBLIC_CONFIG } from "@/lib/public-config";

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
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-white text-foreground pb-20 md:pb-0">
      <TopBar />
      <SubNav />
      <Hero />
      <ChefsMarquee />
      <OutcomesBand />
      <Support360 />
      <ModulePillars />
      <IndustriesStrip />
      <PlatformPillars />

      <InspectorBand />
      <Regulation />
      <Pricing />
      <FaqSection />
      <CtaFooter />
      <SiteFooter />
      <StickyMobileCTA />
    </div>
  );
}

/* ────────────────────────────────────────────── marquee: built for German kitchens */
function ChefsMarquee() {
  const { t } = useI18n();
  const phrase = t("marquee.phrase") ?? "Built for UK kitchens · Safe. Simple. Evidenced.";
  const line = Array.from({ length: 8 }, (_, i) => (
    <span key={i} className="inline-flex items-center gap-4 md:gap-6">
      <span className="display-black text-2xl md:text-6xl uppercase tracking-tight">{phrase}</span>
      <span className="h-2 w-2 md:h-3 md:w-3 rounded-full bg-[color:var(--color-alert-red)] shrink-0" />
    </span>
  ));
  return (
    <section
      aria-hidden="true"
      className="bg-black text-white overflow-hidden border-y border-white/10"
    >
      <div className="marquee-track py-6 md:py-8">
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
          <div className="hidden md:flex items-center h-10 rounded-full bg-white/8 border border-white/12 px-4 min-w-[220px]">
            <Search size={14} className="text-white/60" />
            <input
              placeholder={t("nav.search") ?? "Search"}
              className="ml-2 bg-transparent text-sm placeholder:text-white/50 outline-none w-full"
            />
          </div>
          <LanguageToggle variant="dark" />
          <Link to="/app" className="btn-red-outline hidden sm:inline-flex">
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

      <div className="relative mx-auto max-w-[1400px] px-4 md:px-8 pt-10 md:pt-24 pb-16 md:pb-40">
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-8 md:gap-16 items-start">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-alert-red)]/40 bg-[color:var(--color-alert-red)]/15 px-3 py-1 text-[10px] md:text-[11px] font-black tracking-[0.18em] text-[color:var(--color-alert-red)] uppercase">
              {t("brand.tagline")}
            </div>
            <h1
              lang="de"
              className="mt-4 display-black text-[2rem] leading-[1.02] xs:text-4xl sm:text-5xl md:text-7xl lg:text-[5.4rem] [overflow-wrap:anywhere] [hyphens:auto]"
            >
              {t("hero.title")}
            </h1>
            <p className="mt-5 md:mt-7 max-w-xl text-sm md:text-lg text-white/90 leading-relaxed [text-wrap:pretty]">
              {t("hero.subtitle")}
            </p>

            <div className="mt-6 md:mt-8 flex flex-wrap items-center gap-3 md:gap-4">
              <div className="inline-flex items-center gap-3 rounded-2xl bg-black/70 backdrop-blur-sm px-3 py-2.5 md:px-4 md:py-3 text-sm">
                <span className="inline-flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-white/10">
                  ▶
                </span>
                <span className="leading-tight">
                  <span className="block font-bold text-xs md:text-sm">
                    {t("hero.video.title")}
                  </span>
                  <span className="block text-[color:var(--color-alert-green)] text-[10px] md:text-xs font-bold tracking-widest mt-0.5">
                    {t("hero.play")}
                  </span>
                </span>
              </div>
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

function ContactCard() {
  const { t, lang } = useI18n();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setState("sending");
    setError("");
    const form = new FormData(formElement);
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
    if (invokeError) {
      setState("error");
      setError(
        lang === "de"
          ? "Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut."
          : "Your request could not be sent. Please try again.",
      );
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
          required
          autoComplete="given-name"
          maxLength={80}
          placeholder={t("contact.first") ?? "First Name"}
          className="fld"
        />
        <input
          name="lastName"
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
          required
          type="email"
          autoComplete="email"
          maxLength={254}
          placeholder={t("contact.email") ?? "Email Address"}
          className="fld"
        />
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={40}
          placeholder={t("contact.phone") ?? "Phone Number"}
          className="fld"
        />
        <input
          name="businessName"
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
          {t("contact.legal") ?? "By submitting this form, you agree to our privacy policy."}
        </span>
      </label>
      <button
        disabled={state === "sending"}
        type="submit"
        className="btn-primary w-full mt-5 uppercase tracking-widest text-xs md:text-sm disabled:opacity-60"
      >
        {state === "sending"
          ? lang === "de"
            ? "Wird gesendet…"
            : "Sending…"
          : (t("contact.cta") ?? "Get In Touch")}
      </button>
      {state === "sent" && (
        <p role="status" className="mt-3 text-sm text-success text-center">
          {lang === "de"
            ? "Vielen Dank. Wir melden uns in Kürze."
            : "Thank you. We will be in touch shortly."}
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
            <Link to="/app/inspection" className="btn-red mt-9">
              {t("inspector.cta")} <ArrowRight size={16} />
            </Link>
          </div>

          <div className="rounded-3xl bg-white text-black p-6 md:p-8 border-4 border-[color:var(--color-alert-red)]/80">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-alert-red)]">
                {t("inspector.demo.header")}
              </div>
              <span className="text-xs font-bold text-black/60">DE</span>
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
  const cards = (["berlin", "nrw", "eu852", "eu1169", "ifsg", "lmhv"] as const).map((k) => ({
    k,
    title: t(`reg.card.${k}.t`),
    body: t(`reg.card.${k}.b`),
  }));

  return (
    <section id="regulation" className="bg-[color:var(--color-cream)]">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-32 grid md:grid-cols-3 gap-10 md:gap-16">
        <div className="md:col-span-1">
          <div className="eyebrow">{t("reg.eyebrow") ?? "UK compliance framework"}</div>
          <h2
            lang="de"
            className="mt-4 display-black text-3xl md:text-4xl lg:text-[2.75rem] leading-[1.05] [overflow-wrap:anywhere] [hyphens:auto]"
          >
            {t("reg.title") ?? "Structured for UK food businesses."}
          </h2>
          <p className="mt-5 text-black/60">
            {t("reg.body") ??
              "Referenzübersicht für Berlin, NRW und zentrale EU-Regeln. Prüfen Sie vor Maßnahmen stets die verlinkten offiziellen Quellen und fachliche Beratung."}
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
    { k: "solo", price: "£9.99", featured: false },
    { k: "complete", price: "£24.99", featured: true },
    { k: "completePlus", price: "£39.99", featured: false },
    { k: "group", price: "£59.99", featured: false },
    { k: "growing", price: "£149", featured: false },
    { k: "enterprise", price: "Custom", featured: false },
  ] as const;
  return (
    <section id="pricing" className="bg-white">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-32">
        <div className="max-w-3xl">
          <div className="eyebrow">{t("pricing.eyebrow") ?? "Plans"}</div>
          <h2 className="mt-4 display-black text-3xl md:text-6xl">{t("pricing.title")}</h2>
          <p className="mt-5 text-black/60">{t("pricing.subtitle")}</p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div
              key={p.k}
              className={`relative rounded-2xl p-8 ${
                p.featured
                  ? "bg-black text-white ring-4 ring-[color:var(--color-alert-red)]/60"
                  : "bg-white border border-black/10 text-black"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-black tracking-widest uppercase text-white bg-[color:var(--color-alert-red)]">
                  {t("pricing.featured") ?? "Most Popular"}
                </span>
              )}
              <h3 className="display-black text-2xl">{t(`pricing.plan.${p.k}`)}</h3>
              <p className={`text-sm mt-2 ${p.featured ? "text-white/70" : "text-black/60"}`}>
                {t(`pricing.plan.${p.k}.desc`)}
              </p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="display-black text-5xl">{p.price}</span>
                <span className={`text-sm ${p.featured ? "text-white/70" : "text-black/60"}`}>
                  {t("pricing.perMonth")}
                </span>
              </div>
              <a
                href="#contact"
                className={`mt-7 inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-black tracking-wider uppercase transition ${
                  p.featured
                    ? "bg-[color:var(--color-alert-green)] text-white hover:brightness-110"
                    : "bg-black text-white hover:bg-[color:var(--color-alert-red)]"
                }`}
              >
                {t("pricing.cta")}
              </a>
            </div>
          ))}
        </div>
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
            <TrendingUp size={14} /> {t("outcomes.title").split(".")[0]}.
          </div>
          <h2 className="mt-4 display-black text-3xl md:text-6xl">{t("outcomes.title")}</h2>
          <p className="mt-4 text-white/70 max-w-2xl">{t("outcomes.subtitle")}</p>
        </div>
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map(({ icon: Icon, v, l }) => (
            <div key={l} className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 md:p-8">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--color-alert-red)]/20 text-[color:var(--color-alert-red)]">
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
          {items.map(({ icon: Icon, k }) => (
            <div
              key={k}
              className="rounded-2xl bg-white border border-black/5 p-5 flex flex-col items-center text-center hover:shadow-lg transition"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--color-alert-red)]/10 text-[color:var(--color-alert-red)]">
                <Icon size={22} strokeWidth={2.2} />
              </span>
              <div className="mt-3 font-black text-sm">{t(`industries.${k}`)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── platform pillars */
function PlatformPillars() {
  const { t } = useI18n();
  const pillars = [
    { icon: Smartphone, k: "mobile", tone: "from-[color:var(--color-alert-red)] to-orange-500" },
    { icon: Bell, k: "alerts", tone: "from-emerald-500 to-emerald-600" },
    { icon: Server, k: "hosting", tone: "from-slate-800 to-black" },
    { icon: Plug, k: "integrations", tone: "from-blue-600 to-indigo-600" },
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
          {pillars.map(({ icon: Icon, k, tone }) => (
            <div
              key={k}
              className="group relative rounded-2xl border border-black/5 bg-white p-6 md:p-7 hover:shadow-xl transition-shadow overflow-hidden"
            >
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-md`}
              >
                <Icon size={22} strokeWidth={2.2} />
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

/* ────────────────────────────────────────────── FAQ */
function FaqSection() {
  const { t } = useI18n();
  const items = [1, 2, 3, 4, 5] as const;
  return (
    <section className="bg-white border-t border-black/10">
      <div className="mx-auto max-w-[900px] px-4 md:px-8 py-16 md:py-32">
        <h2 className="display-black text-4xl md:text-5xl text-center">{t("faq.title")}</h2>
        <div className="mt-12 divide-y divide-black/10 border-y border-black/10">
          {items.map((i) => (
            <details key={i} className="group py-5">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                <span className="font-black text-lg md:text-xl">{t(`faq.q${i}`)}</span>
                <span className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full bg-black text-white group-open:hidden">
                  <Plus size={16} />
                </span>
                <span className="shrink-0 hidden group-open:inline-flex items-center justify-center h-9 w-9 rounded-full bg-[color:var(--color-alert-red)] text-white">
                  <Minus size={16} />
                </span>
              </summary>
              <p className="mt-4 text-black/70 text-base leading-relaxed pr-12">{t(`faq.a${i}`)}</p>
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
              <a href={PUBLIC_CONFIG.supportUrl ?? "#contact"} className="hover:text-white">
                {t("footer.help")}
              </a>
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
              <Link to="/legal/imprint" className="hover:text-white">
                {t("footer.imprint")}
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
