import * as Linking from "expo-linking";
import { Redirect } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

const webAppUrl = (process.env.EXPO_PUBLIC_WEB_APP_URL || "https://app.haccora.co.uk").replace(
  /\/$/,
  "",
);

export default function PlatformAccess() {
  const { session, platformRole, loading } = useSession();
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!platformRole) return <Redirect href="/" />;

  const openConsole = async () => {
    const url = `${webAppUrl}/platform`;
    if (!(await Linking.canOpenURL(url))) {
      Alert.alert("Web console unavailable", "Open app.haccora.co.uk in your browser.");
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <View style={styles.page}>
      <Text style={styles.eyebrow}>SAAS OPERATIONS</Text>
      <Text style={styles.title}>Continue in the secure web console</Text>
      <Text style={styles.body}>
        Customer administration, subscriptions, support and platform audit tools are deliberately
        kept in Haccora's web console. Tenant food-safety evidence remains isolated by RLS.
      </Text>
      <View style={styles.roleCard}>
        <Text style={styles.roleLabel}>SIGNED IN AS</Text>
        <Text style={styles.role}>{platformRole.replaceAll("_", " ")}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={openConsole} style={styles.primary}>
        <Text style={styles.primaryText}>Open web console</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => supabase.auth.signOut()}
        style={styles.secondary}
      >
        <Text style={styles.secondaryText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#fff", flex: 1, gap: 14, justifyContent: "center", padding: 24 },
  eyebrow: { color: "#c8102e", fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  title: { color: "#111", fontSize: 24, fontWeight: "900", lineHeight: 30 },
  body: { color: "#555", fontSize: 14, lineHeight: 21 },
  roleCard: { backgroundColor: "#f5f5f5", borderRadius: 14, gap: 5, marginTop: 4, padding: 16 },
  roleLabel: { color: "#777", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  role: { color: "#111", fontSize: 15, fontWeight: "800", textTransform: "capitalize" },
  primary: { alignItems: "center", backgroundColor: "#c8102e", borderRadius: 24, padding: 15 },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  secondary: {
    alignItems: "center",
    borderColor: "#d8d8d8",
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  secondaryText: { color: "#222", fontSize: 14, fontWeight: "800" },
});
