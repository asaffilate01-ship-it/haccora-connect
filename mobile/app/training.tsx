import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
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
type Course = { id: string; title_en: string; required: boolean };
type RecordRow = {
  id: string;
  user_id: string;
  course_id: string | null;
  course_name: string | null;
  provider: string | null;
  certificate_reference: string | null;
  completed_at: string | null;
  certificate_valid_to: string | null;
  verified_at: string | null;
};

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const daysUntil = (date: string | null) =>
  date ? Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86_400_000) : null;

export default function Training() {
  const { session, role, organizationId, locationId, loading } = useSession();
  const manager = role === "owner" || role === "manager";
  const [people, setPeople] = useState<Person[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [personId, setPersonId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [provider, setProvider] = useState("");
  const [reference, setReference] = useState("");
  const [completedOn, setCompletedOn] = useState("");
  const [validTo, setValidTo] = useState("");
  const load = useCallback(async () => {
    setRefreshing(true);
    const [profileResult, courseResult, recordResult] = await Promise.all([
      supabase.from("profiles").select("id,full_name").order("full_name"),
      supabase
        .from("training_courses")
        .select("id,title_en,required")
        .order("required", { ascending: false }),
      supabase
        .from("training_records")
        .select(
          "id,user_id,course_id,course_name,provider,certificate_reference,completed_at,certificate_valid_to,verified_at",
        )
        .order("completed_at", { ascending: false }),
    ]);
    setPeople((profileResult.data ?? []) as Person[]);
    setCourses((courseResult.data ?? []) as Course[]);
    setRecords((recordResult.data ?? []) as RecordRow[]);
    setRefreshing(false);
  }, []);
  useEffect(() => {
    if (session) void load();
  }, [load, session]);
  const visibleRecords = useMemo(
    () => (manager ? records : records.filter((record) => record.user_id === session?.user.id)),
    [manager, records, session?.user.id],
  );
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;

  const save = async () => {
    const selectedPerson = personId || session.user.id;
    if (!selectedPerson || (!courseId && courseName.trim().length < 2) || !provider.trim()) {
      Alert.alert(
        "Add required details",
        "Choose a course or enter a title, and add the provider.",
      );
      return;
    }
    if (!validDate(completedOn) || (validTo && !validDate(validTo))) {
      Alert.alert("Check the dates", "Use YYYY-MM-DD, for example 2026-08-06.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("training_records").insert({
      user_id: selectedPerson,
      organization_id: organizationId,
      location_id: locationId,
      course_id: courseId || null,
      course_name: courseId ? null : courseName.trim(),
      provider: provider.trim(),
      certificate_reference: reference.trim() || null,
      progress: 100,
      completed_at: `${completedOn}T12:00:00.000Z`,
      certificate_valid_to: validTo || null,
      verified_at: manager ? new Date().toISOString() : null,
      verified_by: manager ? session.user.id : null,
      verification_note: manager ? "Certificate details entered by an organisation manager" : null,
    });
    setSaving(false);
    if (error) return Alert.alert("Could not save training", error.message);
    setCourseId("");
    setCourseName("");
    setProvider("");
    setReference("");
    setCompletedOn("");
    setValidTo("");
    await load();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.eyebrow}>PEOPLE & EVIDENCE</Text>
      <Text style={styles.title}>Training & certificates</Text>
      <Text style={styles.intro}>
        Record completed UK food-safety training and keep renewal evidence inspection ready.
      </Text>
      {manager && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Add completed training</Text>
          <Text style={styles.hint}>Staff member</Text>
          <View style={styles.chips}>
            {people.map((person) => (
              <Chip
                key={person.id}
                label={person.full_name || "Unnamed staff"}
                active={personId === person.id}
                onPress={() => setPersonId(person.id)}
              />
            ))}
          </View>
          <Text style={styles.hint}>Course</Text>
          <View style={styles.chips}>
            {courses.map((course) => (
              <Chip
                key={course.id}
                label={course.title_en}
                active={courseId === course.id}
                onPress={() => {
                  setCourseId(course.id);
                  setCourseName("");
                }}
              />
            ))}
            <Chip label="External / other" active={!courseId} onPress={() => setCourseId("")} />
          </View>
          {!courseId && (
            <Field
              value={courseName}
              onChangeText={setCourseName}
              placeholder="External course title"
            />
          )}
          <Field value={provider} onChangeText={setProvider} placeholder="Training provider" />
          <Field
            value={reference}
            onChangeText={setReference}
            placeholder="Certificate reference (optional)"
          />
          <View style={styles.dateRow}>
            <Field
              value={completedOn}
              onChangeText={setCompletedOn}
              placeholder="Completed YYYY-MM-DD"
              compact
            />
            <Field
              value={validTo}
              onChangeText={setValidTo}
              placeholder="Valid to YYYY-MM-DD"
              compact
            />
          </View>
          <Pressable disabled={saving} style={styles.primary} onPress={() => void save()}>
            <Text style={styles.primaryText}>{saving ? "Saving…" : "Save verified training"}</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>{manager ? "Team records" : "My records"}</Text>
        <Pressable onPress={() => router.push("/documents")}>
          <Text style={styles.link}>Certificate files ›</Text>
        </Pressable>
      </View>
      {visibleRecords.map((record) => {
        const course = courses.find((item) => item.id === record.course_id);
        const person = people.find((item) => item.id === record.user_id);
        const days = daysUntil(record.certificate_valid_to);
        const status =
          days === null
            ? "No renewal date"
            : days < 0
              ? `Expired ${Math.abs(days)}d ago`
              : days <= 30
                ? `Due in ${days}d`
                : "Current";
        const statusStyle =
          days !== null && days < 0
            ? styles.red
            : days !== null && days <= 30
              ? styles.amber
              : styles.green;
        return (
          <View key={record.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>
                  {course?.title_en || record.course_name || "Training record"}
                </Text>
                {manager && (
                  <Text style={styles.meta}>{person?.full_name || "Unnamed staff member"}</Text>
                )}
              </View>
              <Text style={[styles.badge, statusStyle]}>{status}</Text>
            </View>
            <Text style={styles.detail}>
              {record.provider || "Provider not recorded"}
              {record.certificate_reference ? ` · ${record.certificate_reference}` : ""}
            </Text>
            <Text style={styles.meta}>
              Completed{" "}
              {record.completed_at
                ? new Date(record.completed_at).toLocaleDateString("en-GB")
                : "not recorded"}{" "}
              · {record.verified_at ? "manager verified" : "awaiting verification"}
            </Text>
          </View>
        );
      })}
      {!refreshing && visibleRecords.length === 0 && (
        <Text style={styles.empty}>No training records yet.</Text>
      )}
      <Text style={styles.disclaimer}>
        Haccora records evidence supplied by the business. It does not represent that an external
        course is accredited or replace competent food-safety instruction.
      </Text>
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  compact = false,
  ...props
}: ComponentProps<typeof TextInput> & { compact?: boolean }) {
  return (
    <TextInput
      {...props}
      autoCapitalize="sentences"
      style={[styles.input, compact && styles.compactInput]}
    />
  );
}

const styles = StyleSheet.create({
  page: { gap: 12, padding: 18, paddingBottom: 90 },
  eyebrow: { color: "#c8102e", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { fontSize: 22, fontWeight: "800" },
  intro: { color: "#666", fontSize: 12, lineHeight: 17 },
  form: {
    backgroundColor: "white",
    borderColor: "#ddd",
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 15,
  },
  formTitle: { fontSize: 16, fontWeight: "800" },
  hint: {
    color: "#666",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderColor: "#ccc",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { color: "#555", fontSize: 10, fontWeight: "700" },
  chipTextActive: { color: "white" },
  input: {
    borderColor: "#bbb",
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 45,
    paddingHorizontal: 11,
    fontSize: 12,
  },
  dateRow: { flexDirection: "row", gap: 8 },
  compactInput: { flex: 1 },
  primary: {
    alignItems: "center",
    backgroundColor: "#c8102e",
    borderRadius: 11,
    minHeight: 47,
    justifyContent: "center",
  },
  primaryText: { color: "white", fontSize: 12, fontWeight: "800" },
  sectionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  link: { color: "#c8102e", fontSize: 11, fontWeight: "800" },
  card: {
    backgroundColor: "white",
    borderColor: "#ddd",
    borderRadius: 14,
    borderWidth: 1,
    gap: 7,
    padding: 14,
  },
  cardHeader: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "800" },
  meta: { color: "#777", fontSize: 10, marginTop: 2 },
  detail: { color: "#444", fontSize: 11 },
  badge: {
    borderRadius: 999,
    fontSize: 9,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  red: { backgroundColor: "#fee4e1", color: "#9d2118" },
  amber: { backgroundColor: "#fff0c2", color: "#745000" },
  green: { backgroundColor: "#dcf5e6", color: "#17633a" },
  empty: { color: "#666", paddingVertical: 30, textAlign: "center" },
  disclaimer: { color: "#777", fontSize: 10, lineHeight: 15, marginTop: 5 },
});
