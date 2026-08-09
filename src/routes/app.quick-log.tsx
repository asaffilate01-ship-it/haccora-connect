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
  action?: Action;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "Temperature",
    body: "Fridge, freezer, cooking or cooling reading",
    to: "/app/temperature",
    nav: "temperature",
    icon: Thermometer,
  },
  {
    title: "Daily check",
    body: "Opening, closing and routine evidence",
    to: "/app/checks",
    nav: "checks",
    icon: ClipboardCheck,
  },
  {
    title: "Delivery",
    body: "Accept or reject incoming goods",
    to: "/app/goodsin",
    nav: "goodsin",
    icon: Truck,
    action: "purchasing.receive",
  },
  {
    title: "Cleaning",
    body: "Complete the current site schedule",
    to: "/app/cleaning",
    nav: "cleaning",
    icon: Sparkles,
  },
  {
    title: "Daily diary",
    body: "Record problems and corrective action",
    to: "/app/diary",
    nav: "checks",
    icon: BookOpenCheck,
  },
  {
    title: "Incident",
    body: "Report a food-safety event",
    to: "/app/incidents",
    nav: "incidents",
    icon: AlertTriangle,
    action: "incidents.report",
  },
  {
    title: "Scan equipment",
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
  const visible = QUICK_ACTIONS.filter(
    (item) =>
      canAccess(user.role, item.nav, user.inspectorScopes) &&
      (!item.action || can(user.role, item.action, user.actionPermissions)),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 pb-24 md:p-8">
      <header>
        <div className="eyebrow">Quick log</div>
        <h1 className="mt-1">What are you recording?</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Choose one task. Haccora opens the shortest authorised workflow and keeps the result
          tenant-scoped, attributable and ready for review.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        {visible.map(({ title, body, to, icon: Icon }) => (
          <Link
            key={to}
            to={to as never}
            className="group flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--color-alert-red)]/10 text-[color:var(--color-alert-red)]">
              <Icon size={19} strokeWidth={2.4} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">{title}</span>
              <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{body}</span>
            </span>
            <ChevronRight
              size={17}
              className="text-muted-foreground transition group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
