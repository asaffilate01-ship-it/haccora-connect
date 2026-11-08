import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpenCheck,
  ChevronRight,
  ClipboardCheck,
  ScanLine,
  Sparkles,
  Thermometer,
  Truck,
  CalendarDays,
  PackageX,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { canAccess, useAuth, type NavKey } from "@/lib/auth";
import { can, type Action } from "@/lib/permissions";

export const Route = createFileRoute("/app/quick-log")({
  component: QuickLog,
});

type QuickAction = {
  title: string;
  body: string;
  to: string;
  nav: NavKey;
  icon: LucideIcon;
  section: "record" | "review";
  action?: Action;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "Temperature",
    section: "record",
    body: "Fridge, freezer, cooking or cooling reading",
    to: "/app/temperature",
    nav: "temperature",
    icon: Thermometer,
  },
  {
    title: "Daily check",
    section: "record",
    body: "Opening, closing and routine evidence",
    to: "/app/checks",
    nav: "checks",
    icon: ClipboardCheck,
  },
  {
    title: "Delivery",
    section: "record",
    body: "Accept or reject incoming goods",
    to: "/app/goodsin",
    nav: "goodsin",
    icon: Truck,
    action: "purchasing.receive",
  },
  {
    title: "Cleaning",
    section: "record",
    body: "Complete the current site schedule",
    to: "/app/cleaning",
    nav: "cleaning",
    icon: Sparkles,
  },
  {
    title: "Daily diary",
    section: "record",
    body: "Record problems and corrective action",
    to: "/app/diary",
    nav: "checks",
    icon: BookOpenCheck,
  },
  {
    title: "Incident",
    section: "record",
    body: "Report a food-safety event",
    to: "/app/incidents",
    nav: "incidents",
    icon: AlertTriangle,
    action: "incidents.report",
  },
  {
    title: "Current allergens & PPDS",
    section: "review",
    body: "Review recipe information and controlled label versions",
    to: "/app/ppds",
    nav: "labels",
    icon: Wheat,
  },
  {
    title: "Product recall",
    section: "review",
    body: "Review quarantined batches and recall actions",
    to: "/app/recalls",
    nav: "recalls",
    icon: PackageX,
  },
  {
    title: "My shift",
    section: "review",
    body: "Review rota and record clock-in or clock-out",
    to: "/app/rota",
    nav: "rota",
    icon: CalendarDays,
  },
  {
    title: "Scan equipment",
    section: "record",
    body: "Open the asset and append trusted evidence",
    to: "/app/assets/scan",
    nav: "assets",
    icon: ScanLine,
    action: "assets.record",
  },
];

function QuickLog() {
  const { user } = useAuth();
  if (!user) return null;
  // Inspectors receive scoped read-only evidence; the logging launcher is never available.
  if (user.role === "inspector") {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-5 md:p-8">
        <h1>Inspector evidence access</h1>
        <p className="text-sm text-muted-foreground">
          This workspace is read-only for inspectors. Open your approved evidence scope instead.
        </p>
        <Link to="/app/inspection" className="btn-primary inline-flex min-h-12 items-center px-5 py-3">
          View inspection evidence
        </Link>
      </div>
    );
  }
  const visible = QUICK_ACTIONS.filter(
    (item) =>
      canAccess(user.role, item.nav, user.inspectorScopes) &&
      (!item.action || can(user.role, item.action, user.actionPermissions)),
  );

  const sections = [
    {
      key: "record" as const,
      heading: "Record now",
      description: "Capture a reading, completed check, delivery, or issue.",
    },
    {
      key: "review" as const,
      heading: "Review and respond",
      description: "Open existing records without assuming they are current or approved.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-24 md:p-8">
      <header className="space-y-2">
        <div className="eyebrow">Quick log</div>
        <h1>What would you like to do?</h1>
        <p className="text-sm text-muted-foreground">
          Premises: <strong className="text-foreground">{user.location}</strong>. Choose an authorised
          workflow. A record is complete only when its destination confirms saving.
        </p>
      </header>

      {visible.length === 0 && (
        <div role="status" className="surface p-5 text-sm text-muted-foreground">
          No recording actions are available for this role. Ask your manager if your permissions
          need reviewing.
        </div>
      )}

      {sections.map((section) => {
        const entries = visible.filter((item) => item.section === section.key);
        if (entries.length === 0) return null;
        return (
          <section key={section.key} aria-label={section.heading} className="space-y-3">
            <header>
              <h2 className="text-lg font-bold">{section.heading}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
            </header>
            <div className="grid gap-2 sm:grid-cols-2">
              {entries.map(({ title, body, to, icon: Icon }) => {
                const critical = title === "Incident" || title === "Product recall";
                return (
                  <Link
                    key={to}
                    to={to as never}
                    className="group flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span
                      aria-hidden="true"
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${critical ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground"}`}
                    >
                      <Icon size={20} strokeWidth={2.25} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{title}</span>
                      <span className="mt-1 block text-xs leading-4 text-muted-foreground">{body}</span>
                    </span>
                    <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
