import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Thermometer,
  ClipboardCheck,
  Wheat,
  Users,
  FileText,
  Bell,
  Smartphone,
  Truck,
  Recycle,
  QrCode,
  BarChart3,
} from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";

const TITLE = "Features — Digital HACCP, temperature logs and inspection packs | Haccora";
const DESCRIPTION =
  "Every Haccora module: digital HACCP, fridge and probe temperature logs, cleaning schedules, allergens and PPDS, staff training, supplier and delivery checks, QR equipment checks and one-tap EHO inspection packs.";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Digital HACCP plan",
    body: "Build hazard analysis, CCPs and critical limits once, then keep every review dated and evidenced.",
  },
  {
    icon: Thermometer,
    title: "Temperature and probe logs",
    body: "Fridge, freezer, cook, chill and hot-hold records with out-of-range prompts and corrective actions.",
  },
  {
    icon: ClipboardCheck,
    title: "Daily diary and opening checks",
    body: "SFBB-style routines that staff complete on a phone in seconds, with a full audit trail.",
  },
  {
    icon: Wheat,
    title: "Allergens and PPDS labelling",
    body: "Recipe-level allergen records and PPDS label preparation, with review prompts when an ingredient or supplier specification changes.",
  },
  {
    icon: Users,
    title: "Staff training and fitness to work",
    body: "Inductions, certificates, expiry reminders and return-to-work declarations in one register.",
  },
  {
    icon: Truck,
    title: "Suppliers and goods-in",
    body: "Approved supplier list, delivery temperature checks and rejection records with photo evidence.",
  },
  {
    icon: QrCode,
    title: "QR equipment checks",
    body: "Scan an asset to log a check, raise a fault or view its maintenance and calibration history.",
  },
  {
    icon: Bell,
    title: "Alerts and escalations",
    body: "Missed checks, breaches and expiries notify the right person by email, push or in-app alert.",
  },
  {
    icon: FileText,
    title: "One-tap inspection pack",
    body: "Export a dated, tamper-evident evidence pack for your EHO or third-party auditor.",
  },
  {
    icon: Recycle,
    title: "Waste, oil and cleaning",
    body: "Cleaning schedules, waste logging and oil quality checks tracked against your own standards.",
  },
  {
    icon: BarChart3,
    title: "Multi-site dashboards",
    body: "Compliance scores, overdue tasks and open incidents rolled up across every site you run.",
  },
  {
    icon: Smartphone,
    title: "Works offline on mobile",
    body: "Native iOS and Android apps plus an installable web app that queue records when signal drops.",
  },
] as const;

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://haccora.co.uk/features" },
      { property: "og:image", content: "https://haccora.co.uk/og-haccora.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://haccora.co.uk/og-haccora.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://haccora.co.uk/features" }],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  return (
    <MarketingShell>
      <section className="bg-black text-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24">
          <div className="eyebrow text-[color:var(--color-alert-red-on-dark)]">Features</div>
          <h1 className="mt-4 display-black text-3xl md:text-6xl max-w-4xl">
            Everything a UK food business has to record — in one system.
          </h1>
          <p className="mt-5 max-w-2xl text-white/70">
            Haccora replaces paper diaries, spreadsheets and folder-based evidence with structured,
            time-stamped records your environmental health officer can review alongside your
            procedures and food-safety practices.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="card-polished p-7 h-full">
              <span className="icon-3d icon-3d-sm">
                <Icon size={20} strokeWidth={2.3} />
              </span>
              <h2 className="mt-5 display-black text-xl">{title}</h2>
              <p className="mt-3 text-sm text-black/65 leading-relaxed">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="alert-gradient text-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-14 md:py-20 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <h2 className="display-black text-2xl md:text-4xl max-w-2xl">
            Start a 7-day free trial and log your first records today.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/login" className="btn-primary">
              Start free trial
            </Link>
            <Link to="/pricing" className="btn-red-outline">
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
