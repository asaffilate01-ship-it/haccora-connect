import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { operationalDate, operationalDay } from "@/lib/operational-day";

type Priority = { label: string; detail: string; path: string; urgent?: boolean };

export default function Coach() {
  const workspace = useSession();
  const { session, workspaceReady, loading, role, serviceStatus } = workspace;
  const { organizationId, locationId } = workspace;
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  if (serviceStatus !== "active") return <Redirect href="/account-status" />;
  if (role === "inspector") return <Redirect href="/inspection-readiness" />;
  if (!organizationId || !locationId) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>Compliance coach</Text>
        <Text style={styles.intro}>Select a site to review its evidence priorities.</Text>
      </View>
    );
  }
  return (
    <SiteCoach
      key={`${session.user.id}:${organizationId}:${locationId}:${role}`}
      organizationId={organizationId}
      locationId={locationId}
    />
  );
}

function SiteCoach({ organizationId, locationId }: { organizationId: string; locationId: string }) {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [checks, setChecks] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [day, setDay] = useState(() => operationalDate(new Date(), "Europe/London"));
  const [loadedDay, setLoadedDay] = useState("");
  const available = !loading && !error && loadedDay === day;

  const refreshEvidence = useCallback(() => {
    setLoading(true);
    setLoadedDay("");
    setDay(operationalDate(new Date(), "Europe/London"));
    setRefresh((value) => value + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshEvidence();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") refreshEvidence();
      });
      const timer = setInterval(() => {
        if (AppState.currentState === "active") {
          setDay(operationalDate(new Date(), "Europe/London"));
        }
      }, 60_000);
      return () => {
        subscription.remove();
        clearInterval(timer);
      };
    }, [refreshEvidence]),
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setChecks(null);
    setPriorities([]);
    const period = operationalDay(new Date(day + "T12:00:00Z"), "Europe/London");
    const count = { count: "exact" as const, head: true };
    void Promise.all([
      supabase
        .from("checks")
        .select("id", count)
        .eq("organization_id", organizationId)
        .eq("location_id", locationId)
        .neq("status", "completed")
        .gte("created_at", period.start)
        .lt("created_at", period.end),
      supabase
        .from("corrective_actions")
        .select("id,description,severity,due_at")
        .eq("organization_id", organizationId)
        .eq("location_id", locationId)
        .not("status", "in", '("verified","closed")')
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("id")
        .limit(6),
      supabase
        .from("temperature_logs")
        .select("id", count)
        .eq("organization_id", organizationId)
        .eq("location_id", locationId)
        .in("status", ["out_of_range", "alert"])
        .gte("logged_at", period.start)
        .lt("logged_at", period.end),
    ])
      .then(([openChecks, actions, excursions]) => {
        if (!active) return;
        if (
          openChecks.error ||
          openChecks.count === null ||
          actions.error ||
          !actions.data ||
          excursions.error ||
          excursions.count === null
        ) {
          setError(true);
          return;
        }
        const next: Priority[] = actions.data.map((action) => ({
          label: action.description,
          detail: `${action.severity} corrective action`,
          path: "/actions",
          urgent:
            action.severity === "critical" ||
            Boolean(action.due_at && new Date(action.due_at) < new Date()),
        }));
        if (excursions.count) {
          next.push({
            label: `Review ${excursions.count} temperature exception(s)`,
            detail: "Record the product decision and corrective action",
            path: "/temperature",
            urgent: true,
          });
        }
        if (openChecks.count) {
          next.push({
            label: `Complete ${openChecks.count} open check(s)`,
            detail: "Review records created today",
            path: "/checks",
          });
        }
        next.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
        setChecks(openChecks.count);
        setPriorities(next.slice(0, 5));
        setLoadedDay(day);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [day, organizationId, locationId, refresh]);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>COMPLIANCE COACH</Text>
      <Text style={styles.title}>Know what to do next</Text>
      <Text style={styles.intro}>
        Priorities calculated from visible records at this site, using UK dates—not generic advice
        or an official hygiene rating.
      </Text>
      <View style={styles.summary}>
        <Text style={styles.summaryValue}>{available ? checks : "—"}</Text>
        <Text style={styles.summaryLabel}>open checks today</Text>
      </View>
      <Text style={styles.section}>PRIORITIES NOW</Text>
      {loading && <ActivityIndicator accessibilityLabel="Loading evidence" />}
      {!loading && !available && (
        <Text accessibilityRole="alert" style={styles.intro}>
          Evidence could not be verified. Refresh before reviewing priorities.
        </Text>
      )}
      {available && priorities.length === 0 && (
        <Text style={styles.intro}>
          No priorities found in this view. Review the underlying records before making decisions.
        </Text>
      )}
      {(available ? priorities : []).map((priority, index) => (
        <Pressable
          key={`${priority.path}-${index}`}
          accessibilityRole="button"
          style={[styles.card, priority.urgent && styles.urgent]}
          onPress={() => router.push(priority.path as never)}
        >
          <View style={[styles.number, priority.urgent && styles.numberUrgent]}>
            <Text style={styles.numberText}>{index + 1}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.cardTitle}>{priority.label}</Text>
            <Text style={styles.cardBody}>{priority.detail}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh compliance coach"
        disabled={loading}
        onPress={refreshEvidence}
        style={styles.refresh}
      >
        <Text style={styles.cardTitle}>{error ? "Retry loading" : "Refresh evidence"}</Text>
      </Pressable>
      <Text style={styles.disclaimer}>
        Haccora organises evidence. Official guidance and competent food-safety judgement remain
        authoritative.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { gap: 12, padding: 20, paddingBottom: 84 },
  eyebrow: { color: "#e43f2c", fontSize: 11, fontWeight: "900", letterSpacing: 1.8 },
  title: { fontSize: 23, fontWeight: "800" },
  intro: { color: "#666", fontSize: 13, lineHeight: 19 },
  summary: { backgroundColor: "#111", borderRadius: 16, padding: 18 },
  summaryValue: { color: "#fff", fontSize: 28, fontWeight: "900" },
  summaryLabel: { color: "#bbb", fontSize: 12, marginTop: 2 },
  section: { fontSize: 11, fontWeight: "900", letterSpacing: 1.4, marginTop: 8 },
  card: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e5e5e5",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  refresh: { alignItems: "center", padding: 14 },
  urgent: { borderColor: "#e43f2c" },
  number: {
    alignItems: "center",
    backgroundColor: "#fff0c7",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  numberUrgent: { backgroundColor: "#fde5e1" },
  numberText: { fontSize: 12, fontWeight: "900" },
  copy: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "800" },
  cardBody: { color: "#666", fontSize: 12, lineHeight: 17, marginTop: 3 },
  arrow: { fontSize: 22 },
  disclaimer: { color: "#777", fontSize: 11, lineHeight: 16, marginTop: 8 },
});
