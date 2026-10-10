import { router } from "expo-router";
import { useURL } from "expo-linking";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { supabase } from "@/lib/supabase";
import { newPasswordError, recoverySessionFromUrl } from "@/lib/password-recovery";

export default function ResetPassword() {
  const url = useURL();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verification = useRef<{ url: string; promise: Promise<string> } | null>(null);
  const recoveryUser = useRef<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let active = true;
    setReady(false);
    setError(null);
    if (verification.current?.url !== url) {
      verification.current = {
        url,
        promise: (async () => {
          const tokens = recoverySessionFromUrl(url);
          const { data, error: sessionError } = await supabase.auth.setSession(tokens);
          if (sessionError || !data.session)
            throw new Error("This reset link has expired or is invalid. Request a new email.");
          return data.session.user.id;
        })(),
      };
    }
    void verification.current.promise
      .then((userId) => {
        if (active) {
          recoveryUser.current = userId;
          setReady(true);
        }
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : "Request a new reset email.");
      });
    return () => {
      active = false;
    };
  }, [url]);

  const save = async () => {
    if (busy || !ready) return;
    const validation = newPasswordError(password, confirmation);
    if (validation) return Alert.alert("Check your password", validation);
    setBusy(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user || data.user.id !== recoveryUser.current) {
        throw new Error("Your reset session changed. Open a new reset email.");
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError)
        throw new Error(
          "Could not update your password. Check your connection and password requirements, then try again.",
        );
      setPassword("");
      setConfirmation("");
      setReady(false);
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) {
        setError("Password updated. Close the app and sign in again with your new password.");
      } else {
        Alert.alert("Password updated", "Sign in using your new password.", [
          { text: "Sign in", onPress: () => router.replace("/login") },
        ]);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Choose a new password</Text>
      <Text style={styles.body}>
        {ready
          ? "Use at least 12 characters."
          : "Open a valid password reset email on this device to continue."}
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {ready && (
        <>
          <TextInput
            accessibilityLabel="New password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!busy}
            value={password}
            onChangeText={setPassword}
            placeholder="New password"
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Confirm new password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!busy}
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="Confirm password"
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={save}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{busy ? "Updating…" : "Update password"}</Text>
          </Pressable>
        </>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => router.replace("/forgot-password")}
        style={styles.link}
      >
        <Text>Request another reset email</Text>
      </Pressable>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { padding: 24, gap: 18, flexGrow: 1, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "800" },
  body: { fontSize: 16, lineHeight: 23, color: "#444" },
  error: { color: "#a31024", lineHeight: 22 },
  input: { borderWidth: 1, borderColor: "#bbb", borderRadius: 12, padding: 14, fontSize: 16 },
  button: { backgroundColor: "#c8102e", borderRadius: 24, padding: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  link: { padding: 16, alignItems: "center" },
});
