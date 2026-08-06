import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

type Person = { id: string; full_name: string | null };
type Membership = { user_id: string; role: string; status: string };
type Training = {
  user_id: string;
  certificate_valid_to: string | null;
  completed_at: string | null;
};
type Evidence = { subject_user_id: string | null; expires_at: string | null };

const daysUntil = (date: string | null) =>
  date ? Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000) : null;

export default function StaffCompliance() {
  const { session, role, loading } = useSession();
  const [people, setPeople] = useState<Person[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [training, setTraining] = useState<Training[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    const client = supabase as any;
    const [profileResult, membershipResult, trainingResult, evidenceResult] = await Promise.all([
      client.from("profiles").select("id,full_name").order("full_name"),
      client.from("organization_memberships").select("user_id,role,status").eq("status", "active"),
      client.from("training_records").select("user_id,certificate_valid_to,completed_at"),
      client
        .from("documents")
        .select("subject_user_id,expires_at")
        .is("archived_at", null)
        .not("subject_user_id", "is", null),
    ]);
    setPeople(profileResult.data ?? []);
    setMemberships(membershipResult.data ?? []);
    setTraining(trainingResult.data ?? []);
    setEvidence(evidenceResult.data ?? []);
    setRefreshing(false);
  }, []);
  useEffect(() => {
    if (session && (role === "owner" || role === "manager")) void load();
  }, [load, role, session]);
  const rows = useMemo(
    () =>
      memberships.map((member) => {
        const person = people.find((profile) => profile.id === member.user_id);
        const records = training.filter((record) => record.user_id === member.user_id);
        const documents = evidence.filter(
          (document) => document.subject_user_id === member.user_id,
        );
        const expiryDays = [
          ...records.map((record) => daysUntil(record.certificate_valid_to)),
          ...documents.map((document) => daysUntil(document.expires_at)),
        ]
          .filter((value): value is number => value !== null)
          .sort((a, b) => a - b)[0];
        return {
          ...member,
          name: person?.full_name || "Unnamed staff member",
          records,
          documents,
          expiryDays,
        };
      }),
    [evidence, memberships, people, training],
  );
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (role !== "owner" && role !== "manager") return <Redirect href="/dashboard" />;
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.eyebrow}>PEOPLE & EVIDENCE</Text>
      <Text style={styles.title}>Staff compliance</Text>
      <Text style={styles.intro}>
        See training and staff-linked evidence together. Amber means due within 30 days; red is
        expired.
      </Text>
      {rows.map((row) => {
        const status =
          row.expiryDays === undefined
            ? "No expiry recorded"
            : row.expiryDays < 0
              ? `Expired ${Math.abs(row.expiryDays)} days ago`
              : row.expiryDays <= 30
                ? `Due in ${row.expiryDays} days`
                : "Current";
        const statusStyle =
          row.expiryDays !== undefined && row.expiryDays < 0
            ? styles.red
            : row.expiryDays !== undefined && row.expiryDays <= 30
              ? styles.amber
              : styles.green;
        return (
          <View key={row.user_id} style={styles.card}>
            <View style={styles.headingRow}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{row.name}</Text>
                <Text style={styles.meta}>{row.role.replaceAll("_", " ")}</Text>
              </View>
              <Text style={[styles.badge, statusStyle]}>{status}</Text>
            </View>
            <Text style={styles.detail}>
              {row.records.length} training record{row.records.length === 1 ? "" : "s"} ·{" "}
              {row.documents.length} document{row.documents.length === 1 ? "" : "s"}
            </Text>
            <Pressable style={styles.action} onPress={() => router.push("/documents")}>
              <Text style={styles.actionText}>Add or review evidence</Text>
            </Pressable>
          </View>
        );
      })}
      {!refreshing && rows.length === 0 && <Text style={styles.empty}>No active staff found.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 13 },
  eyebrow: { color: "#c8102e", fontSize: 11, fontWeight: "900", letterSpacing: 1.8 },
  title: { fontSize: 24, fontWeight: "800" },
  intro: { color: "#666", fontSize: 13, lineHeight: 19, marginBottom: 3 },
  card: {
    backgroundColor: "white",
    borderColor: "#ddd",
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  headingRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  meta: { color: "#666", fontSize: 11, marginTop: 2, textTransform: "capitalize" },
  badge: {
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  red: { backgroundColor: "#fee4e1", color: "#9d2118" },
  amber: { backgroundColor: "#fff0c2", color: "#745000" },
  green: { backgroundColor: "#dcf5e6", color: "#17633a" },
  detail: { color: "#555", fontSize: 12 },
  action: {
    alignSelf: "flex-start",
    borderColor: "#bbb",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  actionText: { fontSize: 12, fontWeight: "800" },
  empty: { color: "#666", paddingVertical: 30, textAlign: "center" },
});
