import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { supabase } from "@/lib/supabase";
import { RECOVERY_REDIRECT } from "@/lib/password-recovery";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const send = async () => {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return Alert.alert("Check your email", "Enter the email address for your Haccora account.");
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: RECOVERY_REDIRECT,
      });
      if (error) throw error;
      setSent(true);
    } catch {
      Alert.alert("Could not request reset", "Check your connection and try again shortly.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Reset your password</Text>
      <Text style={styles.body}>
        Enter your account email. Open the reset email on this device to choose a new password in
        Haccora.
      </Text>
      <TextInput
        accessibilityLabel="Account email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setSent(false);
        }}
        editable={!busy}
        placeholder="you@business.co.uk"
        style={styles.input}
      />
      {sent && (
        <Text accessibilityRole="alert" style={styles.body}>
          If an account exists for that address, a reset email has been requested. Check your inbox
          and spam folder.
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={busy || sent}
        onPress={send}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {busy ? "Requesting…" : sent ? "Email requested" : "Send reset email"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/login")}
        style={styles.link}
      >
        <Text>Back to sign in</Text>
      </Pressable>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { padding: 24, gap: 18, flexGrow: 1, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "800" },
  body: { fontSize: 16, lineHeight: 23, color: "#444" },
  input: { borderWidth: 1, borderColor: "#bbb", borderRadius: 12, padding: 14, fontSize: 16 },
  button: { backgroundColor: "#c8102e", borderRadius: 24, padding: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  link: { padding: 16, alignItems: "center" },
});
