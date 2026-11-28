import { Redirect, router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { getNativeDemoRoleOptions } from "@/lib/native-demo-role-options";

export default function Login() {
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState(false);
  const [demoRole, setDemoRole] = useState("");
  const [showRoles, setShowRoles] = useState(false);
  const roles = getNativeDemoRoleOptions();
  const selectedRole = roles.find((role) => role.id === demoRole);
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
    <ScrollView
      style={styles.canvas}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <BrandLogo maxWidth={220} style={styles.brand} />
      <Text style={styles.title}>Welcome back</Text>
      {roles.length > 0 && (
        <View style={styles.demoPanel}>
          <Text style={styles.demoTitle}>Choose a demo role</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showRoles, disabled: busy }}
            disabled={busy}
            onPress={() => setShowRoles((current) => !current)}
            style={styles.roleChoice}
          >
            <Text style={styles.demoTitle}>{selectedRole?.label ?? "Select dashboard"}</Text>
          </Pressable>
          {showRoles &&
            roles.map((role) => (
              <Pressable
                key={role.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: role.id === demoRole, disabled: busy }}
                disabled={busy}
                onPress={() => {
                  setDemoRole(role.id);
                  setEmail(role.email);
                  setPassword("");
                  setError(false);
                  setShowRoles(false);
                }}
                style={[styles.roleChoice, role.id === demoRole && styles.selectedRole]}
              >
                <Text style={styles.demoTitle}>{role.label}</Text>
                <Text style={styles.demoText}>{role.description}</Text>
              </Pressable>
            ))}
          <Text style={styles.demoText}>
            Use the private password for the selected identity. SaaS operator roles are available in
            the isolated web demo.
          </Text>
        </View>
      )}
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        accessibilityLabel="Email"
        placeholder="Email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (selectedRole && value !== selectedRole.email) {
            setDemoRole("");
            setPassword("");
          }
        }}
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
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        style={styles.recovery}
        onPress={() => router.push("/forgot-password")}
      >
        <Text style={styles.recoveryText}>Forgot your password?</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: "#fff" },
  page: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 14,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  demoPanel: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, gap: 8 },
  demoTitle: { color: "#0d263b", fontSize: 14, fontWeight: "700" },
  demoText: { color: "#495766", fontSize: 12, lineHeight: 18 },
  roleChoice: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    minHeight: 48,
    padding: 10,
    justifyContent: "center",
    gap: 3,
  },
  selectedRole: { borderColor: "#bd2b1b", backgroundColor: "#fff4f4" },
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
  recovery: { minHeight: 48, justifyContent: "center", alignItems: "center" },
  recoveryText: { color: "#a31024", fontSize: 16, textDecorationLine: "underline" },
});
