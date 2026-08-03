import * as ImagePicker from "expo-image-picker";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { uploadEvidence } from "@/lib/evidence-upload";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

type Action = {
  id: string;
  description: string;
  severity: string;
  status: string;
  due_at: string | null;
  evidence: Array<{ document_id?: string; storage_path?: string }>;
};

export default function Actions() {
  const { session, organizationId, locationId, role, loading } = useSession();
  const [rows, setRows] = useState<Action[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("corrective_actions")
      .select("id,description,severity,status,due_at,evidence")
      .in("status", ["open", "in_progress", "verified"])
      .order("due_at", { ascending: true });
    if (error) Alert.alert("Could not load actions", error.message);
    setRows((data ?? []) as Action[]);
    setRefreshing(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  const transition = async (action: Action, status: string, evidence: unknown[] = []) => {
    setBusy(action.id);
    const { error } = await (supabase as any).rpc("transition_corrective_action", {
      p_action_id: action.id,
      p_status: status,
      p_note: "Updated from native app",
      p_evidence: evidence,
    });
    setBusy(null);
    if (error) Alert.alert("Update failed", error.message);
    else void load();
  };
  const addPhoto = async (action: Action) => {
    if (!organizationId || !session.user) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      return Alert.alert("Camera permission required", "Enable camera access to attach evidence.");
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.75 });
    if (result.canceled) return;
    setBusy(action.id);
    try {
      const asset = result.assets[0];
      const document = await uploadEvidence({
        uri: asset.uri,
        fileName: asset.fileName ?? "evidence.jpg",
        mimeType: asset.mimeType ?? "image/jpeg",
        organizationId,
        locationId,
        userId: session.user.id,
        title: `Corrective action ${action.id}`,
        category: "corrective_action",
      });
      await transition(action, "in_progress", [
        {
          document_id: document.id,
          storage_path: document.storage_path,
          captured_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      setBusy(null);
      Alert.alert(
        "Evidence upload failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };
  const canVerify = role === "owner" || role === "manager";
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
    >
      <Text style={styles.eyebrow}>LIVE OPERATIONS</Text>
      <Text style={styles.title}>Corrective actions</Text>
      <Text style={styles.intro}>
        Claim work, attach evidence and keep every transition traceable.
      </Text>
      {rows.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>All clear</Text>
          <Text>No open corrective actions.</Text>
        </View>
      )}
      {rows.map((action) => (
        <View key={action.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.badge, action.severity === "critical" && styles.critical]}>
              {action.severity.toUpperCase()}
            </Text>
            <Text style={styles.status}>{action.status.replace("_", " ")}</Text>
          </View>
          <Text style={styles.cardTitle}>{action.description}</Text>
          {action.due_at && (
            <Text style={styles.meta}>Due {new Date(action.due_at).toLocaleString()}</Text>
          )}
          <Text style={styles.meta}>{action.evidence?.length ?? 0} evidence item(s)</Text>
          <View style={styles.actions}>
            {action.status === "open" && (
              <Pressable
                disabled={busy === action.id}
                style={styles.secondary}
                onPress={() => void transition(action, "in_progress")}
              >
                <Text style={styles.secondaryText}>Start</Text>
              </Pressable>
            )}
            <Pressable
              disabled={busy === action.id}
              style={styles.primary}
              onPress={() => void addPhoto(action)}
            >
              <Text style={styles.primaryText}>
                {busy === action.id ? "Working…" : "Add photo"}
              </Text>
            </Pressable>
            {canVerify && action.evidence?.length > 0 && action.status === "in_progress" && (
              <Pressable
                disabled={busy === action.id}
                style={styles.verify}
                onPress={() => void transition(action, "verified")}
              >
                <Text style={styles.verifyText}>Verify</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 14 },
  eyebrow: { color: "#e43f2c", fontWeight: "900", letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: "800" },
  intro: { color: "#666", lineHeight: 20, marginBottom: 4 },
  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ddd",
    gap: 9,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    fontSize: 10,
    fontWeight: "900",
    backgroundColor: "#fff0d5",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  critical: { backgroundColor: "#ffe0dc", color: "#a6190f" },
  status: { fontSize: 11, color: "#666", textTransform: "uppercase" },
  cardTitle: { fontSize: 17, fontWeight: "800", lineHeight: 23 },
  meta: { fontSize: 12, color: "#666" },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
  primary: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: "#e43f2c",
  },
  primaryText: { color: "white", fontWeight: "800" },
  secondary: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  secondaryText: { fontWeight: "800" },
  verify: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: "#197a45",
  },
  verifyText: { color: "white", fontWeight: "800" },
  empty: { padding: 30, alignItems: "center", backgroundColor: "white", borderRadius: 18 },
  emptyTitle: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
});
