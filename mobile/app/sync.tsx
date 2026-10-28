import { useCallback, useEffect, useRef, useState } from "react";
import { Redirect } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { flush, listQueuedEvidence, type QueuedEvidenceSummary } from "@/lib/offline-queue";
import { syncCopy } from "@/lib/sync-copy";

export default function SyncRecovery() {
  const language: string = "en";
  const copy = syncCopy.en;
  const { session, workspaceReady, loading, role } = useSession();
  const userId = session?.user.id;
  const network = useNetInfo();
  const [items, setItems] = useState<QueuedEvidenceSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const request = useRef(0);
  const pending = useRef(false);
  const account = useRef(session?.user.id);
  account.current = session?.user.id;
  const load = useCallback(async () => {
    if (!userId || !workspaceReady) return;
    const version = ++request.current;
    setItems(null);
    setError(false);
    try {
      const result = await listQueuedEvidence();
      if (mounted.current && version === request.current && account.current === userId)
        setItems(result);
    } catch {
      if (mounted.current && version === request.current) setError(true);
    }
  }, [userId, workspaceReady]);
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      request.current++;
    };
  }, [load]);
  const online = network.isConnected === true && network.isInternetReachable !== false;
  const retry = async () => {
    if (pending.current || !online || role === "inspector" || !session) return;
    const userId = session.user.id;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      await flush();
      if (mounted.current && account.current === userId) await load();
    } catch {
      if (mounted.current && account.current === userId) {
        setItems(null);
        setError(true);
      }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.intro}</Text>
      {!online && <Text style={styles.body}>{copy.offline}</Text>}
      {role === "inspector" && <Text style={styles.body}>{copy.readOnly}</Text>}
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => void load()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{copy.refresh}</Text>
        </Pressable>
        {role !== "inspector" && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || !online, busy }}
            disabled={busy || !online}
            onPress={retry}
            style={[styles.button, (busy || !online) && styles.disabled]}
          >
            <Text style={styles.buttonText}>{busy ? copy.busy : copy.retry}</Text>
          </Pressable>
        )}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {copy.error}
        </Text>
      ) : items === null ? (
        <Text accessibilityLiveRegion="polite">{copy.loading}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.body}>{copy.empty}</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{copy[item.table]}</Text>
            <Text style={item.state === "pending" ? styles.body : styles.error}>
              {copy[item.state]}
            </Text>
            <Text style={styles.body}>
              {copy.recorded}:{" "}
              {new Date(item.queuedAt).toLocaleString(language === "de" ? "de-DE" : "en-GB", {
                timeZone: "Europe/London",
              })}
            </Text>
            <Text style={styles.body}>
              {copy.attempts}: {item.attempts}
            </Text>
            <Text selectable style={styles.reference}>
              {copy.reference}: {item.id}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 48, gap: 16, backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "800", color: "#111" },
  body: { fontSize: 15, lineHeight: 22, color: "#454545" },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  button: {
    minHeight: 48,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#bd2b1b",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.6 },
  card: { padding: 16, borderWidth: 1, borderColor: "#ddd", borderRadius: 12, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  error: { color: "#9c2217", fontSize: 15, lineHeight: 22 },
  reference: { fontSize: 13, color: "#555" },
});
