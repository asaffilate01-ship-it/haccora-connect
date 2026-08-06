import { Redirect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type Person = { id: string; full_name: string | null };
type Assignment = {
  id: string;
  user_id: string;
  title: string;
  instructions: string | null;
  due_at: string | null;
  acknowledged_at: string | null;
  acknowledgement_version: string;
  created_at: string;
};

const validDate = (value: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);

export default function Inductions() {
  const { session, role, organizationId, locationId, loading } = useSession();
  const manager = role === "owner" || role === "manager";
  const [people, setPeople] = useState<Person[]>([]);
  const [rows, setRows] = useState<Assignment[]>([]);
  const [personId, setPersonId] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [profiles, assignments] = await Promise.all([
      supabase.from("profiles").select("id,full_name").order("full_name"),
      supabase
        .from("staff_induction_assignments")
        .select(
          "id,user_id,title,instructions,due_at,acknowledged_at,acknowledgement_version,created_at",
        )
        .order("created_at", { ascending: false }),
    ]);
    setPeople((profiles.data ?? []) as Person[]);
    setRows((assignments.data ?? []) as Assignment[]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (session) void load();
  }, [load, session]);

  const visibleRows = useMemo(
    () => (manager ? rows : rows.filter((row) => row.user_id === session?.user.id)),
    [manager, rows, session?.user.id],
  );

  if (loading) return null;
  if (!session) return <Redirect href="/login" />;

  const assign = async () => {
    if (!personId || title.trim().length < 2 || !validDate(dueOn)) {
      return Alert.alert(
        "Check the details",
        "Choose a staff member, add a title and use YYYY-MM-DD for the due date.",
      );
    }
    setSaving(true);
    const { error } = await supabase.from("staff_induction_assignments").insert({
      organization_id: organizationId,
      location_id: locationId,
      user_id: personId,
      assigned_by: session.user.id,
      title: title.trim(),
      instructions: instructions.trim() || null,
      due_at: dueOn ? `${dueOn}T23:59:59.000Z` : null,
    });
    setSaving(false);
    if (error) return Alert.alert("Could not assign induction", error.message);
    setTitle("");
    setInstructions("");
    setDueOn("");
    await load();
  };

  const acknowledge = (row: Assignment) => {
    Alert.alert(
      "Confirm acknowledgement",
      "I confirm that I have read and understood this instruction and will follow it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Acknowledge",
          onPress: async () => {
            const { error } = await supabase.rpc("acknowledge_my_induction", {
              p_assignment_id: row.id,
            });
            if (error) return Alert.alert("Could not acknowledge", error.message);
            await load();
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.eyebrow}>PEOPLE & EVIDENCE</Text>
      <Text style={styles.title}>Staff induction</Text>
      <Text style={styles.intro}>
        Assign site instructions and retain named, time-stamped acknowledgement evidence.
      </Text>
      {manager && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Assign an instruction</Text>
          <Text style={styles.label}>Staff member</Text>
          <View style={styles.chips}>
            {people.map((person) => (
              <Pressable
                key={person.id}
                style={[styles.chip, personId === person.id && styles.chipActive]}
                onPress={() => setPersonId(person.id)}
              >
                <Text style={[styles.chipText, personId === person.id && styles.chipTextActive]}>
                  {person.full_name || "Unnamed staff"}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Instruction or policy title"
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="What the staff member must read and follow"
            multiline
          />
          <TextInput
            style={styles.input}
            value={dueOn}
            onChangeText={setDueOn}
            placeholder="Due YYYY-MM-DD (optional)"
          />
          <Pressable disabled={saving} style={styles.primary} onPress={() => void assign()}>
            <Text style={styles.primaryText}>{saving ? "Assigning…" : "Assign to staff"}</Text>
          </Pressable>
        </View>
      )}
      <Text style={styles.sectionTitle}>
        {manager ? "Team acknowledgements" : "My instructions"}
      </Text>
      {visibleRows.map((row) => {
        const person = people.find((item) => item.id === row.user_id);
        const overdue =
          !row.acknowledged_at && row.due_at && new Date(row.due_at).getTime() < Date.now();
        return (
          <View key={row.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{row.title}</Text>
                {manager && <Text style={styles.meta}>{person?.full_name || "Unnamed staff"}</Text>}
              </View>
              <Text
                style={[
                  styles.badge,
                  row.acknowledged_at ? styles.green : overdue ? styles.red : styles.amber,
                ]}
              >
                {row.acknowledged_at ? "Acknowledged" : overdue ? "Overdue" : "Awaiting"}
              </Text>
            </View>
            {!!row.instructions && <Text style={styles.body}>{row.instructions}</Text>}
            <Text style={styles.meta}>
              Version {row.acknowledgement_version}
              {row.due_at
                ? ` · due ${new Date(row.due_at).toLocaleDateString("en-GB")}`
                : " · no due date"}
            </Text>
            {row.acknowledged_at ? (
              <Text style={styles.evidence}>
                Confirmed {new Date(row.acknowledged_at).toLocaleString("en-GB")}
              </Text>
            ) : row.user_id === session.user.id ? (
              <Pressable style={styles.primary} onPress={() => acknowledge(row)}>
                <Text style={styles.primaryText}>I have read and understood</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {!refreshing && visibleRows.length === 0 && (
        <Text style={styles.empty}>No induction instructions yet.</Text>
      )}
      <Text style={styles.disclaimer}>
        This record supports staff instruction evidence. Businesses remain responsible for suitable
        supervision, training and safe methods for their operation.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { gap: 12, padding: 18, paddingBottom: 90 },
  eyebrow: { color: "#c8102e", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { fontSize: 22, fontWeight: "800" },
  intro: { color: "#666", fontSize: 12, lineHeight: 17 },
  form: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 14,
    borderWidth: 1,
    gap: 9,
    padding: 14,
  },
  formTitle: { fontSize: 15, fontWeight: "800" },
  label: { color: "#555", fontSize: 11, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { backgroundColor: "#f2f2f2", borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7 },
  chipActive: { backgroundColor: "#111" },
  chipText: { fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  input: {
    backgroundColor: "#fafafa",
    borderColor: "#ddd",
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 12,
    padding: 11,
  },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  primary: {
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 10,
    marginTop: 3,
    padding: 11,
  },
  primaryText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  sectionTitle: {
    color: "#555",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginTop: 4,
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
  body: { color: "#333", fontSize: 12, lineHeight: 18 },
  meta: { color: "#777", fontSize: 10, lineHeight: 15 },
  evidence: { color: "#176b3a", fontSize: 11, fontWeight: "700" },
  badge: {
    borderRadius: 12,
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  green: { backgroundColor: "#dff4e7", color: "#176b3a" },
  amber: { backgroundColor: "#fff0c7", color: "#835800" },
  red: { backgroundColor: "#fde2e2", color: "#a61b1b" },
  empty: { color: "#777", fontSize: 12, paddingVertical: 16, textAlign: "center" },
  disclaimer: { color: "#777", fontSize: 10, lineHeight: 15, marginTop: 4 },
});
