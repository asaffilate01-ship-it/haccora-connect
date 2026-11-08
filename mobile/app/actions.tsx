import * as ImagePicker from "expo-image-picker";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { uploadEvidence } from "@/lib/evidence-upload";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { canChangeCorrectiveAction, classifyCorrectiveActionRead } from "@/lib/corrective-action-read";

type Action = {
  id: string;
  description: string;
  severity: string;
  status: string;
  due_at: string | null;
  evidence: Array<{ document_id?: string; storage_path?: string }>;
};

export default function Actions() {
  const { session, workspaceReady, organizationId, locationId, role, loading: sessionLoading } =
    useSession();
  const userId = session?.user.id ?? null;
  const canEdit = canChangeCorrectiveAction(role);
  const [rows, setRows] = useState<Action[]>([]);
  const [readState, setReadState] = useState<"loading" | "unavailable" | "empty" | "ready">(
    "loading",
  );
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setReadState("loading");
    setRows([]);
    if (!userId || !workspaceReady || !organizationId) {
      setReadState("unavailable");
      setRefreshing(false);
      return;
    }
    try {
      const { data, error } = await (supabase as any)
        .from("corrective_actions")
        .select("id,description,severity,status,due_at,evidence")
        .eq("organization_id", organizationId)
        .in("status", ["open", "in_progress", "verified"])
        .order("due_at", { ascending: true });
      if (version !== requestVersion.current) return;
      const result = classifyCorrectiveActionRead(data, error);
      setRows(result.actions);
      setReadState(result.kind);
    } catch {
      if (version === requestVersion.current) {
        setRows([]);
        setReadState("unavailable");
      }
    } finally {
      if (version === requestVersion.current) setRefreshing(false);
    }
  }, [userId, organizationId, workspaceReady]);

  useEffect(() => {
    if (sessionLoading) return;
    void load();
    return () => {
      requestVersion.current += 1;
    };
  }, [load, sessionLoading]);

  if (sessionLoading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  const transition = async (
    action: Action,
    status: string,
    evidence: unknown[] = [],
    showFailure = true,
  ): Promise<boolean> => {
    if (!canEdit || !organizationId || !session) return false;
    setBusy(action.id);
    try {
      const { error } = await (supabase as any).rpc("transition_corrective_action", {
        p_action_id: action.id,
        p_status: status,
        p_note: "Updated from native app",
        p_evidence: evidence,
      });
      if (error) throw error;
      void load();
      return true;
    } catch {
      if (showFailure) {
        Alert.alert("Update not confirmed", "The action was not confirmed as updated. Retry or ask your manager.");
      }
      return false;
    } finally {
      setBusy(null);
    }
  };
  const addPhoto = async (action: Action) => {
    if (!canEdit || !organizationId || !session?.user || busy !== null) return;
    setBusy(action.id);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Camera permission required", "Enable camera access to attach evidence.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.75 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) throw new Error("No photo was captured");
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
      const linked = await transition(action, "in_progress", [
        {
          document_id: document.id,
          storage_path: document.storage_path,
          captured_at: new Date().toISOString(),
        },
      ], false);
      if (!linked) {
        Alert.alert(
          "Photo uploaded; action not updated",
          "Do not upload the same photo again. Ask your manager to review the saved evidence.",
        );
      }
    } catch {
      Alert.alert("Evidence upload failed", "Check connectivity and try again. Verify existing uploads first.");
    } finally {
      setBusy(null);
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
        {canEdit
          ? "Claim work, attach evidence and keep every transition traceable."
          : "Inspector access is read-only. Review the evidence without changing records."}
      </Text>
      {readState === "loading" && (
        <View style={styles.empty} accessibilityLiveRegion="polite">
          <Text style={styles.emptyTitle}>Loading corrective-action records…</Text>
        </View>
      )}
      {readState === "unavailable" && (
        <View style={styles.empty}>
          <Text accessibilityRole="alert" style={styles.emptyTitle}>Action records unavailable</Text>
          <Text>These records could not be verified. No safety clearance can be inferred.</Text>
          <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => void load()}>
            <Text style={styles.secondaryText}>Retry records</Text>
          </Pressable>
        </View>
      )}
      {readState === "empty" && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No open actions recorded</Text>
          <Text>This describes returned records only; it is not a food-safety approval.</Text>
        </View>
      )}
      {readState === "ready" && rows.map((action) => (
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
          {canEdit && <View style={styles.actions}>
            {action.status === "open" && (
              <Pressable
                disabled={busy !== null}
                style={styles.secondary}
                onPress={() => void transition(action, "in_progress")}
              >
                <Text style={styles.secondaryText}>Start</Text>
              </Pressable>
            )}
            <Pressable
              disabled={busy !== null}
              style={styles.primary}
              onPress={() => void addPhoto(action)}
            >
              <Text style={styles.primaryText}>
                {busy === action.id ? "Working…" : "Add photo"}
              </Text>
            </Pressable>
            {canVerify && action.evidence?.length > 0 && action.status === "in_progress" && (
              <Pressable
                disabled={busy !== null}
                style={styles.verify}
                onPress={() => void transition(action, "verified")}
              >
                <Text style={styles.verifyText}>Verify</Text>
              </Pressable>
            )}
          </View>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 14 },
  eyebrow: { color: "#e43f2c", fontWeight: "900", letterSpacing: 2 },
  title: { fontSize: 24, fontWeight: "800" },
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
