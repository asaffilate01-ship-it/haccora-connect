import * as ImagePicker from "expo-image-picker";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { uploadEvidence } from "@/lib/evidence-upload";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export default function Incidents() {
  const { session, organizationId, locationId, loading } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  const capture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert("Camera permission required");
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.75 });
    if (!result.canceled) setPhoto(result.assets[0]);
  };
  const submit = async () => {
    if (!organizationId || title.trim().length < 3) return;
    setBusy(true);
    try {
      const evidence: unknown[] = [];
      if (photo) {
        const document = await uploadEvidence({
          uri: photo.uri,
          fileName: photo.fileName ?? "incident.jpg",
          mimeType: photo.mimeType ?? "image/jpeg",
          organizationId,
          locationId,
          userId: session.user.id,
          title: `Incident: ${title}`,
          category: "incident",
        });
        evidence.push({ document_id: document.id, storage_path: document.storage_path });
      }
      const { error } = await (supabase as any).from("incidents").insert({
        organization_id: organizationId,
        location_id: locationId,
        user_id: session.user.id,
        kind: "food_safety",
        severity,
        title: title.trim(),
        description: description.trim() || null,
        status: "open",
        evidence,
      });
      if (error) throw error;
      Alert.alert("Incident recorded", "Managers have a persistent record and evidence trail.", [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(
        "Could not record incident",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
    setBusy(false);
  };
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>SPEAK UP</Text>
      <Text style={styles.title}>Report incident</Text>
      <Text style={styles.intro}>
        Use specific facts. Do not include unnecessary health or personal data.
      </Text>
      <Text style={styles.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        maxLength={160}
        style={styles.input}
        placeholder="What happened?"
      />
      <Text style={styles.label}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        maxLength={2000}
        multiline
        style={[styles.input, styles.area]}
        placeholder="Immediate action, affected product, lot or area"
      />
      <Text style={styles.label}>Severity</Text>
      <ScrollView horizontal contentContainerStyle={styles.severities}>
        {["low", "medium", "high", "critical"].map((value) => (
          <Pressable
            key={value}
            onPress={() => setSeverity(value)}
            style={[styles.chip, severity === value && styles.chipActive]}
          >
            <Text style={severity === value ? styles.chipActiveText : styles.chipText}>
              {value}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable style={styles.secondary} onPress={() => void capture()}>
        <Text style={styles.secondaryText}>
          {photo ? "Photo attached — retake" : "Attach photo evidence"}
        </Text>
      </Pressable>
      <Pressable
        disabled={busy || title.trim().length < 3}
        style={[styles.primary, (busy || title.trim().length < 3) && styles.disabled]}
        onPress={() => void submit()}
      >
        <Text style={styles.primaryText}>{busy ? "Recording…" : "Record incident"}</Text>
      </Pressable>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { padding: 20, gap: 10 },
  eyebrow: { color: "#e43f2c", fontWeight: "900", letterSpacing: 2 },
  title: { fontSize: 24, fontWeight: "800" },
  intro: { color: "#666", lineHeight: 20, marginBottom: 8 },
  label: { fontWeight: "800", marginTop: 6 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "white",
  },
  area: { minHeight: 120, paddingTop: 14, textAlignVertical: "top" },
  severities: { gap: 8, paddingVertical: 2 },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 15,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  chipActive: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { textTransform: "capitalize", fontWeight: "700" },
  chipActiveText: { color: "white", textTransform: "capitalize", fontWeight: "800" },
  secondary: {
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbb",
    marginTop: 6,
  },
  secondaryText: { fontWeight: "800" },
  primary: {
    minHeight: 54,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#e43f2c",
    marginTop: 4,
  },
  primaryText: { color: "white", fontWeight: "900" },
  disabled: { opacity: 0.5 },
});
