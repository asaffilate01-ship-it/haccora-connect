import { useState } from "react";
import { Redirect } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { enqueue } from "@/lib/offline-queue";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

export default function Checks() {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const { session, workspaceReady, organizationId, locationId, loading } = useSession();
  const save = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user || !organizationId || !title.trim()) return;
    try {
      await enqueue("checks", {
        user_id: data.user.id,
        organization_id: organizationId,
        location_id: locationId,
        kind: "daily",
        title: title.trim(),
        note: note.trim() || null,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      setTitle("");
      setNote("");
      Alert.alert("Saved", "The check is stored or queued for sync.");
    } catch {
      Alert.alert("Not saved", "The encrypted app storage was unavailable. Please try again.");
    }
  };
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  return (
    <View style={styles.page}>
      <Text style={styles.label}>CHECK</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        maxLength={160}
        placeholder="Opening inspection"
        style={styles.input}
      />
      <Text style={styles.label}>NOTE</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={500}
        multiline
        placeholder="Optional evidence note"
        style={[styles.input, { minHeight: 100 }]}
      />
      <Pressable onPress={save} style={styles.button}>
        <Text style={styles.buttonText}>Complete check</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: 20, gap: 10 },
  label: { marginTop: 10, fontSize: 11, color: "#666", fontWeight: "800", letterSpacing: 1.5 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  button: {
    marginTop: 18,
    backgroundColor: "#e43f2c",
    borderRadius: 24,
    padding: 15,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800" },
});
