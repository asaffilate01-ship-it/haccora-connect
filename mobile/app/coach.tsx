import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

type Priority = { label: string; detail: string; path: string; urgent?: boolean };

export default function Coach() {
  const { session, workspaceReady, loading } = useSession();
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [checks, setChecks] = useState(0);

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    void Promise.all([
      supabase
        .from("checks")
        .select("id", { count: "exact", head: true })
        .neq("status", "completed")
        .gte("created_at", start.toISOString()),
      supabase
        .from("corrective_actions")
        .select("id,description,severity,due_at")
        .neq("status", "closed")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(3),
      supabase
        .from("temperature_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "out_of_range")
        .gte("logged_at", start.toISOString()),
    ]).then(([openChecks, actions, excursions]) => {
      const next: Priority[] = (actions.data ?? []).map((action) => ({
        label: action.description,
        detail: `${action.severity} corrective action`,
        path: "/actions",
        urgent:
          action.severity === "critical" ||
          Boolean(action.due_at && new Date(action.due_at) < new Date()),
      }));
      if (excursions.count)
        next.unshift({
          label: `Review ${excursions.count} temperature exception${excursions.count === 1 ? "" : "s"}`,
          detail: "Record the product decision and corrective action",
          path: "/temperature",
          urgent: true,
        });
      if (openChecks.count)
        next.push({
          label: `Complete ${openChecks.count} open check${openChecks.count === 1 ? "" : "s"}`,
          detail: "Finish today's assigned records",
          path: "/checks",
        });
      setChecks(openChecks.count ?? 0);
      setPriorities(
        next.length
          ? next.slice(0, 5)
          : [
              {
                label: "No urgent evidence gaps found",
                detail: "Continue normal monitoring and closing checks",
                path: "/dashboard",
              },
            ],
      );
    });
  }, []);

  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>COMPLIANCE COACH</Text>
      <Text style={styles.title}>Know what to do next</Text>
      <Text style={styles.intro}>
        Priorities calculated from your saved workspace records—not generic advice or an official
        hygiene rating.
      </Text>
      <View style={styles.summary}>
        <Text style={styles.summaryValue}>{checks}</Text>
        <Text style={styles.summaryLabel}>open checks today</Text>
      </View>
      <Text style={styles.section}>PRIORITIES NOW</Text>
      {priorities.map((priority, index) => (
        <Pressable
          key={`${priority.path}-${index}`}
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
