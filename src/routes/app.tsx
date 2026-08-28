import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/haccora-client";
import { BrandLogoImage } from "@/components/BrandLogo";
import { ExperienceController } from "@/components/ExperienceController";
import { useAuth, canAccess, homeFor, type NavKey } from "@/lib/auth";
import {
  LayoutDashboard,
  ShieldCheck,
  ClipboardCheck,
  Thermometer,
  Sparkles,
  Wheat,
  Truck,
  Users,
  Gavel,
  Settings,
  ArrowLeft,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Command,
  BellRing,
  CalendarClock,
  FileArchive,
  History,
  ListChecks,
  UtensilsCrossed,
  CalendarDays,
  Trash2,
  Boxes,
  ShoppingCart,
  Wrench,
  PackageX,
  ClipboardList,
  Tag,
  AlertOctagon,
  PackageCheck,
  HeartPulse,
  Bug,
  Flame,
  MessageSquareWarning,
  FlaskConical,
  LockKeyhole,
  CreditCard,
  PlugZap,
  Accessibility,
  BookOpenCheck,
  NotebookPen,
  Gauge,
  Rocket,
  Sunrise,
  Lightbulb,
  Building2,
  PlusCircle,
  LifeBuoy,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [{ title: "Haccora workspace" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AppShell,
});

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  key: string;
  nav: NavKey;
  exact?: boolean;
};
type NavGroup = { labelKey: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    labelKey: "nav.group.overview",
    items: [
      { to: "/app", icon: LayoutDashboard, key: "menu.dashboard", nav: "dashboard", exact: true },
      { to: "/app/today", icon: Sunrise, key: "Today's shift", nav: "checks" },
      { to: "/app/quick-log", icon: PlusCircle, key: "Quick log", nav: "checks" },
      { to: "/app/coach", icon: Lightbulb, key: "Compliance coach", nav: "dashboard" },
      { to: "/app/get-started", icon: Rocket, key: "Get started", nav: "dashboard" },
      { to: "/app/readiness", icon: Gauge, key: "UK readiness", nav: "dashboard" },
      { to: "/app/control-centre", icon: Command, key: "menu.control", nav: "control" },
    ],
  },
  {
    labelKey: "nav.group.routines",
    items: [
      { to: "/app/routines", icon: ListChecks, key: "menu.routines", nav: "routines" },
      { to: "/app/workflows", icon: ClipboardList, key: "menu.workflows", nav: "workflows" },
      { to: "/app/rota", icon: CalendarDays, key: "menu.rota", nav: "rota" },
    ],
  },
  {
    labelKey: "nav.group.compliance",
    items: [
      { to: "/app/uk-compliance", icon: ShieldCheck, key: "UK compliance profile", nav: "haccp" },
      { to: "/app/safe-methods", icon: BookOpenCheck, key: "Safe methods", nav: "haccp" },
      { to: "/app/diary", icon: NotebookPen, key: "Daily diary", nav: "checks" },
      { to: "/app/haccp", icon: ShieldCheck, key: "menu.haccp", nav: "haccp" },
      { to: "/app/haccp-flows", icon: ShieldCheck, key: "menu.haccpFlows", nav: "haccp" },
      { to: "/app/checks", icon: ClipboardCheck, key: "menu.checks", nav: "checks" },
      { to: "/app/temperature", icon: Thermometer, key: "menu.temperature", nav: "temperature" },
      { to: "/app/calibration", icon: Thermometer, key: "menu.calibration", nav: "calibration" },
      { to: "/app/cleaning", icon: Sparkles, key: "menu.cleaning", nav: "cleaning" },
      { to: "/app/pest", icon: Bug, key: "menu.pest", nav: "pest" },
    ],
  },
  {
    labelKey: "nav.group.kitchen",
    items: [
      { to: "/app/menu", icon: UtensilsCrossed, key: "menu.menu", nav: "menu" },
      { to: "/app/recipes", icon: Wheat, key: "menu.recipes", nav: "recipes" },
      { to: "/app/oil", icon: Flame, key: "menu.oil", nav: "oil" },
      { to: "/app/suppliers", icon: Truck, key: "menu.suppliers", nav: "suppliers" },
      { to: "/app/purchasing", icon: ShoppingCart, key: "menu.purchasing", nav: "purchasing" },
      { to: "/app/goodsin", icon: PackageCheck, key: "menu.goodsin", nav: "goodsin" },
    ],
  },
  {
    labelKey: "nav.group.inventory",
    items: [
      { to: "/app/stock", icon: Boxes, key: "menu.stock", nav: "stock" },
      { to: "/app/waste", icon: Trash2, key: "menu.waste", nav: "waste" },
      { to: "/app/recalls", icon: PackageX, key: "menu.recalls", nav: "recalls" },
      { to: "/app/chemicals", icon: FlaskConical, key: "menu.chemicals", nav: "chemicals" },
    ],
  },
  {
    labelKey: "nav.group.people",
    items: [
      { to: "/app/organisation", icon: Building2, key: "Organisation & team", nav: "settings" },
      { to: "/app/training", icon: Users, key: "menu.training", nav: "training" },
      { to: "/app/inductions", icon: ClipboardCheck, key: "Staff induction", nav: "training" },
      { to: "/app/health", icon: HeartPulse, key: "menu.health", nav: "health" },
    ],
  },
  {
    labelKey: "nav.group.kitchenOps",
    items: [
      { to: "/app/ppds", icon: Tag, key: "PPDS & ingredients", nav: "labels" },
      { to: "/app/labels", icon: Tag, key: "menu.labels", nav: "labels" },
    ],
  },
  {
    labelKey: "nav.group.assets",
    items: [{ to: "/app/assets", icon: Wrench, key: "menu.assets", nav: "assets" }],
  },

  {
    labelKey: "nav.group.records",
    items: [
      { to: "/app/incidents", icon: AlertOctagon, key: "menu.incidents", nav: "incidents" },
      {
        to: "/app/complaints",
        icon: MessageSquareWarning,
        key: "menu.complaints",
        nav: "complaints",
      },
      { to: "/app/alerts", icon: BellRing, key: "menu.alerts", nav: "alerts" },
      { to: "/app/expiry", icon: CalendarClock, key: "menu.expiry", nav: "expiry" },
      { to: "/app/documents", icon: FileArchive, key: "menu.documents", nav: "documents" },
      { to: "/app/logs", icon: History, key: "menu.logs", nav: "logs" },
    ],
  },
  {
    labelKey: "nav.group.audit",
    items: [
      { to: "/app/audits", icon: ClipboardList, key: "menu.audits", nav: "audits" },
      { to: "/app/inspection", icon: Gavel, key: "menu.audit", nav: "audit" },
      { to: "/app/security", icon: LockKeyhole, key: "menu.security", nav: "security" },
      { to: "/app/support", icon: LifeBuoy, key: "Support centre", nav: "preferences" },
      { to: "/app/preferences", icon: Accessibility, key: "menu.preferences", nav: "preferences" },
      { to: "/app/integrations", icon: PlugZap, key: "menu.integrations", nav: "integrations" },
      { to: "/app/billing", icon: CreditCard, key: "menu.billing", nav: "billing" },
    ],
  },
];

const ALL_ITEMS: NavItem[] = GROUPS.flatMap((g) => g.items);

function AppShell() {
  const { t, lang } = useI18n();
  const { user, signOut, hydrated } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const authRedirectStarted = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQ, setPaletteQ] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem("haccora-nav-groups-v1");
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (hydrated && !user && !authRedirectStarted.current) {
      const protectedPath = pathname.startsWith("/app") ? pathname : "/app";
      authRedirectStarted.current = true;
      navigate({
        to: "/login",
        search: { redirect: protectedPath } as never,
        replace: true,
      });
    } else if (hydrated && user?.platformRole && !user.organizationId) {
      navigate({ to: "/platform", replace: true });
    } else if (hydrated && user?.organizationId && user.serviceStatus !== "active") {
      navigate({ to: "/account-status", replace: true });
    } else if (hydrated && user && !user.organizationId) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [hydrated, user, navigate, pathname]);

  // Inspector-only accounts should never land on the ops dashboard.
  useEffect(() => {
    if (user?.role === "inspector" && pathname === "/app") {
      navigate({ to: "/app/inspection", replace: true });
    }
  }, [user, pathname, navigate]);

  // Enforce role gating on direct URL entry.
  useEffect(() => {
    if (!user) return;
    const PATH_KEY: Array<{ prefix: string; nav: NavKey }> = [
      { prefix: "/app/today", nav: "checks" },
      { prefix: "/app/quick-log", nav: "checks" },
      { prefix: "/app/coach", nav: "dashboard" },
      { prefix: "/app/readiness", nav: "dashboard" },
      { prefix: "/app/get-started", nav: "dashboard" },
      { prefix: "/app/safe-methods", nav: "haccp" },
      { prefix: "/app/ppds", nav: "labels" },
      { prefix: "/app/haccp", nav: "haccp" },
      { prefix: "/app/checks", nav: "checks" },
      { prefix: "/app/temperature", nav: "temperature" },
      { prefix: "/app/cleaning", nav: "cleaning" },
      { prefix: "/app/recipes", nav: "recipes" },
      { prefix: "/app/suppliers", nav: "suppliers" },
      { prefix: "/app/training", nav: "training" },
      { prefix: "/app/inductions", nav: "training" },
      { prefix: "/app/alerts", nav: "alerts" },
      { prefix: "/app/expiry", nav: "expiry" },
      { prefix: "/app/documents", nav: "documents" },
      { prefix: "/app/logs", nav: "logs" },
      { prefix: "/app/inspection", nav: "audit" },
      { prefix: "/app/settings", nav: "settings" },
      { prefix: "/app/organisation", nav: "settings" },
      { prefix: "/app/routines", nav: "routines" },
      { prefix: "/app/menu", nav: "menu" },
      { prefix: "/app/rota", nav: "rota" },
      { prefix: "/app/waste", nav: "waste" },
      { prefix: "/app/stock", nav: "stock" },
      { prefix: "/app/purchasing", nav: "purchasing" },
      { prefix: "/app/assets", nav: "assets" },
      { prefix: "/app/recalls", nav: "recalls" },
      { prefix: "/app/audits", nav: "audits" },
      { prefix: "/app/labels", nav: "labels" },
      { prefix: "/app/incidents", nav: "incidents" },
      { prefix: "/app/goodsin", nav: "goodsin" },
      { prefix: "/app/calibration", nav: "calibration" },
      { prefix: "/app/health", nav: "health" },
      { prefix: "/app/pest", nav: "pest" },
      { prefix: "/app/oil", nav: "oil" },
      { prefix: "/app/complaints", nav: "complaints" },
      { prefix: "/app/chemicals", nav: "chemicals" },
      { prefix: "/app/security", nav: "security" },
      { prefix: "/app/support", nav: "preferences" },
      { prefix: "/app/control-centre", nav: "control" },
      { prefix: "/app/workflows", nav: "workflows" },
      { prefix: "/app/billing", nav: "billing" },
      { prefix: "/app/integrations", nav: "integrations" },
      { prefix: "/app/preferences", nav: "preferences" },
    ];

    const match = PATH_KEY.find(
      (p) => pathname === p.prefix || pathname.startsWith(p.prefix + "/"),
    );
    if (match && !canAccess(user.role, match.nav, user.inspectorScopes)) {
      navigate({ to: homeFor(user.role) as never, replace: true });
    }
  }, [user, pathname, navigate]);

  // Global Cmd/Ctrl+K -> command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setNotifOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visibleGroups = useMemo(() => {
    if (!user) return [];
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => canAccess(user.role, i.nav, user.inspectorScopes)),
    })).filter((g) => g.items.length > 0);
  }, [user]);

  const visibleFlat = useMemo(
    () => (user ? ALL_ITEMS.filter((i) => canAccess(user.role, i.nav, user.inspectorScopes)) : []),
    [user],
  );

  const quickItems = useMemo(() => {
    if (!user) return [];
    const preferred: Record<string, string[]> = {
      staff: ["/app/today", "/app/quick-log", "/app/checks", "/app/temperature", "/app/incidents"],
      chef: ["/app/today", "/app/quick-log", "/app/checks", "/app/temperature", "/app/incidents"],
      manager: [
        "/app/today",
        "/app/coach",
        "/app/control-centre",
        "/app/inspection",
        "/app/readiness",
      ],
      owner: ["/app", "/app/today", "/app/coach", "/app/readiness", "/app/inspection"],
      inspector: ["/app/inspection"],
    };
    const paths = preferred[user.role] ?? preferred.staff;
    return paths
      .map((path) => visibleFlat.find((item) => item.to === path))
      .filter(Boolean) as NavItem[];
  }, [user, visibleFlat]);

  const secondaryGroups = useMemo(() => {
    const quickPaths = new Set(quickItems.map((item) => item.to));
    return visibleGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => !quickPaths.has(item.to)) }))
      .filter((group) => group.items.length > 0);
  }, [quickItems, visibleGroups]);

  const toggleGroup = (labelKey: string) => {
    const next = expandedGroups.includes(labelKey)
      ? expandedGroups.filter((key) => key !== labelKey)
      : [...expandedGroups, labelKey];
    setExpandedGroups(next);
    try {
      window.localStorage.setItem("haccora-nav-groups-v1", JSON.stringify(next));
    } catch {
      // Navigation still works when storage is unavailable.
    }
  };

  const doSignOut = () => {
    signOut();
    navigate({ to: "/login" });
  };

  const current =
    ALL_ITEMS.find((i) =>
      i.exact
        ? pathname === i.to
        : pathname.startsWith(i.to) && (i.to !== "/app" || pathname === "/app"),
    ) ?? ALL_ITEMS.find((i) => !i.exact && pathname.startsWith(i.to));
  const workspaceLabel = [user?.organizationName, user?.location]
    .filter(
      (value, index, values): value is string => Boolean(value) && values.indexOf(value) === index,
    )
    .join(" · ");

  // Notifications — live unread alerts from Supabase, role-scoped by RLS.
  type Notif = {
    id: string;
    sev: "high" | "medium" | "low";
    title: string;
    meta: string;
    to: string;
  };
  const [liveNotifs, setLiveNotifs] = useState<Notif[]>([]);
  useEffect(() => {
    if (!user) return;
    const KIND_TO_ROUTE: Record<string, string> = {
      temperature: "/app/temperature",
      cleaning: "/app/cleaning",
      haccp: "/app/haccp",
      training: "/app/training",
      incident: "/app/incidents",
      expiry: "/app/expiry",
      audit: "/app/audits",
      recall: "/app/recalls",
      asset: "/app/assets",
    };
    const sevMap = (s: string): Notif["sev"] =>
      s === "critical" ? "high" : s === "warning" ? "medium" : "low";
    const load = async () => {
      const { data } = await supabase
        .from("alerts")
        .select("id,kind,severity,title,message,created_at")
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(8);
      setLiveNotifs(
        (data ?? []).map((a: any) => ({
          id: a.id,
          sev: sevMap(a.severity),
          title: a.title,
          meta: a.message ?? new Date(a.created_at).toLocaleString("en-GB"),
          to: KIND_TO_ROUTE[a.kind] ?? "/app/alerts",
        })),
      );
    };
    load();
    const ch = supabase
      .channel("shell-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, lang]);
  const notifs = liveNotifs;

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-secondary/40 text-sm text-muted-foreground">
        …
      </div>
    );
  }

  // Command palette matches over role-allowed items.
  const q = paletteQ.trim().toLowerCase();
  const paletteResults = visibleFlat.filter((i) => !q || t(i.key).toLowerCase().includes(q));

  return (
    <div className="app-shell min-h-screen bg-secondary/40 flex flex-col">
      {/* Active tenant and location context */}
      <div className="sticky top-0 z-40 bg-black text-white text-xs md:text-sm">
        <div className="px-4 md:px-6 h-9 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center rounded-full bg-[color:var(--color-alert-red)] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest shrink-0">
              {"Active workspace"}
            </span>
            <span className="truncate text-white/80 hidden sm:inline">
              {user.organizationName ?? user.location} · {user.location} · {t(`role.${user.role}`)}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/login"
              onClick={() => signOut()}
              className="hidden md:inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold hover:bg-white/10 transition"
            >
              {"Switch account"}
            </Link>
            <button
              onClick={() => {
                signOut();
                navigate({ to: "/" });
              }}
              className="inline-flex items-center gap-1 rounded-full bg-white text-black px-3 py-1 text-[11px] font-bold hover:bg-white/90 transition"
            >
              <LogOut size={12} /> {"Sign out"}
            </button>
          </div>
        </div>
      </div>
      <ExperienceController />

      <div className="flex-1 flex min-h-0">
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card">
          <div className="px-5 h-[4.5rem] flex items-center gap-3 border-b border-border">
            <BrandLogoImage className="h-11 w-auto" />
            <div className="leading-tight min-w-0">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground truncate">
                {t(`role.${user.role}`)}
              </div>
            </div>
          </div>

          <nav className="p-3 flex-1 overflow-y-auto space-y-3" aria-label="Main navigation">
            <div>
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Quick access
              </div>
              {quickItems.map(({ to, icon: Icon, key, exact }) => {
                const active = exact ? pathname === to : pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to as never}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm mb-0.5 transition group relative ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/80 hover:bg-secondary hover:text-foreground"}`}
                  >
                    <Icon
                      size={17}
                      className={active ? "" : "opacity-70 group-hover:opacity-100"}
                    />
                    <span className="flex-1 truncate">{t(key) || key}</span>
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-border pt-2">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                More tools
              </div>
              {secondaryGroups.map((group) => {
                const groupActive = group.items.some((item) =>
                  item.exact ? pathname === item.to : pathname.startsWith(item.to),
                );
                const expanded = expandedGroups.includes(group.labelKey) || groupActive;
                return (
                  <div key={group.labelKey} className="mb-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.labelKey)}
                      aria-expanded={expanded}
                      className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <ChevronRight
                        size={14}
                        className={`transition-transform ${expanded ? "rotate-90" : ""}`}
                      />
                      <span className="flex-1 text-left truncate">{t(group.labelKey)}</span>
                      <span className="text-[10px] font-normal">{group.items.length}</span>
                    </button>
                    {expanded && (
                      <div className="pl-2">
                        {group.items.map(({ to, icon: Icon, key, exact }) => {
                          const active = exact ? pathname === to : pathname.startsWith(to);
                          return (
                            <Link
                              key={to}
                              to={to as never}
                              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs mb-0.5 transition group relative ${
                                active
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                              }`}
                            >
                              <Icon
                                size={16}
                                className={active ? "" : "opacity-70 group-hover:opacity-100"}
                              />
                              <span className="flex-1 truncate">{t(key)}</span>
                              {active && (
                                <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="p-3 border-t border-border space-y-1">
            <button
              onClick={() => setPaletteOpen(true)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            >
              <Search size={16} /> <span className="flex-1 text-left">{t("nav.search")}</span>
              <kbd className="text-[10px] rounded border border-border bg-secondary px-1.5 py-0.5">
                ⌘K
              </kbd>
            </button>
            {canAccess(user.role, "settings", user.inspectorScopes) && (
              <Link
                to="/app/settings"
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  pathname.startsWith("/app/settings")
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Settings size={16} /> {t("menu.settings")}
              </Link>
            )}
            <button
              onClick={doSignOut}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            >
              <LogOut size={16} /> {t("auth.signout")}
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/85 backdrop-blur px-4 md:px-6 flex items-center justify-between gap-3">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground shrink-0"
              >
                <ArrowLeft size={14} />
              </Link>
              <nav
                aria-label="Breadcrumb"
                className="hidden sm:flex items-center gap-1.5 text-sm min-w-0"
              >
                <Link
                  to={homeFor(user.role) as never}
                  className="text-muted-foreground hover:text-foreground truncate"
                >
                  {workspaceLabel || "Haccora workspace"}
                </Link>
                {current && (
                  <>
                    <ChevronRight size={14} className="text-muted-foreground/60 shrink-0" />
                    <span className="font-semibold truncate">{t(current.key)}</span>
                  </>
                )}
              </nav>
            </div>

            {/* Search trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-8 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground hover:bg-secondary transition"
            >
              <Search size={14} />
              <span className="flex-1 text-left">{t("nav.search")}</span>
              <kbd className="text-[10px] rounded border border-border bg-secondary px-1.5 py-0.5 inline-flex items-center gap-0.5">
                <Command size={10} />K
              </kbd>
            </button>

            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              {/* Mobile search */}
              <button
                onClick={() => setPaletteOpen(true)}
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card active:scale-95 transition"
                aria-label={t("nav.search")}
              >
                <Search size={16} />
              </button>
              {/* Notifications */}

              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setMenuOpen(false);
                  }}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:bg-secondary transition"
                  aria-label={t("notif.title")}
                >
                  <Bell size={16} />
                  {notifs.length > 0 && (
                    <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground grid place-items-center">
                      {notifs.length}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                        <div className="font-display text-sm">{t("notif.title")}</div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {notifs.length} {t("notif.new")}
                        </div>
                      </div>
                      <div className="max-h-[26rem] overflow-y-auto divide-y divide-border">
                        {notifs.length === 0 && (
                          <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                            {t("notif.empty")}
                          </div>
                        )}
                        {notifs.map((n) => (
                          <Link
                            key={n.id}
                            to={n.to as never}
                            onClick={() => setNotifOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-secondary transition"
                          >
                            {n.sev === "high" && (
                              <AlertTriangle
                                size={16}
                                className="text-destructive mt-0.5 shrink-0"
                              />
                            )}
                            {n.sev === "medium" && (
                              <Clock
                                size={16}
                                className="text-warning-foreground mt-0.5 shrink-0"
                              />
                            )}
                            {n.sev === "low" && (
                              <CheckCircle2
                                size={16}
                                className="text-muted-foreground mt-0.5 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{n.title}</div>
                              <div className="text-xs text-muted-foreground truncate">{n.meta}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <Link
                        to="/app/inspection"
                        onClick={() => setNotifOpen(false)}
                        className="block px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-secondary border-t border-border"
                      >
                        {t("notif.viewAll")} →
                      </Link>
                    </div>
                  </>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => {
                    setMenuOpen((v) => !v);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 py-1 hover:bg-secondary transition"
                >
                  <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">
                    {user.initials}
                  </span>
                  <span className="hidden sm:block text-left leading-tight">
                    <span className="block text-xs font-bold">{user.name}</span>
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t(`role.${user.role}`)}
                    </span>
                  </span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-border">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {t("auth.signedInAs")}
                        </div>
                        <div className="mt-1 text-sm font-semibold">{user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        <div className="mt-1.5 inline-flex items-center rounded-full bg-[color:var(--color-alert-red)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--color-alert-red)]">
                          {t(`role.${user.role}`)}
                        </div>
                      </div>
                      {canAccess(user.role, "settings", user.inspectorScopes) && (
                        <Link
                          to="/app/settings"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary"
                        >
                          <Settings size={14} /> {t("menu.settings")}
                        </Link>
                      )}
                      <Link
                        to="/login"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary"
                      >
                        <Users size={14} /> {t("auth.switch")}
                      </Link>
                      <button
                        onClick={doSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[color:var(--color-alert-red)] hover:bg-secondary"
                      >
                        <LogOut size={14} /> {t("auth.signout")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {user.serviceStatus === "active" && user.serviceStatusReason?.startsWith("[billing]") && (
            <div
              role="alert"
              className="flex flex-col gap-2 border-b border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between md:px-6"
            >
              <span>{user.serviceStatusReason.replace(/^\[billing\]\s*/, "")}</span>
              {user.role === "owner" ? (
                <Link to="/app/billing" className="shrink-0 font-bold underline">
                  Resolve payment
                </Link>
              ) : (
                <span className="shrink-0 font-semibold">Ask the tenant owner to resolve it.</span>
              )}
            </div>
          )}

          <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 pb-tabbar md:pb-0">
            <Outlet />
          </main>

          <MobileBottomNav
            visibleFlat={visibleFlat}
            visibleGroups={visibleGroups}
            pathname={pathname}
            t={t}
          />
        </div>
      </div>

      {/* Command palette */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm grid place-items-start pt-[10vh] px-4"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 border-b border-border">
              <Search size={16} className="text-muted-foreground" />
              <input
                autoFocus
                value={paletteQ}
                onChange={(e) => setPaletteQ(e.target.value)}
                placeholder={t("palette.placeholder")}
                className="flex-1 py-4 bg-transparent outline-none text-sm"
              />
              <kbd className="text-[10px] rounded border border-border bg-secondary px-1.5 py-0.5">
                ESC
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto py-2">
              {paletteResults.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("palette.empty")}
                </div>
              )}
              {paletteResults.map(({ to, icon: Icon, key }) => (
                <button
                  key={to}
                  onClick={() => {
                    setPaletteOpen(false);
                    setPaletteQ("");
                    navigate({ to: to as never });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary transition"
                >
                  <Icon size={16} className="text-muted-foreground" />
                  <span className="flex-1 text-left">{t(key)}</span>
                  <ChevronRight size={14} className="text-muted-foreground/60" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileBottomNav({
  visibleFlat,
  visibleGroups,
  pathname,
  t,
}: {
  visibleFlat: NavItem[];
  visibleGroups: NavGroup[];
  pathname: string;
  t: (k: string) => string;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  // Preferred order for the 4 pinned tabs; fall back to whatever the role has.
  const PREFERRED = ["/app", "/app/today", "/app/quick-log", "/app/alerts", "/app/inspection"];
  const pinned: NavItem[] = [];
  for (const p of PREFERRED) {
    const item = visibleFlat.find((i) => i.to === p);
    if (item && pinned.length < 4) pinned.push(item);
  }
  // Backfill from visibleFlat if role has fewer preferred routes.
  for (const item of visibleFlat) {
    if (pinned.length >= 4) break;
    if (!pinned.find((p) => p.to === item.to)) pinned.push(item);
  }

  return (
    <>
      <nav
        aria-label="Primary"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 grid touch-native border-t border-border bg-card/95 backdrop-blur-md pb-safe shadow-[0_-6px_24px_-12px_rgba(0,0,0,0.25)]"
        style={{ gridTemplateColumns: `repeat(${pinned.length + 1}, minmax(0, 1fr))` }}
      >
        {pinned.map(({ to, icon: Icon, key, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          const primary = to === "/app/quick-log";
          return (
            <Link
              key={to}
              to={to as never}
              aria-current={active ? "page" : undefined}
              className={`relative min-h-14 px-1 pt-2 pb-1.5 flex flex-col items-center justify-center gap-1 text-[10px] font-bold leading-none transition active:scale-[0.94] ${
                primary
                  ? "text-[color:var(--color-alert-red)]"
                  : active
                    ? "text-primary"
                    : "text-muted-foreground"
              }`}
            >
              {active && !primary && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
              )}
              <span
                className={
                  primary
                    ? "-mt-6 grid h-12 w-14 place-items-center rounded-2xl bg-[color:var(--color-alert-red)] text-white shadow-lg ring-4 ring-card"
                    : `grid h-7 w-11 place-items-center rounded-full transition-colors ${active ? "bg-primary/10" : ""}`
                }
              >
                <Icon size={primary ? 22 : 19} strokeWidth={active || primary ? 2.5 : 2} />
              </span>
              <span className="w-full truncate text-center">{t(key)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={`min-h-14 px-1 pt-2 pb-1.5 flex flex-col items-center justify-center gap-1 text-[10px] font-bold leading-none transition active:scale-[0.94] ${
            moreOpen ? "text-primary" : "text-muted-foreground"
          }`}
          aria-label={t("nav.more")}
        >
          <span
            className={`grid h-7 w-11 place-items-center rounded-full transition-colors ${moreOpen ? "bg-primary/10" : ""}`}
          >
            <ChevronDown size={19} strokeWidth={moreOpen ? 2.5 : 2} className="rotate-180" />
          </span>
          <span className="w-full truncate text-center">{t("nav.more")}</span>
        </button>
      </nav>

      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
          role="presentation"
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-3xl bg-card border-t border-border pb-safe touch-native shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.more")}
          >
            <div className="sticky top-0 bg-card border-b border-border">
              <div className="flex justify-center pt-2.5">
                <span className="h-1.5 w-10 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between px-5 pb-3 pt-2">
                <div className="font-display text-lg">{t("nav.more")}</div>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground active:scale-95 transition"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-4 space-y-5">
              {visibleGroups.map((g) => (
                <div key={g.labelKey}>
                  <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {t(g.labelKey)}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {g.items.map(({ to, icon: Icon, key, exact }) => {
                      const active = exact ? pathname === to : pathname.startsWith(to);
                      return (
                        <Link
                          key={to}
                          to={to as never}
                          onClick={() => setMoreOpen(false)}
                          className={`flex min-h-12 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition active:scale-[0.97] touch-native ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border bg-secondary/40 text-foreground hover:bg-secondary"
                          }`}
                        >
                          <Icon size={16} className="shrink-0" />
                          <span className="truncate">{t(key)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
