import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { uploadEvidence } from "@/lib/evidence-upload";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

type DocumentRow = {
  id: string;
  title: string;
  category: string;
  created_at: string;
  storage_path: string | null;
};

export default function Documents() {
  const { session, organizationId, locationId, loading } = useSession();
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("documents")
      .select("id,title,category,created_at,storage_path")
      .order("created_at", { ascending: false })
      .limit(50);
    setRows((data ?? []) as DocumentRow[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  const upload = async (
    asset: { uri: string; name?: string | null; mimeType?: string | null },
    category: string,
  ) => {
    if (!organizationId) return;
    setBusy(true);
    try {
      await uploadEvidence({
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType,
        organizationId,
        locationId,
        userId: session.user.id,
        title: asset.name ?? `Evidence ${new Date().toLocaleDateString()}`,
        category,
      });
      await load();
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Unknown error");
    }
    setBusy(false);
  };
  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["application/pdf", "image/*", "text/csv"],
    });
    if (!result.canceled) void upload(result.assets[0], "mobile_upload");
  };
  const camera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert("Camera permission required");
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled)
      void upload(
        {
          uri: result.assets[0].uri,
          name: result.assets[0].fileName ?? "evidence.jpg",
          mimeType: result.assets[0].mimeType,
        },
        "camera_evidence",
      );
  };
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>PRIVATE EVIDENCE</Text>
      <Text style={styles.title}>Evidence library</Text>
      <Text style={styles.intro}>
        Uploads use tenant/user paths and remain unavailable until malware scanning reports clean.
      </Text>
      <View style={styles.buttons}>
        <Pressable disabled={busy} style={styles.primary} onPress={() => void camera()}>
          <Text style={styles.primaryText}>{busy ? "Uploading…" : "Take photo"}</Text>
        </Pressable>
        <Pressable disabled={busy} style={styles.secondary} onPress={() => void pick()}>
          <Text style={styles.secondaryText}>Choose document</Text>
        </Pressable>
      </View>
      {rows.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.cardTitle}>{row.title}</Text>
          <Text style={styles.meta}>
            {row.category} · {new Date(row.created_at).toLocaleString()}
          </Text>
          <Text style={styles.pending}>
            {row.storage_path ? "Queued for security scan" : "Metadata only"}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { padding: 20, gap: 13 },
  eyebrow: { color: "#e43f2c", fontWeight: "900", letterSpacing: 2 },
  title: { fontSize: 24, fontWeight: "800" },
  intro: { color: "#666", lineHeight: 20 },
  buttons: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginVertical: 5 },
  primary: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#e43f2c",
  },
  primaryText: { color: "white", fontWeight: "800" },
  secondary: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbb",
  },
  secondaryText: { fontWeight: "800" },
  card: {
    backgroundColor: "white",
    padding: 17,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cardTitle: { fontWeight: "800", fontSize: 16 },
  meta: { fontSize: 12, color: "#666", marginTop: 4 },
  pending: { fontSize: 11, color: "#9a6500", fontWeight: "700", marginTop: 6 },
});
