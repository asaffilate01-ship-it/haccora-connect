import { useState } from "react";
import { Redirect } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput } from "react-native";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

export default function Diary() {
  const { session, organizationId, locationId, loading, role, workspaceReady } = useSession();
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [problems, setProblems] = useState("");
  const [actions, setActions] = useState("");
  const save = async () => {
    if (!organizationId || !locationId || !session) return;
    if (problems.trim() && !actions.trim()) {
      Alert.alert("Corrective action required", "Explain what was done about every problem.");
      return;
    }
    const { error } = await (supabase as any).from("daily_diary_entries").upsert(
      {
        organization_id: organizationId,
        location_id: locationId,
        diary_date: new Date().toISOString().slice(0, 10),
        opening_checks: { completed: opening },
        closing_checks: { completed: closing },
        problems: problems.trim(),
        corrective_actions: actions.trim(),
        created_by: session.user.id,
      },
      { onConflict: "organization_id,location_id,diary_date" },
    );
    Alert.alert(
      error ? "Could not save" : "Saved",
      error ? "Check your access and try again." : "Today's diary is stored.",
    );
  };
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  if (role === "inspector") return <Redirect href="/inspection-readiness" />;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Today’s diary</Text>
      <Text style={styles.help}>
        Record what happened, not just ticks. Add corrective action whenever something went wrong.
      </Text>
      <Text style={styles.row}>
        Opening checks <Switch value={opening} onValueChange={setOpening} />
      </Text>
      <Text style={styles.row}>
        Closing checks <Switch value={closing} onValueChange={setClosing} />
      </Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Problems or unusual events"
        value={problems}
        onChangeText={setProblems}
      />
      <TextInput
        style={styles.input}
        multiline
        placeholder="Corrective action"
        value={actions}
        onChangeText={setActions}
      />
      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Save diary</Text>
      </Pressable>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { padding: 20, gap: 16 },
  title: { fontSize: 24, fontWeight: "800" },
  help: { color: "#666", lineHeight: 20 },
  row: { fontSize: 16, fontWeight: "700" },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 14,
    padding: 14,
    textAlignVertical: "top",
  },
  button: { backgroundColor: "#111", padding: 16, borderRadius: 14 },
  buttonText: { color: "#fff", fontWeight: "800", textAlign: "center" },
});
