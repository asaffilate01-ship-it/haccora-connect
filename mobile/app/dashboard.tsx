import { Redirect, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { unregisterPushNotifications } from "@/lib/push";
import { getQueueStatus } from "@/lib/offline-queue";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { session, workspaceReady, loading } = useSession();
  const network = useNetInfo();
  const [pending, setPending] = useState(0);
  useEffect(() => {
    void getQueueStatus().then((status) => setPending(status.pending));
  }, [network.isConnected]);
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
      <Pressable style={styles.card} onPress={() => router.push("/settings")}>
        <Text style={styles.cardTitle}>Security & privacy</Text>
        <Text style={styles.cardBody}>
          Biometric lock, data export and reviewed deletion requests.
        </Text>
      </Pressable>
      <Pressable onPress={signOut} style={styles.signOut}>
        <Text>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { padding: 20, gap: 14 },
  eyebrow: { color: "#e43f2c", fontWeight: "900", letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: "800", marginBottom: 8 },
  sync: { backgroundColor: "#dff4e7", borderRadius: 12, padding: 12 },
  offline: { backgroundColor: "#fff0c7" },
  syncText: { fontSize: 12, fontWeight: "800" },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  cardTitle: { fontSize: 20, fontWeight: "800" },
  cardBody: { color: "#666", marginTop: 5, lineHeight: 20 },
  signOut: { alignSelf: "center", padding: 16 },
});
