import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export function CompliancePage({
  eyebrow,
  title,
  intro,
  loading,
  children,
  footer,
  error,
  scope,
  onRefresh,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  intro: string;
  loading: boolean;
  footer: string;
  error?: string;
  scope?: string;
  onRefresh?: () => void;
}>) {
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={loading} onRefresh={onRefresh} /> : undefined
      }
    >
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.intro}>{intro}</Text>
      {scope ? <Text style={styles.scope}>{scope}</Text> : null}
      {onRefresh ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
          disabled={loading}
          onPress={onRefresh}
          style={styles.refresh}
        >
          <Text style={styles.refreshText}>{error ? "Retry loading" : "Refresh evidence"}</Text>
        </Pressable>
      ) : null}
      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading records" />
      ) : error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : (
        children
      )}
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
  neutral: { backgroundColor: "#eef0f2", color: "#384453" },
  empty: { color: "#666", fontSize: 13, paddingVertical: 18, textAlign: "center" },
});

const styles = StyleSheet.create({
  page: { padding: 20, gap: 12, paddingBottom: 100 },
  scope: { color: "#39444c", fontSize: 12, fontWeight: "700" },
  refresh: {
    alignItems: "center",
    borderColor: "#d4d9dc",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  refreshText: { color: "#25453b", fontSize: 13, fontWeight: "700" },
  error: {
    backgroundColor: "#fff0c7",
    borderRadius: 12,
    color: "#694800",
    fontSize: 13,
    lineHeight: 19,
    padding: 14,
  },
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
