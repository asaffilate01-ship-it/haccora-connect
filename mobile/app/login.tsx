import { Redirect, router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

export default function Login() {
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState(false);
  if (session) return <Redirect href="/dashboard" />;
  const submit = async () => {
    if (submitting.current || !email.trim() || !password) return;
    submitting.current = true;
    setBusy(true);
    setError(false);
    try {
      const { error: failure } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (failure) throw failure;
      router.replace("/");
    } catch {
      setError(true);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={styles.page}>
      <BrandLogo maxWidth={220} style={styles.brand} />
      <Text style={styles.title}>Welcome back</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        accessibilityLabel="Email"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        autoCapitalize="none"
        autoComplete="current-password"
        secureTextEntry
        accessibilityLabel="Password"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      {error && (
        <Text accessibilityRole="alert">
          Sign in failed. Check your details and connection, then try again.
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={busy || !email.trim() || !password}
        accessibilityState={{ disabled: busy || !email.trim() || !password, busy }}
        onPress={submit}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{busy ? "Signing in…" : "Sign in"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", padding: 24, gap: 14, backgroundColor: "#fff" },
  brand: { alignSelf: "flex-start", marginBottom: 4 },
  title: { color: "#111", fontSize: 24, fontWeight: "800", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#d8d8d8", borderRadius: 12, padding: 14, fontSize: 16 },
  button: {
    backgroundColor: "#bd2b1b",
    minHeight: 48,
    borderRadius: 24,
    padding: 15,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
