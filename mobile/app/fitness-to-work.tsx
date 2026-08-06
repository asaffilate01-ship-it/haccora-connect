import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  user_id: string;
  staff_name: string;
  kind: string;
  status: string;
  symptoms: string | null;
  notes: string | null;
  created_at: string;
  cleared_at: string | null;
  clearance_note: string | null;
};

export default function FitnessToWork() {
  const { session, role, organizationId, locationId, loading } = useSession();
  const manager = role === "owner" || role === "manager";
  const [rows, setRows] = useState<Row[]>([]);
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const { data, error } = await supabase
      .from("health_register")
      .select(
        "id,user_id,staff_name,kind,status,symptoms,notes,created_at,cleared_at,clearance_note",
      )
      .order("created_at", { ascending: false });
    setRefreshing(false);
    if (error) Alert.alert("Could not load health reports", error.message);
    else setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    if (session) void load();
  }, [load, session]);
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;

  const report = async () => {
    if (symptoms.trim().length < 3) {
      return Alert.alert(
        "Describe the concern",
        "Record the symptoms or reason you may not be fit to handle food.",
      );
    }
    setSaving(true);
    const name = session.user.user_metadata?.full_name || session.user.email || "Staff member";
    const { error } = await supabase.from("health_register").insert({
      organization_id: organizationId,
      location_id: locationId,
      user_id: session.user.id,
      reported_by: session.user.id,
      staff_name: name,
      kind: "sick_leave",
      status: "excluded",
      issued_on: new Date().toISOString().slice(0, 10),
      symptoms: symptoms.trim(),
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) return Alert.alert("Could not submit report", error.message);
    setSymptoms("");
    setNotes("");
    Alert.alert(
      "Report saved",
      "Do not handle food. Contact your manager and follow your business sickness procedure.",
    );
    await load();
  };

  const clear = (row: Row) =>
    Alert.alert(
      "Confirm return to work",
      "Confirm that an authorised manager has reviewed the report and the business return-to-work procedure has been satisfied.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm clearance",
          onPress: async () => {
            const { error } = await supabase.rpc("clear_health_exclusion", {
              p_record_id: row.id,
              p_clearance_note:
                "Manager reviewed the report and confirmed the return-to-work procedure was satisfied.",
            });
            if (error) return Alert.alert("Could not clear exclusion", error.message);
            await load();
          },
        },
      ],
    );

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.eyebrow}>STAFF SAFETY</Text>
      <Text style={styles.title}>Fitness to work</Text>
      <Text style={styles.intro}>
        Report sickness before handling food. Reports are private to you and authorised managers.
      </Text>
      <View style={styles.warning}>
        <Text style={styles.warningTitle}>Do not handle food if you may contaminate it</Text>
        <Text style={styles.warningText}>
          Tell your manager promptly about vomiting, diarrhoea, infected skin lesions or other
          relevant symptoms. Follow current business and official guidance before returning.
        </Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Report a fitness concern</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder="Symptoms or reason"
        />
        <TextInput
          style={styles.input}
          value={notes}
          onChangeText={setNotes}
          placeholder="Useful operational detail (optional)"
        />
        <Pressable disabled={saving} style={styles.primary} onPress={() => void report()}>
          <Text style={styles.primaryText}>{saving ? "Submitting…" : "Submit private report"}</Text>
        </Pressable>
      </View>
      <Text style={styles.section}>{manager ? "Team reports" : "My reports"}</Text>
      {rows.map((row) => (
        <View key={row.id} style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{row.staff_name}</Text>
              <Text style={styles.meta}>{new Date(row.created_at).toLocaleString("en-GB")}</Text>
            </View>
            <Text style={[styles.badge, row.status === "excluded" ? styles.red : styles.green]}>
              {row.status === "excluded" ? "Excluded" : "Cleared"}
            </Text>
          </View>
          <Text style={styles.body}>{row.symptoms || "No symptoms recorded"}</Text>
          {!!row.notes && <Text style={styles.meta}>{row.notes}</Text>}
          {row.cleared_at ? (
            <Text style={styles.cleared}>
              Manager cleared {new Date(row.cleared_at).toLocaleString("en-GB")}
              {row.clearance_note ? ` · ${row.clearance_note}` : ""}
            </Text>
          ) : manager ? (
            <Pressable style={styles.secondary} onPress={() => clear(row)}>
              <Text style={styles.secondaryText}>Record return-to-work clearance</Text>
            </Pressable>
          ) : (
            <Text style={styles.awaiting}>Awaiting manager review</Text>
          )}
        </View>
      ))}
      {!refreshing && rows.length === 0 && (
        <Text style={styles.empty}>No fitness-to-work reports.</Text>
      )}
      <Text style={styles.disclaimer}>
        Haccora records the business decision and evidence. It does not provide medical advice. Seek
        appropriate medical advice or contact your local authority where required.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { gap: 12, padding: 18, paddingBottom: 90 },
  eyebrow: { color: "#c8102e", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { fontSize: 22, fontWeight: "800" },
  intro: { color: "#666", fontSize: 12, lineHeight: 17 },
  warning: { backgroundColor: "#fff0c7", borderRadius: 14, padding: 13 },
  warningTitle: { color: "#6f4900", fontSize: 12, fontWeight: "900" },
  warningText: { color: "#6f4900", fontSize: 11, lineHeight: 16, marginTop: 4 },
  form: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 14,
    borderWidth: 1,
    gap: 9,
    padding: 14,
  },
  formTitle: { fontSize: 15, fontWeight: "800" },
  input: {
    backgroundColor: "#fafafa",
    borderColor: "#ddd",
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 12,
    padding: 11,
  },
  multiline: { minHeight: 82, textAlignVertical: "top" },
  primary: { alignItems: "center", backgroundColor: "#b42318", borderRadius: 10, padding: 11 },
  primaryText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  section: {
    color: "#555",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#fff",
    borderColor: "#e1e1e1",
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 13,
  },
  cardTop: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "800" },
  meta: { color: "#777", fontSize: 10, lineHeight: 15 },
  body: { color: "#333", fontSize: 12, lineHeight: 18 },
  badge: {
    borderRadius: 12,
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  red: { backgroundColor: "#fde2e2", color: "#a61b1b" },
  green: { backgroundColor: "#dff4e7", color: "#176b3a" },
  secondary: {
    alignItems: "center",
    borderColor: "#111",
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  secondaryText: { fontSize: 11, fontWeight: "800" },
  awaiting: { color: "#9a6700", fontSize: 11, fontWeight: "700" },
  cleared: { color: "#176b3a", fontSize: 10, fontWeight: "700", lineHeight: 15 },
  empty: { color: "#777", fontSize: 12, paddingVertical: 16, textAlign: "center" },
  disclaimer: { color: "#777", fontSize: 10, lineHeight: 15 },
});
