import * as Linking from "expo-linking";
import { Redirect } from "expo-router";
import { LockKeyhole } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { colours } from "@/lib/theme";

export default function AccountStatus() {
  const { session, organizationName, serviceStatus, loading } = useSession();
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (serviceStatus === "active") return <Redirect href="/dashboard" />;

  return (
    <View style={styles.page}>
      <View style={styles.icon}>
        <LockKeyhole color={colours.brand} size={28} />
      </View>
      <Text style={styles.eyebrow}>TENANT ACCESS</Text>
      <Text style={styles.title}>
        {serviceStatus === "frozen"
          ? "This workspace is temporarily frozen."
          : "This workspace is closed."}
      </Text>
      <Text style={styles.body}>
        {organizationName ? `${organizationName} is ` : "Your organisation is "}
        not currently available. Food-safety records remain protected and cannot be changed from
        this account.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => Linking.openURL("mailto:support@haccora.co.uk?subject=Workspace%20access")}
        style={styles.primary}
      >
        <Text style={styles.primaryText}>Contact Haccora support</Text>
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
  page: {
    backgroundColor: colours.canvas,
    flex: 1,
    gap: 13,
    justifyContent: "center",
    padding: 24,
  },
  icon: {
    alignItems: "center",
    backgroundColor: colours.brandSoft,
    borderRadius: 16,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  eyebrow: { color: colours.brand, fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: colours.ink, fontSize: 22, fontWeight: "900", lineHeight: 28 },
  body: { color: colours.muted, fontSize: 12.5, lineHeight: 19 },
  primary: {
    alignItems: "center",
    backgroundColor: colours.brand,
    borderRadius: 24,
    marginTop: 5,
    padding: 14,
  },
  primaryText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  secondary: {
    alignItems: "center",
    borderColor: colours.line,
    borderRadius: 24,
    borderWidth: 1,
    padding: 13,
  },
  secondaryText: { color: colours.ink, fontSize: 12, fontWeight: "800" },
});
