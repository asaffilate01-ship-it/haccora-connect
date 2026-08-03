import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export default function Onboarding() {
  const { session, workspaceReady, loading, refreshWorkspace } = useSession();
  const [business, setBusiness] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  const createWorkspace = async () => {
    if (business.trim().length < 2 || !location.trim()) {
      Alert.alert("Complete the form", "Business and location names are required.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("bootstrap_my_organization", {
      p_name: business.trim(),
      p_location_name: location.trim(),
    });
    setBusy(false);
    if (error) {
      Alert.alert("Setup failed", error.message);
      return;
    }
    await refreshWorkspace();
    router.replace("/dashboard");
  };

  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (workspaceReady) return <Redirect href="/dashboard" />;
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Create your protected workspace</Text>
      <Text style={styles.body}>
        The first account becomes the owner. Additional roles are invitation-only.
      </Text>
      <TextInput
        value={business}
        onChangeText={setBusiness}
        maxLength={160}
        placeholder="Business name"
        style={styles.input}
      />
      <TextInput
        value={location}
        onChangeText={setLocation}
        maxLength={160}
        placeholder="Main location"
        style={styles.input}
      />
      <Pressable disabled={busy} onPress={createWorkspace} style={styles.button}>
        <Text style={styles.buttonText}>{busy ? "Creating…" : "Create workspace"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", padding: 24, gap: 14, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "800", color: "#111" },
  body: { color: "#666", lineHeight: 21, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#d8d8d8", borderRadius: 12, padding: 14 },
  button: { backgroundColor: "#e43f2c", borderRadius: 24, padding: 15, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "800" },
});
