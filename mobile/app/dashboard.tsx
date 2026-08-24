import { Redirect, router } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  LayoutGrid,
  MapPin,
  ScanLine,
  Sparkles,
  Thermometer,
  Truck,
  Wheat,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { getQueueStatus } from "@/lib/offline-queue";
import { cardShadow, colours, screen } from "@/lib/theme";

type Today = {
  done: number;
  open: number;
  actions: number;
  alerts: number;
  expiring: number;
};

type QuickTool = {
  title: string;
  body: string;
  route: string;
  icon: LucideIcon;
  permission?: string;
};

const QUICK_TOOLS: QuickTool[] = [
  {
    title: "Temperature",
    body: "Fridge, cooking or cooling",
    route: "/temperature",
    icon: Thermometer,
  },
  {
    title: "Daily checks",
    body: "Opening, routines and closing",
    route: "/checks",
    icon: ClipboardCheck,
  },
  {
    title: "Delivery",
    body: "Accept or reject goods",
    route: "/goods-in",
    icon: Truck,
    permission: "purchasing.receive",
  },
  { title: "Cleaning", body: "Complete the site schedule", route: "/cleaning", icon: Sparkles },
  { title: "Allergens", body: "Check the live dish register", route: "/allergens", icon: Wheat },
  {
    title: "Scan equipment",
    body: "Open its trusted history",
    route: "/scan-asset",
    icon: ScanLine,
    permission: "assets.record",
  },
];

export default function Dashboard() {
  const {
    session,
    workspaceReady,
    role,
    roleName,
    displayName,
    organizationName,
    locationName,
    serviceStatus,
    actionPermissions,
    loading,
  } = useSession();
  const network = useNetInfo();
  const [pending, setPending] = useState(0);
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">("loading");
  const [today, setToday] = useState<Today>({
    done: 0,
    open: 0,
    actions: 0,
    alerts: 0,
    expiring: 0,
  });

  useEffect(() => {
    void getQueueStatus().then((status) => setPending(status.pending));
  }, [network.isConnected]);

  useEffect(() => {
    if (!session || !workspaceReady) return;
    setDataState("loading");
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const inSevenDays = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    void Promise.all([
      supabase
        .from("checks")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", start.toISOString()),
      supabase
        .from("checks")
        .select("id", { count: "exact", head: true })
        .neq("status", "completed")
        .gte("created_at", start.toISOString()),
      supabase
        .from("corrective_actions")
        .select("id", { count: "exact", head: true })
        .neq("status", "closed"),
      supabase.from("alerts").select("id", { count: "exact", head: true }).is("read_at", null),
      supabase
        .from("expiry_items")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .lte("expires_on", inSevenDays),
    ]).then(([done, open, actions, alerts, expiring]) => {
      if ([done, open, actions, alerts, expiring].some((result) => result.error)) {
        setDataState("error");
        return;
      }
      setToday({
        done: done.count ?? 0,
        open: open.count ?? 0,
        actions: actions.count ?? 0,
        alerts: alerts.count ?? 0,
        expiring: expiring.count ?? 0,
      });
      setDataState("ready");
    });
  }, [session, workspaceReady]);

  const progress = useMemo(() => {
    const total = today.done + today.open;
    return total ? Math.round((today.done / total) * 100) : 0;
  }, [today.done, today.open]);

  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  if (serviceStatus !== "active") return <Redirect href="/account-status" />;
  if (role === "inspector") return <Redirect href="/inspection-readiness" />;

  const firstName = displayName?.trim().split(/\s+/)[0] || "team";
  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const priority = today.open
    ? {
        title: `${today.open} daily check${today.open === 1 ? "" : "s"} to complete`,
        body: "Finish the due routine and add corrective action for anything unsafe.",
        route: "/checks",
      }
    : today.actions
      ? {
          title: `${today.actions} corrective action${today.actions === 1 ? "" : "s"} to review`,
          body: "Resolve the exception and leave a clear, attributable record.",
          route: "/actions",
        }
      : {
          title: "Log the next temperature reading",
          body: "Your scheduled checks are clear. Keep the next reading quick and traceable.",
          route: "/temperature",
        };
  const focus = {
    owner: {
      label: "BUSINESS OVERVIEW",
      body: "Active-premises routines, team completion and exceptions requiring attention.",
      progress: "WORKSPACE ROUTINES",
    },
    manager: {
      label: "SHIFT CONTROL",
      body: "Today's due checks, corrective actions and operational alerts.",
      progress: "SHIFT ROUTINES",
    },
    chef: {
      label: "KITCHEN CONTROL",
      body: "Temperature, cleaning, delivery and allergen records for service.",
      progress: "KITCHEN ROUTINES",
    },
    staff: {
      label: "MY SHIFT",
      body: "Your due routines and fastest logging tools for today's work.",
      progress: "MY ROUTINES",
    },
  }[role ?? "staff"] ?? {
    label: "TODAY",
    body: "Due routines and operational alerts for your workspace.",
    progress: "TODAY'S ROUTINES",
  };
  const quickTools = QUICK_TOOLS.filter(
    (tool) => !tool.permission || actionPermissions.includes(tool.permission),
  ).sort((left, right) => {
    const preferred: Record<string, string[]> = {
      owner: ["Daily checks", "Temperature", "Scan equipment", "Delivery", "Cleaning", "Allergens"],
      manager: [
        "Daily checks",
        "Temperature",
        "Cleaning",
        "Delivery",
        "Scan equipment",
        "Allergens",
      ],
      chef: ["Temperature", "Delivery", "Allergens", "Cleaning", "Daily checks", "Scan equipment"],
      staff: ["Daily checks", "Temperature", "Cleaning", "Allergens", "Scan equipment", "Delivery"],
    };
    const order = preferred[role ?? "staff"] ?? preferred.staff;
    return order.indexOf(left.title) - order.indexOf(right.title);
  });

  return (
    <ScrollView
      style={styles.canvas}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brandRow}>
        <BrandLogo maxWidth={132} minWidth={112} />
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{roleName || role || "team"}</Text>
        </View>
      </View>

      <Text style={styles.eyebrow}>{date.toUpperCase()}</Text>
      <Text style={styles.title}>Good day, {firstName}.</Text>
      <View style={styles.locationRow}>
        <MapPin color={colours.subtle} size={14} strokeWidth={2.2} />
        <Text numberOfLines={1} style={styles.location}>
          {[organizationName, locationName].filter(Boolean).join(" · ") || "Your Haccora workspace"}
        </Text>
      </View>

      <View style={styles.roleFocus}>
        <Text style={styles.roleFocusLabel}>{focus.label}</Text>
        <Text style={styles.roleFocusBody}>{focus.body}</Text>
      </View>

      <View style={[styles.sync, network.isConnected === false && styles.syncOffline]}>
        {network.isConnected === false ? (
          <WifiOff color={colours.warning} size={16} />
        ) : (
          <Wifi color={colours.success} size={16} />
        )}
        <View style={styles.flex}>
          <Text style={styles.syncTitle}>
            {network.isConnected === false
              ? "Working offline"
              : pending
                ? "Syncing securely"
                : "Up to date"}
          </Text>
          <Text style={styles.syncBody}>
            {network.isConnected === false
              ? `${pending} change${pending === 1 ? "" : "s"} securely queued on this device`
              : pending
                ? `${pending} queued change${pending === 1 ? "" : "s"} being sent`
                : "server confirmed · saved to your workspace"}
          </Text>
        </View>
      </View>

      {dataState === "error" && (
        <View accessibilityRole="alert" style={styles.dataError}>
          <AlertTriangle color={colours.danger} size={19} />
          <View style={styles.flex}>
            <Text style={styles.dataErrorTitle}>Dashboard data is unavailable</Text>
            <Text style={styles.dataErrorBody}>
              No routine, alert or corrective action has been assumed clear. Check the source
              records when the connection is restored.
            </Text>
          </View>
        </View>
      )}

      {dataState === "loading" && (
        <View style={styles.loadingCard}>
          <Text style={styles.syncBody}>Loading current workspace records…</Text>
        </View>
      )}

      {dataState === "ready" && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.cardEyebrow}>{focus.progress}</Text>
              <Text style={styles.progressTitle}>
                {today.done + today.open === 0 ? "No routines recorded" : `${progress}% complete`}
              </Text>
            </View>
            <View style={styles.doneBadge}>
              <CheckCircle2 color={colours.success} size={16} />
              <Text style={styles.doneText}>{today.done} done</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressMeta}>
            {today.open ? `${today.open} still due` : "No due routine is waiting"} · {today.actions}{" "}
            open action
            {today.actions === 1 ? "" : "s"}
          </Text>
        </View>
      )}

      {dataState === "ready" && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Next required action: ${priority.title}`}
          style={({ pressed }) => [styles.priority, pressed && styles.pressed]}
          onPress={() => router.push(priority.route)}
        >
          <View style={styles.priorityTop}>
            <Text style={styles.priorityLabel}>NEXT REQUIRED ACTION</Text>
            <ChevronRight color="#ffffff" size={20} />
          </View>
          <Text style={styles.priorityTitle}>{priority.title}</Text>
          <Text style={styles.priorityBody}>{priority.body}</Text>
        </Pressable>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick log</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/quick-log")}>
          <Text style={styles.sectionLink}>All logging tools</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {quickTools.map((tool) => (
          <QuickCard key={tool.route} tool={tool} />
        ))}
      </View>

      {dataState === "ready" && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Needs attention</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push("/alerts")}>
              <Text style={styles.sectionLink}>Open inbox</Text>
            </Pressable>
          </View>
          <View style={styles.metrics}>
            <Metric
              icon={BellRing}
              label="Unread alerts"
              value={today.alerts}
              tone={today.alerts ? "danger" : "quiet"}
            />
            <Metric
              icon={ClipboardCheck}
              label="Corrective actions"
              value={today.actions}
              tone={today.actions ? "danger" : "quiet"}
            />
            <Metric
              icon={LayoutGrid}
              label="Expiring in 7 days"
              value={today.expiring}
              tone={today.expiring ? "warning" : "quiet"}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function QuickCard({ tool }: { tool: QuickTool }) {
  const Icon = tool.icon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tool.title}. ${tool.body}`}
      onPress={() => router.push(tool.route)}
      style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
    >
      <View style={styles.quickIcon}>
        <Icon color={colours.brand} size={19} strokeWidth={2.4} />
      </View>
      <Text style={styles.quickTitle}>{tool.title}</Text>
      <Text style={styles.quickBody}>{tool.body}</Text>
    </Pressable>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: "danger" | "warning" | "quiet";
}) {
  const colour =
    tone === "danger" ? colours.danger : tone === "warning" ? colours.warning : colours.success;
  return (
    <View style={styles.metric}>
      <Icon color={colour} size={17} strokeWidth={2.3} />
      <Text style={[styles.metricValue, { color: colour }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { backgroundColor: colours.canvas },
  page: { ...screen, gap: 12 },
  flex: { flex: 1 },
  brandRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rolePill: {
    backgroundColor: colours.brandSoft,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleText: { color: colours.brand, fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  eyebrow: {
    color: colours.brand,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 4,
  },
  title: {
    color: colours.ink,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  locationRow: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: -5 },
  location: { color: colours.muted, flex: 1, fontSize: 11.5, fontWeight: "600" },
  roleFocus: {
    backgroundColor: colours.brandSoft,
    borderColor: `${colours.brand}24`,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
    padding: 12,
  },
  roleFocusLabel: {
    color: colours.brand,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  roleFocusBody: { color: colours.ink, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  sync: {
    alignItems: "center",
    backgroundColor: colours.successSoft,
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    padding: 11,
  },
  syncOffline: { backgroundColor: colours.warningSoft },
  syncTitle: { color: colours.ink, fontSize: 11.5, fontWeight: "800" },
  syncBody: { color: colours.muted, fontSize: 9.5, lineHeight: 14, marginTop: 1 },
  dataError: {
    alignItems: "flex-start",
    backgroundColor: "#fff1f0",
    borderColor: "#f3b7b0",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 13,
  },
  dataErrorTitle: { color: colours.danger, fontSize: 12, fontWeight: "900" },
  dataErrorBody: { color: colours.muted, fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  loadingCard: {
    ...cardShadow,
    backgroundColor: colours.card,
    borderColor: colours.line,
    borderRadius: 13,
    borderWidth: 1,
    padding: 16,
  },
  progressCard: {
    ...cardShadow,
    backgroundColor: colours.card,
    borderColor: colours.line,
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
  },
  progressHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardEyebrow: { color: colours.subtle, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  progressTitle: { color: colours.ink, fontSize: 18, fontWeight: "900", marginTop: 3 },
  doneBadge: {
    alignItems: "center",
    backgroundColor: colours.successSoft,
    borderRadius: 99,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  doneText: { color: colours.success, fontSize: 10, fontWeight: "900" },
  progressTrack: {
    backgroundColor: "#ecebe7",
    borderRadius: 99,
    height: 7,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: { backgroundColor: colours.success, borderRadius: 99, height: "100%" },
  progressMeta: { color: colours.muted, fontSize: 10, fontWeight: "600", marginTop: 8 },
  priority: { ...cardShadow, backgroundColor: colours.ink, borderRadius: 17, padding: 16 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  priorityTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  priorityLabel: { color: "#ff9ca9", fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  priorityTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 7,
  },
  priorityBody: { color: "#c9c7c2", fontSize: 10.5, lineHeight: 15, marginTop: 5 },
  sectionHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  sectionTitle: { color: colours.ink, fontSize: 14, fontWeight: "900" },
  sectionLink: { color: colours.brand, fontSize: 10, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickCard: {
    backgroundColor: colours.card,
    borderColor: colours.line,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 112,
    padding: 12,
    width: "48.7%",
  },
  quickIcon: {
    alignItems: "center",
    backgroundColor: colours.brandSoft,
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    marginBottom: 9,
    width: 34,
  },
  quickTitle: { color: colours.ink, fontSize: 12.5, fontWeight: "900" },
  quickBody: { color: colours.muted, fontSize: 9.5, lineHeight: 13, marginTop: 3 },
  metrics: { flexDirection: "row", gap: 7 },
  metric: {
    alignItems: "center",
    backgroundColor: colours.card,
    borderColor: colours.line,
    borderRadius: 13,
    borderWidth: 1,
    flex: 1,
    minHeight: 98,
    padding: 10,
  },
  metricValue: { fontSize: 19, fontWeight: "900", marginTop: 4 },
  metricLabel: {
    color: colours.muted,
    fontSize: 8.5,
    fontWeight: "700",
    lineHeight: 12,
    marginTop: 2,
    textAlign: "center",
  },
});
