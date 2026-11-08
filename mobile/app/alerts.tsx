import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

type AlertRow = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  message: string | null;
  read_at: string | null;
  created_at: string;
};

const routes: Record<string, string> = {
  temperature: "/temperature",
  cleaning: "/checks",
  haccp: "/safe-methods",
  training: "/training",
  incident: "/incidents",
  expiry: "/documents",
  audit: "/inspection-readiness",
  recall: "/actions",
};

export default function Alerts() {
  const { session, loading } = useSession();
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [filter, setFilter] = useState<"unread" | "all" | "critical">("unread");
  const [refreshing, setRefreshing] = useState(false);
  const [readState, setReadState] = useState<"loading" | "ready" | "unavailable">("loading");
  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    const current = ++requestVersion.current;
    setReadState("loading");
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("alerts")
        .select("id,kind,severity,title,message,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (current !== requestVersion.current) return;
      if (error || !Array.isArray(data)) throw new Error("Alert records unavailable");
      setRows(data as AlertRow[]);
      setReadState("ready");
    } catch {
      if (current === requestVersion.current) {
        setRows([]);
        setReadState("unavailable");
      }
    } finally {
      if (current === requestVersion.current) setRefreshing(false);
    }
  }, []);
  const accountId = session?.user.id;
  useEffect(() => {
    if (!accountId) return;
    let active = true;
    void load();
    const channel = supabase
      .channel("native-alert-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
        if (active) void load();
      })
      .subscribe();
    return () => {
      active = false;
      requestVersion.current += 1;
      void supabase.removeChannel(channel);
    };
  }, [accountId, load]);
  const visible = useMemo(
    () =>
      rows.filter((row) =>
        filter === "all" ? true : filter === "unread" ? !row.read_at : row.severity === "critical",
      ),
    [filter, rows],
  );
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  const markRead = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("alerts")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error || !data?.id) throw new Error("No confirmed update");
      void load();
    } catch {
      Alert.alert(
        "Read status not confirmed",
        "Check your connection and refresh the alert inbox.",
      );
    }
  };
  const markAllRead = async () => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (error) throw error;
      void load();
    } catch {
      Alert.alert(
        "Read status not confirmed",
        "Some alerts may still be unread. Refresh and retry.",
      );
    }
  };
  const open = async (row: AlertRow) => {
    if (!row.read_at) await markRead(row.id);
    router.push((routes[row.kind] || "/actions") as never);
  };
  const unread = rows.filter((row) => !row.read_at).length;
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>ACTION INBOX</Text>
          <Text style={styles.title}>Alerts</Text>
          <Text style={styles.intro}>
            {readState === "ready"
              ? `${unread} unread · latest 100 records · refresh to verify`
              : readState === "loading"
                ? "Loading alert records…"
                : "Alert records unavailable"}
          </Text>
        </View>
        {readState === "ready" && unread > 0 && (
          <Pressable style={styles.readAll} onPress={() => void markAllRead()}>
            <Text style={styles.readAllText}>Read all</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.filters}>
        {(["unread", "all", "critical"] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.filter, filter === value && styles.filterActive]}
            onPress={() => setFilter(value)}
          >
            <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
              {value[0].toUpperCase() + value.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      {readState === "loading" && (
        <View style={styles.empty} accessibilityLiveRegion="polite">
          <Text style={styles.intro}>Checking the current alert inbox…</Text>
        </View>
      )}
      {readState === "unavailable" && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle} accessibilityRole="alert">
            Alert records unavailable
          </Text>
          <Text style={styles.intro}>
            No all-clear conclusion can be drawn from unavailable records.
          </Text>
          <Pressable accessibilityRole="button" style={styles.readAll} onPress={() => void load()}>
            <Text style={styles.readAllText}>Retry alert records</Text>
          </Pressable>
        </View>
      )}
      {readState === "ready" && visible.map((row) => {
        const colour =
          row.severity === "critical"
            ? styles.critical
            : row.severity === "warning"
              ? styles.warning
              : styles.info;
        return (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            accessibilityLabel={`${row.severity} alert: ${row.title}`}
            style={[styles.card, row.read_at && styles.read]}
            onPress={() => void open(row)}
          >
            <View style={[styles.severity, colour]} />
            <View style={styles.flex}>
              <View style={styles.cardHeader}>
                <Text style={styles.kind}>{row.kind.replaceAll("_", " ")}</Text>
                {!row.read_at && <Text style={styles.newBadge}>NEW</Text>}
              </View>
              <Text style={styles.cardTitle}>{row.title}</Text>
              {row.message && <Text style={styles.message}>{row.message}</Text>}
              <Text style={styles.date}>{new Date(row.created_at).toLocaleString("en-GB")}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        );
      })}
      {readState === "ready" && visible.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No alerts recorded in this view</Text>
          <Text style={styles.intro}>
            This is not a food-safety clearance. The latest 100 records were checked.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { gap: 11, padding: 18, paddingBottom: 90 },
  headerRow: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  flex: { flex: 1 },
  eyebrow: { color: "#c8102e", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { fontSize: 22, fontWeight: "800", marginTop: 3 },
  intro: { color: "#666", fontSize: 12, lineHeight: 17, marginTop: 3 },
  readAll: { backgroundColor: "#111", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  readAllText: { color: "white", fontSize: 11, fontWeight: "800" },
  filters: { flexDirection: "row", gap: 7, marginVertical: 3 },
  filter: {
    borderColor: "#ccc",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  filterActive: { backgroundColor: "#111", borderColor: "#111" },
  filterText: { color: "#555", fontSize: 11, fontWeight: "800" },
  filterTextActive: { color: "white" },
  card: {
    alignItems: "flex-start",
    backgroundColor: "white",
    borderColor: "#ddd",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    overflow: "hidden",
    padding: 14,
  },
  read: { opacity: 0.68 },
  severity: { alignSelf: "stretch", borderRadius: 99, width: 4 },
  critical: { backgroundColor: "#c8102e" },
  warning: { backgroundColor: "#d68a00" },
  info: { backgroundColor: "#3f6f8f" },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 7 },
  kind: {
    color: "#777",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  newBadge: { color: "#087a2a", fontSize: 9, fontWeight: "900" },
  cardTitle: { fontSize: 14, fontWeight: "800", marginTop: 4 },
  message: { color: "#555", fontSize: 11, lineHeight: 16, marginTop: 3 },
  date: { color: "#888", fontSize: 9, marginTop: 6 },
  chevron: { color: "#888", fontSize: 24, lineHeight: 25 },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "800" },
});
