import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
  const workspace = useSession();
  const { session, loading, workspaceReady, serviceStatus, role } = workspace;
  const { organizationId, locationId } = workspace;
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  if (serviceStatus !== "active") return <Redirect href="/account-status" />;
  if (role === "inspector") return <Redirect href="/inspection-readiness" />;
  if (!organizationId || !locationId) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.intro}>Select a site to review your alerts.</Text>
      </View>
    );
  }
  return (
    <SiteAlerts
      key={`${session.user.id}:${organizationId}:${locationId}:${role}`}
      userId={session.user.id}
      organizationId={organizationId}
      locationId={locationId}
    />
  );
}

type Scope = { userId: string; organizationId: string; locationId: string };

function alertDate(value: string) {
  return new Date(value).toLocaleString("en-GB", { timeZone: "Europe/London" });
}

function SiteAlerts({ userId, organizationId, locationId }: Scope) {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [filter, setFilter] = useState<"unread" | "all" | "critical">("unread");
  const [refresh, setRefresh] = useState(0);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const [live, setLive] = useState(false);
  const focused = useRef(false);
  const writeLock = useRef(false);
  const viewKey = `${filter}:${refresh}`;
  const available = !refreshing && !error && loadedKey === viewKey;
  const refreshInbox = useCallback(() => {
    setRefreshing(true);
    setRefresh((value) => value + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      focused.current = true;
      setLive(false);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const scheduleRefresh = () => {
        if (!active || !focused.current || timer !== undefined) return;
        timer = setTimeout(() => {
          timer = undefined;
          if (active && focused.current) refreshInbox();
        }, 600);
      };
      const channel = supabase
        .channel(`native-alert-inbox-${userId}-${locationId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "alerts",
            filter: `user_id=eq.${userId}`,
          },
          scheduleRefresh,
        )
        .subscribe((status) => {
          if (!active || !focused.current) return;
          setLive(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") scheduleRefresh();
        });
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") scheduleRefresh();
      });
      return () => {
        active = false;
        focused.current = false;
        if (timer !== undefined) clearTimeout(timer);
        subscription.remove();
        void supabase.removeChannel(channel);
      };
    }, [userId, locationId, refreshInbox]),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setRefreshing(true);
      setError("");
      setLoadedKey("");
      setRows([]);
      const scope = `location_id.eq.${locationId},location_id.is.null`;
      async function load() {
        try {
          let query = supabase
            .from("alerts")
            .select("id,kind,severity,title,message,read_at,created_at", { count: "exact" })
            .eq("organization_id", organizationId)
            .eq("user_id", userId)
            .or(scope)
            .order("created_at", { ascending: false })
            .order("id")
            .limit(100);
          if (filter === "unread") query = query.is("read_at", null);
          if (filter === "critical") query = query.eq("severity", "critical");
          const [list, count] = await Promise.all([
            query,
            supabase
              .from("alerts")
              .select("id", { count: "exact", head: true })
              .eq("organization_id", organizationId)
              .eq("user_id", userId)
              .or(scope)
              .is("read_at", null),
          ]);
          if (!active) return;
          if (
            list.error ||
            !list.data ||
            list.count === null ||
            count.error ||
            count.count === null
          ) {
            throw new Error("Alert evidence unavailable");
          }
          setRows(list.data as AlertRow[]);
          setTotal(list.count);
          setUnread(count.count);
          setLoadedKey(viewKey);
        } catch {
          if (!active) return;
          setError("Alerts could not be verified. Refresh before relying on this inbox.");
          setRows([]);
          setTotal(0);
          setUnread(0);
        } finally {
          if (active) setRefreshing(false);
        }
      }
      void load();
      return () => {
        active = false;
      };
    }, [filter, locationId, organizationId, userId, viewKey]),
  );

  const unreadInView = rows.filter((row) => !row.read_at);
  const markRead = async (ids: string[]) => {
    if (!focused.current || !available || writeLock.current || !ids.length) return;
    const visibleIds = new Set(unreadInView.map((row) => row.id));
    if (ids.some((id) => !visibleIds.has(id))) return;
    writeLock.current = true;
    setBusy(true);
    setNotice("");
    try {
      const { data, error: writeError } = await supabase
        .from("alerts")
        .update({ read_at: new Date().toISOString() })
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .or(`location_id.eq.${locationId},location_id.is.null`)
        .in("id", ids)
        .is("read_at", null)
        .select("id,read_at");
      const confirmed = new Set((data ?? []).filter((row) => row.read_at).map((row) => row.id));
      if (writeError || ids.some((id) => !confirmed.has(id))) {
        throw new Error("Read status not fully confirmed");
      }
      if (focused.current) setNotice("Read status saved.");
    } catch {
      if (focused.current) {
        setNotice("Not all read statuses were confirmed. Review the refreshed inbox.");
      }
    } finally {
      writeLock.current = false;
      setBusy(false);
      if (focused.current) refreshInbox();
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshInbox} />}
    >
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>ACTION INBOX</Text>
          <Text style={styles.title}>Alerts</Text>
          <Text style={styles.intro}>
            {available ? `${unread} unread at this site` : "Unread unavailable"}
          </Text>
          <Text style={styles.intro}>
            {live ? "Live channel connected" : "Live updates unavailable — pull to refresh"}
          </Text>
        </View>
        {available && unreadInView.length > 0 && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={styles.readAll}
            onPress={() => void markRead(unreadInView.map((row) => row.id))}
          >
            <Text style={styles.readAllText}>Read visible</Text>
          </Pressable>
        )}
      </View>
      {notice ? (
        <Text accessibilityRole="alert" style={styles.intro}>
          {notice}
        </Text>
      ) : null}
      <View style={styles.filters}>
        {(["unread", "all", "critical"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === value, disabled: busy }}
            disabled={busy}
            style={[styles.filter, filter === value && styles.filterActive]}
            onPress={() => setFilter(value)}
          >
            <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
              {value[0].toUpperCase() + value.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? (
        <View style={styles.empty}>
          <Text accessibilityRole="alert" style={styles.intro}>
            {error}
          </Text>
          <Pressable accessibilityRole="button" onPress={refreshInbox} style={styles.readAll}>
            <Text style={styles.readAllText}>Retry loading</Text>
          </Pressable>
        </View>
      ) : null}
      {available && (
        <Text style={styles.intro}>
          Showing {rows.length} of {total} matching alerts. Read status is not resolution.
        </Text>
      )}
      {(available ? rows : []).map((row) => {
        const colour =
          row.severity === "critical"
            ? styles.critical
            : row.severity === "warning"
              ? styles.warning
              : styles.info;
        return (
          <View key={row.id} style={[styles.card, row.read_at && styles.read]}>
            <View style={[styles.severity, colour]} />
            <View style={styles.flex}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${row.severity} alert: ${row.title}`}
                onPress={() => router.push((routes[row.kind] || "/actions") as never)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.kind}>{row.kind.replaceAll("_", " ")}</Text>
                  {!row.read_at && <Text style={styles.newBadge}>NEW</Text>}
                </View>
                <Text style={styles.cardTitle}>{row.title}</Text>
                {row.message && <Text style={styles.message}>{row.message}</Text>}
                <Text style={styles.date}>{alertDate(row.created_at)}</Text>
              </Pressable>
              {!row.read_at && (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => void markRead([row.id])}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text style={styles.newBadge}>Mark read</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        );
      })}
      {available && rows.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No matching alerts</Text>
          <Text style={styles.intro}>Review source records for outstanding safety actions.</Text>
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
