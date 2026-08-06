import { Redirect, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { unregisterPushNotifications } from "@/lib/push";
import { getQueueStatus } from "@/lib/offline-queue";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { session, workspaceReady, role, loading } = useSession();
  const network = useNetInfo();
  const [pending, setPending] = useState(0);
  const [today, setToday] = useState({ done: 0, open: 0, actions: 0 });
  useEffect(() => {
    void getQueueStatus().then((status) => setPending(status.pending));
  }, [network.isConnected]);
  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
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
    ]).then(([done, open, actions]) =>
      setToday({ done: done.count ?? 0, open: open.count ?? 0, actions: actions.count ?? 0 }),
    );
  }, []);
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  const signOut = async () => {
    await unregisterPushNotifications().catch(() => undefined);
    await supabase.auth.signOut();
  };
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>TODAY</Text>
      <Text style={styles.title}>Food safety checks</Text>
      <View style={[styles.sync, network.isConnected === false && styles.offline]}>
        <Text style={styles.syncText}>
          {network.isConnected === false
            ? `Offline · ${pending} change(s) securely queued`
            : pending
              ? `Online · syncing ${pending} change(s)`
              : "Online · server confirmed"}
        </Text>
      </View>
      <Pressable
        style={styles.priority}
        onPress={() =>
          router.push(today.open ? "/checks" : today.actions ? "/actions" : "/temperature")
        }
      >
        <Text style={styles.priorityLabel}>NEXT REQUIRED ACTION</Text>
        <Text style={styles.priorityTitle}>
          {today.open
            ? `${today.open} daily check${today.open === 1 ? "" : "s"} to complete`
            : today.actions
              ? `${today.actions} corrective action${today.actions === 1 ? "" : "s"} to review`
              : "Log the next temperature reading"}
        </Text>
        <Text style={styles.priorityBody}>
          {today.done} checks completed today · saved to your workspace
        </Text>
      </Pressable>
      <Text style={styles.sectionTitle}>Quick tools</Text>
      <View style={styles.grid}>
        <Pressable style={styles.card} onPress={() => router.push("/temperature")}>
          <Text style={styles.cardTitle}>Temperature</Text>
          <Text style={styles.cardBody}>Log a reading with offline retry and critical limits.</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/checks")}>
          <Text style={styles.cardTitle}>Daily checks</Text>
          <Text style={styles.cardBody}>
            Complete traceable opening, cleaning and closing checks.
          </Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/diary")}>
          <Text style={styles.cardTitle}>Daily diary</Text>
          <Text style={styles.cardBody}>
            Record problems, corrective action and manager sign-off.
          </Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/actions")}>
          <Text style={styles.cardTitle}>Corrective actions</Text>
          <Text style={styles.cardBody}>
            Claim exceptions, attach camera evidence and verify closures.
          </Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/alerts" as never)}>
          <Text style={styles.cardTitle}>Alert inbox</Text>
          <Text style={styles.cardBody}>
            Review live warnings, expiries and food-safety issues.
          </Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/incidents")}>
          <Text style={styles.cardTitle}>Report incident</Text>
          <Text style={styles.cardBody}>
            Create a persistent incident with severity and optional photo.
          </Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/documents")}>
          <Text style={styles.cardTitle}>Evidence library</Text>
          <Text style={styles.cardBody}>
            Upload private documents and camera evidence for malware scanning.
          </Text>
        </Pressable>
        {(role === "owner" || role === "manager") && (
          <Pressable style={styles.card} onPress={() => router.push("/staff-compliance" as never)}>
            <Text style={styles.cardTitle}>Staff compliance</Text>
            <Text style={styles.cardBody}>
              Review training, certificates and evidence that is due to expire.
            </Text>
          </Pressable>
        )}
        <Pressable style={styles.card} onPress={() => router.push("/training" as never)}>
          <Text style={styles.cardTitle}>Training</Text>
          <Text style={styles.cardBody}>Review courses, certificates and renewal dates.</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/inductions" as never)}>
          <Text style={styles.cardTitle}>Staff induction</Text>
          <Text style={styles.cardBody}>Read or assign site instructions with recorded acknowledgement.</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/fitness-to-work" as never)}>
          <Text style={styles.cardTitle}>Fitness to work</Text>
          <Text style={styles.cardBody}>Privately report sickness and record manager clearance.</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/goods-in" as never)}>
          <Text style={styles.cardTitle}>Delivery check</Text>
          <Text style={styles.cardBody}>Accept or reject goods with offline traceability evidence.</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/safe-methods")}>
          <Text style={styles.cardTitle}>Safe methods</Text>
          <Text style={styles.cardBody}>Review site-adopted UK food-safety controls.</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/ppds")}>
          <Text style={styles.cardTitle}>PPDS labels</Text>
          <Text style={styles.cardBody}>Check current label versions and declared allergens.</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/inspection-readiness")}>
          <Text style={styles.cardTitle}>Evidence readiness</Text>
          <Text style={styles.cardBody}>See evidence coverage and unresolved actions.</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/coach")}>
          <Text style={styles.cardTitle}>Compliance coach</Text>
          <Text style={styles.cardBody}>
            See live, prioritised actions from your saved records.
          </Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/settings")}>
          <Text style={styles.cardTitle}>Security & privacy</Text>
          <Text style={styles.cardBody}>
            Biometric lock, data export and reviewed deletion requests.
          </Text>
        </Pressable>
      </View>
      <Pressable onPress={signOut} style={styles.signOut}>
        <Text>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { padding: 18, paddingBottom: 84, gap: 12 },
  eyebrow: { color: "#e43f2c", fontWeight: "900", letterSpacing: 2 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  sync: { backgroundColor: "#dff4e7", borderRadius: 12, padding: 12 },
  offline: { backgroundColor: "#fff0c7" },
  syncText: { fontSize: 12, fontWeight: "800" },
  priority: { backgroundColor: "#111", borderRadius: 16, padding: 16 },
  priorityLabel: { color: "#f38b7c", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  priorityTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: 7 },
  priorityBody: { color: "#bbb", fontSize: 12, lineHeight: 17, marginTop: 6 },
  sectionTitle: {
    color: "#555",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginTop: 3,
    textTransform: "uppercase",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    backgroundColor: "#fff",
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    minHeight: 104,
    width: "48%",
  },
  cardTitle: { fontSize: 14, fontWeight: "800" },
  cardBody: { color: "#666", fontSize: 11, marginTop: 4, lineHeight: 16 },
  signOut: { alignSelf: "center", padding: 16 },
});
