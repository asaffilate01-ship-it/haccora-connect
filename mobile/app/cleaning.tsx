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
import { enqueue } from "@/lib/offline-queue";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

type Task = {
  id: string;
  area: string;
  instruction: string;
  chemical: string | null;
  contact_minutes: number | null;
  frequency: string;
  colour_code: string | null;
};
type Completion = { task_id: string | null; completed_at: string; result: string };

export default function Cleaning() {
  const { session, organizationId, locationId, loading, role } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    setRefreshing(true);
    const [taskResult, completionResult] = await Promise.all([
      supabase
        .from("cleaning_tasks")
        .select("id,area,instruction,chemical,contact_minutes,frequency,colour_code")
        .eq("active", true)
        .order("area"),
      supabase
        .from("cleaning_completions")
        .select("task_id,completed_at,result")
        .order("completed_at", { ascending: false })
        .limit(100),
    ]);
    setTasks((taskResult.data ?? []) as Task[]);
    setCompletions((completionResult.data ?? []) as Completion[]);
    setRefreshing(false);
  }, []);
  useEffect(() => {
    if (session) void load();
  }, [load, session]);
  const latest = useMemo(
    () => new Map(completions.map((row) => [row.task_id, row])),
    [completions],
  );
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (role === "inspector") return <Redirect href="/inspection-readiness" />;

  const complete = async (task: Task, result: "satisfactory" | "recleaned" | "issue_reported") => {
    if (!organizationId) return;
    if (result === "issue_reported" && (notes[task.id] || "").trim().length < 3)
      return Alert.alert("Describe the issue", "Record the problem and immediate action.");
    setBusy(task.id);
    try {
      await enqueue("cleaning_completions", {
        organization_id: organizationId,
        location_id: locationId,
        task_id: task.id,
        task_area_snapshot: task.area,
        completed_by: session.user.id,
        completed_at: new Date().toISOString(),
        result,
        notes: (notes[task.id] || "").trim() || null,
      });
      setNotes((current) => ({ ...current, [task.id]: "" }));
      Alert.alert("Cleaning evidence saved", "The record is saved or securely queued for sync.");
      await load();
    } catch {
      Alert.alert("Not saved", "Encrypted app storage was unavailable. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.eyebrow}>CLEANING SCHEDULE</Text>
      <Text style={styles.title}>Clean safely</Text>
      <Text style={styles.intro}>
        Follow the business instruction, chemical directions and contact time. Record problems
        rather than marking an incomplete task as done.
      </Text>
      {tasks.map((task) => {
        const last = latest.get(task.id);
        return (
          <View key={task.id} style={styles.card}>
            <View style={styles.top}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{task.area}</Text>
                <Text style={styles.frequency}>{task.frequency.replace("_", " ")}</Text>
              </View>
              <Text style={styles.last}>
                {last ? new Date(last.completed_at).toLocaleString("en-GB") : "Not completed"}
              </Text>
            </View>
            <Text style={styles.instruction}>{task.instruction}</Text>
            <Text style={styles.meta}>
              {task.chemical || "Use the approved site method"}
              {task.contact_minutes !== null ? ` · ${task.contact_minutes} min contact time` : ""}
              {task.colour_code ? ` · ${task.colour_code}` : ""}
            </Text>
            <TextInput
              style={styles.input}
              value={notes[task.id] || ""}
              onChangeText={(value) => setNotes((current) => ({ ...current, [task.id]: value }))}
              placeholder="Note or corrective action (optional)"
            />
            <View style={styles.actions}>
              <Pressable
                disabled={busy === task.id}
                style={styles.done}
                onPress={() => void complete(task, "satisfactory")}
              >
                <Text style={styles.doneText}>{busy === task.id ? "Saving…" : "Complete"}</Text>
              </Pressable>
              <Pressable
                disabled={busy === task.id}
                style={styles.issue}
                onPress={() => void complete(task, "issue_reported")}
              >
                <Text style={styles.issueText}>Report issue</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      {!refreshing && tasks.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No cleaning schedule yet</Text>
          <Text style={styles.emptyText}>
            An owner or manager can configure site-specific tasks in the Haccora web workspace.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { gap: 12, padding: 18, paddingBottom: 90 },
  eyebrow: { color: "#c8102e", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { fontSize: 22, fontWeight: "800" },
  intro: { color: "#666", fontSize: 12, lineHeight: 17 },
  card: {
    backgroundColor: "#fff",
    borderColor: "#e1e1e1",
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 13,
  },
  top: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "800" },
  frequency: {
    color: "#c8102e",
    fontSize: 9,
    fontWeight: "900",
    marginTop: 2,
    textTransform: "uppercase",
  },
  last: { color: "#777", fontSize: 9, maxWidth: 105, textAlign: "right" },
  instruction: { color: "#333", fontSize: 12, lineHeight: 18 },
  meta: { color: "#666", fontSize: 10, lineHeight: 15 },
  input: {
    backgroundColor: "#fafafa",
    borderColor: "#ddd",
    borderRadius: 9,
    borderWidth: 1,
    fontSize: 11,
    padding: 10,
  },
  actions: { flexDirection: "row", gap: 8 },
  done: { alignItems: "center", backgroundColor: "#176b3a", borderRadius: 9, flex: 1, padding: 10 },
  doneText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  issue: {
    alignItems: "center",
    borderColor: "#b42318",
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  issueText: { color: "#b42318", fontSize: 11, fontWeight: "900" },
  empty: {
    alignItems: "center",
    borderColor: "#ccc",
    borderRadius: 14,
    borderStyle: "dashed",
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: { fontSize: 13, fontWeight: "800" },
  emptyText: { color: "#777", fontSize: 11, lineHeight: 16, marginTop: 4, textAlign: "center" },
});
