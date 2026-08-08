import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

export default function Login() {
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  if (session) return <Redirect href="/dashboard" />;
  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) Alert.alert("Sign in failed", error.message);
    else router.replace("/");
  };
  return (
    <View style={styles.page}>
      <Text style={styles.brand}>HACCORA</Text>
      <Text style={styles.title}>Safe. Clean. Traceable.</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        autoCapitalize="none"
        autoComplete="current-password"
        secureTextEntry
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        disabled={busy || !email || !password}
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
  brand: { color: "#e43f2c", fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  title: { color: "#111", fontSize: 24, fontWeight: "800", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#d8d8d8", borderRadius: 12, padding: 14, fontSize: 16 },
  button: { backgroundColor: "#e43f2c", borderRadius: 24, padding: 15, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
