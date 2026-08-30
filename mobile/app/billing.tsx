import * as Linking from "expo-linking";
import { Redirect } from "expo-router";
import { CreditCard, ExternalLink, Mail } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/lib/session";
import { colours } from "@/lib/theme";

const webAppUrl = (process.env.EXPO_PUBLIC_WEB_APP_URL || "https://app.haccora.co.uk").replace(
  /\/$/,
  "",
);

export default function Billing() {
  const { role, organizationName, loading } = useSession();
  if (loading) return null;
  if (role !== "owner") return <Redirect href="/more" />;

  return (
    <View style={styles.page}>
      <View style={styles.icon}>
        <CreditCard color={colours.brand} size={26} />
      </View>
      <Text style={styles.eyebrow}>OWNER BILLING</Text>
      <Text style={styles.title}>Billing & subscription</Text>
      <Text style={styles.body}>
        {organizationName ? `${organizationName}'s` : "Your"} billing portal opens securely in the
        Haccora web app. If a payment has failed, existing access continues during the stated grace
        period while new users and premises remain blocked.
      </Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL(`${webAppUrl}/app/billing`)}
        style={styles.primary}
      >
        <ExternalLink color="#fff" size={17} />
        <Text style={styles.primaryText}>Open secure billing</Text>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        onPress={() =>
          Linking.openURL("mailto:support@haccora.co.uk?subject=Haccora%20billing%20support")
        }
        style={styles.secondary}
      >
        <Mail color={colours.ink} size={16} />
        <Text style={styles.secondaryText}>Contact billing support</Text>
      </Pressable>
      <Text style={styles.note}>
        Haccora retains your food-safety records if access is restricted. Payment recovery is
        confirmed by Stripe before access is restored automatically.
      </Text>
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
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  eyebrow: { color: colours.brand, fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: colours.ink, fontSize: 22, fontWeight: "900", lineHeight: 28 },
  body: { color: colours.muted, fontSize: 12.5, lineHeight: 19 },
  primary: {
    alignItems: "center",
    backgroundColor: colours.brand,
    borderRadius: 24,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 5,
    padding: 14,
  },
  primaryText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  secondary: {
    alignItems: "center",
    borderColor: colours.line,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    padding: 13,
  },
  secondaryText: { color: colours.ink, fontSize: 12, fontWeight: "800" },
  note: { color: colours.muted, fontSize: 10.5, lineHeight: 16, marginTop: 2 },
});
