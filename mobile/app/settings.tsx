import { Redirect } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useAppLock } from "@/lib/app-lock";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const { session, loading } = useSession();
  const { enabled, setEnabled } = useAppLock();
  const [busy, setBusy] = useState(false);
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  const toggle = async (value: boolean) => {
    const ok = await setEnabled(value);
    if (!ok)
      Alert.alert("Biometrics unavailable", "Set up Face ID, Touch ID or device biometrics first.");
  };
  const privacy = async (type: "export" | "deletion") => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("privacy-requests", {
      body: { type, details: "Submitted from native app" },
    });
    setBusy(false);
    if (error) Alert.alert("Request failed", error.message);
    else
      Alert.alert(
        "Request received",
        type === "deletion"
          ? "Deletion will be reviewed against legal retention duties."
          : "We will prepare your data securely.",
      );
  };
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>SECURITY & PRIVACY</Text>
      <Text style={styles.title}>Protect this device</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.cardTitle}>Biometric app lock</Text>
            <Text style={styles.body}>
              Require device authentication after Haccora leaves the foreground.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={(value) => void toggle(value)}
            trackColor={{ true: "#e43f2c" }}
          />
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your privacy rights</Text>
        <Text style={styles.body}>
          Requests are authenticated, time-stamped and tracked. Legal holds and required food-safety
          retention may limit deletion.
        </Text>
        <Pressable disabled={busy} style={styles.secondary} onPress={() => void privacy("export")}>
          <Text style={styles.secondaryText}>Request data export</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          style={styles.danger}
          onPress={() =>
            Alert.alert(
              "Request account deletion?",
              "This starts a reviewed privacy request; it does not silently erase regulated records.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Continue", style: "destructive", onPress: () => void privacy("deletion") },
              ],
            )
          }
        >
          <Text style={styles.dangerText}>Request account deletion</Text>
        </Pressable>
      </View>
      <Text style={styles.note}>
        Haccora stores authentication tokens in the device secure enclave/keychain where supported.
        Never share screenshots containing food-safety or staff data.
      </Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { padding: 20, gap: 14 },
  eyebrow: { color: "#e43f2c", fontWeight: "900", letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: "800", marginBottom: 4 },
  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ddd",
    gap: 13,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  body: { color: "#666", lineHeight: 20, marginTop: 4 },
  secondary: {
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbb",
  },
  secondaryText: { fontWeight: "800" },
  danger: {
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#fee4e1",
  },
  dangerText: { fontWeight: "800", color: "#9d2118" },
  note: { fontSize: 12, color: "#666", lineHeight: 18 },
});
