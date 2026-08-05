import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

export function CompliancePage({
  eyebrow,
  title,
  intro,
  loading,
  children,
  footer,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  intro: string;
  loading: boolean;
  footer: string;
}>) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.intro}>{intro}</Text>
      {loading ? <ActivityIndicator accessibilityLabel="Loading records" /> : children}
      <Text style={styles.footer}>{footer}</Text>
    </ScrollView>
  );
}

export function ComplianceCard({
  title,
  detail,
  status,
  children,
}: PropsWithChildren<{ title: string; detail?: string | null; status?: ReactNode }>) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.cardTitle}>{title}</Text>
        {status}
      </View>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {children}
    </View>
  );
}

export const complianceStyles = StyleSheet.create({
  badge: {
    backgroundColor: "#e8f5ec",
    borderRadius: 999,
    color: "#176b38",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  warning: { backgroundColor: "#fff0c7", color: "#7b5600" },
  empty: { color: "#666", fontSize: 13, paddingVertical: 18, textAlign: "center" },
});

const styles = StyleSheet.create({
  page: { padding: 20, gap: 12 },
  eyebrow: { color: "#e43f2c", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  title: { fontSize: 24, fontWeight: "800" },
  intro: { color: "#555", fontSize: 13, lineHeight: 19, marginBottom: 4 },
  card: {
    backgroundColor: "#fff",
    borderColor: "#e5e5e5",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  row: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "800" },
  detail: { color: "#666", fontSize: 12, lineHeight: 18, marginTop: 6 },
  footer: { color: "#777", fontSize: 11, lineHeight: 16, marginTop: 8 },
});
