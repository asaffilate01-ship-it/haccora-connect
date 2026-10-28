import { Redirect } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export default function Onboarding() {
  const { session, workspaceReady, workspaceError, loading, refreshWorkspace } = useSession();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const signOut = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      const result = await supabase.auth.signOut();
      if (result.error) throw result.error;
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  if (loading)
    return (
      <View style={styles.page}>
        <Text>Checking workspace access…</Text>
      </View>
    );
  if (!session) return <Redirect href="/login" />;
  if (workspaceReady) return <Redirect href="/dashboard" />;
  return (
    <View style={styles.page}>
      <Text style={styles.title}>
        {workspaceError ? "Workspace unavailable" : "Approval-only access"}
      </Text>
      <Text accessibilityRole={workspaceError ? "alert" : undefined} style={styles.body}>
        {workspaceError
          ? "We could not check your workspace. Reconnect and retry; your account has not been treated as a new workspace."
          : "Your login is not attached to an approved tenant yet. Ask your Haccora operator for owner approval, or your approved owner for a role and premises invitation."}
      </Text>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => void refreshWorkspace()}
      >
        <Text style={styles.buttonText}>Check access again</Text>
      </Pressable>
      {error && <Text accessibilityRole="alert">Sign out failed. Please try again.</Text>}
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        disabled={busy}
        accessibilityState={{ disabled: busy, busy }}
        onPress={signOut}
      >
        <Text style={styles.buttonText}>{busy ? "Signing out…" : "Sign out"}</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", padding: 24, gap: 14, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "800", color: "#111" },
  body: { color: "#555", lineHeight: 21 },
  button: {
    backgroundColor: "#bd2b1b",
    minHeight: 48,
    borderRadius: 24,
    padding: 15,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800" },
});
