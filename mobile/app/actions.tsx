import * as ImagePicker from "expo-image-picker";
import { Redirect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { uploadEvidence } from "@/lib/evidence-upload";
import { useFocusedEvidence } from "@/lib/use-focused-evidence";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import {
  canChangeCorrectiveAction,
  classifyCorrectiveActionRead,
} from "@/lib/corrective-action-read";

type Action = {
  id: string;
  description: string;
  severity: string;
  status: string;
  due_at: string | null;
  evidence: Array<{ document_id?: string; storage_path?: string }>;
};

export default function Actions() {
  const workspace = useSession();
  const { session, loading, workspaceReady, serviceStatus, role } = workspace;
  const { organizationId, locationId } = workspace;
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  if (serviceStatus !== "active") return <Redirect href="/account-status" />;
  if (!organizationId) {
    return (
      <Unavailable
        title="Workspace unavailable"
        detail="Select a verified workspace to review corrective actions."
      />
    );
  }
  return (
    <ActionList
      key={`${session.user.id}:${organizationId}:${locationId}:${role}`}
      organizationId={organizationId}
      locationId={locationId}
      role={role}
      userId={session.user.id}
      session={session}
    />
  );
}

function Unavailable({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.page}>
      <Text style={styles.eyebrow}>LIVE OPERATIONS</Text>
      <Text style={styles.title}>Corrective actions</Text>
      <View style={styles.empty}>
        <Text accessibilityRole="alert" style={styles.emptyTitle}>
          {title}
        </Text>
        <Text>{detail}</Text>
      </View>
    </View>
  );
}

function ActionList({
  organizationId,
  locationId,
  role,
  userId,
  session,
}: {
  organizationId: string;
  locationId: string | null;
  role: string | null;
  userId: string;
  session: NonNullable<ReturnType<typeof useSession>["session"]>;
}) {
  const canEdit = canChangeCorrectiveAction(role);
  const [busy, setBusy] = useState<string | null>(null);
  const busyRef = useRef(false);
  const load = useCallback(
    async (isCurrent: () => boolean): Promise<Action[]> => {
      let query = supabase
        .from("corrective_actions")
        .select("id,description,severity,status,due_at,evidence")
        .eq("organization_id", organizationId)
        .in("status", ["open", "in_progress", "verified"])
        .order("due_at", { ascending: true });
      if (locationId) query = query.eq("location_id", locationId);
      const { data, error } = await query;
      if (!isCurrent()) throw new Error("Corrective action request expired");
      const result = classifyCorrectiveActionRead(data, error);
      if (result.kind === "unavailable") throw new Error("Corrective action records unavailable");
      return result.actions;
    },
    [organizationId, locationId],
  );
  const { data: rows, status, refresh } = useFocusedEvidence(load);

  const transition = async (
    action: Action,
    nextStatus: string,
    evidence: unknown[] = [],
    showFailure = true,
  ): Promise<boolean> => {
    if (!canEdit || busyRef.current) return false;
    busyRef.current = true;
    setBusy(action.id);
    try {
      const { error } = await (supabase as any).rpc("transition_corrective_action", {
        p_action_id: action.id,
        p_status: nextStatus,
        p_note: "Updated from native app",
        p_evidence: evidence,
      });
      if (error) throw error;
      refresh();
      return true;
    } catch {
      if (showFailure) {
        Alert.alert(
          "Update not confirmed",
          "The action was not confirmed as updated. Refresh the records or ask your manager.",
        );
      }
      return false;
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const addPhoto = async (action: Action) => {
    if (!canEdit || busyRef.current) return;
    busyRef.current = true;
    setBusy(action.id);
    let uploaded = false;
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
        userId,
        title: `Corrective action ${action.id}`,
        category: "corrective_action",
      });
      uploaded = true;
      busyRef.current = false;
      const linked = await transition(
        action,
        "in_progress",
        [
          {
            document_id: document.id,
            storage_path: document.storage_path,
            captured_at: new Date().toISOString(),
          },
        ],
        false,
      );
      if (!linked) {
        Alert.alert(
          "Photo uploaded; action not updated",
          "Do not upload the same photo again. Ask your manager to review the saved evidence.",
        );
      }
    } catch {
      Alert.alert(
        uploaded ? "Photo saved; action not updated" : "Evidence upload failed",
        uploaded
          ? "Do not upload the same photo again. Ask your manager to review the saved evidence."
          : "Check connectivity and verify existing uploads before trying again.",
      );
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const canVerify = role === "owner" || role === "manager";
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={status === "loading"} onRefresh={refresh} />}
    >
      <Text style={styles.eyebrow}>LIVE OPERATIONS</Text>
      <Text style={styles.title}>Corrective actions</Text>
      <Text style={styles.intro}>
        {canEdit
          ? "Review outstanding work, attach evidence and keep each transition traceable."
          : "Your access is read-only. Review the records without changing them."}
      </Text>
      {status === "loading" && (
        <View style={styles.empty} accessibilityLiveRegion="polite">
          <Text style={styles.emptyTitle}>Loading corrective-action records…</Text>
        </View>
      )}
      {status === "error" && (
        <View style={styles.empty}>
          <Text accessibilityRole="alert" style={styles.emptyTitle}>
            Action records unavailable
          </Text>
          <Text>These records could not be verified. No safety clearance can be inferred.</Text>
          <Pressable accessibilityRole="button" style={styles.secondary} onPress={refresh}>
            <Text style={styles.secondaryText}>Retry records</Text>
          </Pressable>
        </View>
      )}
      {status === "ready" && rows.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No open actions recorded</Text>
          <Text>This is a record count only; it is not a food-safety approval.</Text>
        </View>
      )}
      {status === "ready" &&
        rows.map((action) => (
          <View key={action.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.badge, action.severity === "critical" && styles.critical]}>
                {action.severity.toUpperCase()}
              </Text>
              <Text style={styles.status}>{action.status.replace("_", " ")}</Text>
            </View>
            <Text style={styles.cardTitle}>{action.description}</Text>
            {action.due_at && (
              <Text style={styles.meta}>Due {new Date(action.due_at).toLocaleString("en-GB")}</Text>
            )}
            <Text style={styles.meta}>{action.evidence.length} evidence item(s)</Text>
            {canEdit && (
              <View style={styles.actions}>
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
                {canVerify && action.evidence.length > 0 && action.status === "in_progress" && (
                  <Pressable
                    disabled={busy !== null}
                    style={styles.verify}
                    onPress={() => void transition(action, "verified")}
                  >
                    <Text style={styles.verifyText}>Verify</Text>
                  </Pressable>
                )}
              </View>
            )}
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
  empty: { padding: 30, alignItems: "center", backgroundColor: "white", borderRadius: 18, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
});
