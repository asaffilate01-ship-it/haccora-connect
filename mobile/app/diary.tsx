import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { operationalDate } from "@/lib/operational-day";
import {
  DIARY_FIELDS,
  diaryLocked,
  diaryProblem,
  diaryValues,
  draftFromDiary,
  emptyDiary,
  type DiaryDraft,
  type DiaryRecord,
} from "@/lib/diary-integrity";
import { colours, screen } from "@/lib/theme";

export default function Diary() {
  const workspace = useSession();
  const { session, organizationId, locationId, loading, role, workspaceReady, serviceStatus } =
    workspace;
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  if (serviceStatus !== "active") return <Redirect href="/account-status" />;
  if (role === "inspector") return <Redirect href="/inspection-readiness" />;
  if (!organizationId || !locationId || !role) {
    return <Text style={styles.help}>Select a premises to review its daily diary.</Text>;
  }
  return (
    <SiteDiary
      key={`${session.user.id}:${organizationId}:${locationId}:${role}`}
      organizationId={organizationId}
      locationId={locationId}
      userId={session.user.id}
    />
  );
}

function SiteDiary({
  organizationId,
  locationId,
  userId,
}: {
  organizationId: string;
  locationId: string;
  userId: string;
}) {
  const [date, setDate] = useState("");
  const [draft, setDraft] = useState<DiaryDraft>(emptyDiary);
  const [record, setRecord] = useState<DiaryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const active = useRef(false);
  const requestId = useRef(0);
  const writeLock = useRef(false);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    const day = operationalDate(new Date(), "Europe/London");
    setDate(day);
    setAvailable(false);
    setLoading(true);
    setError("");
    try {
      const result = await supabase
        .from("daily_diary_entries")
        .select(DIARY_FIELDS)
        .eq("organization_id", organizationId)
        .eq("location_id", locationId)
        .eq("diary_date", day)
        .maybeSingle();
      if (!active.current || request !== requestId.current) return;
      if (result.error) throw result.error;
      const saved = result.data as DiaryRecord | null;
      setRecord(saved);
      setDraft(draftFromDiary(saved));
      setAvailable(true);
    } catch {
      if (active.current && request === requestId.current) {
        setRecord(null);
        setDraft(emptyDiary);
        setError("Diary unavailable. Refresh before recording evidence.");
      }
    } finally {
      if (active.current && request === requestId.current) setLoading(false);
    }
  }, [organizationId, locationId]);

  useFocusEffect(
    useCallback(() => {
      active.current = true;
      setMessage("");
      void load();
      return () => {
        active.current = false;
        requestId.current += 1;
      };
    }, [load]),
  );

  const readOnly = diaryLocked(record);
  const editable = available && !saving && !readOnly;

  function edit(patch: Partial<DiaryDraft>) {
    setDraft((previous) => ({ ...previous, ...patch }));
    setMessage("");
  }

  async function save() {
    if (!editable || writeLock.current || !active.current) return;
    if (date !== operationalDate(new Date(), "Europe/London")) {
      setAvailable(false);
      setError("The UK operational date changed. Refresh to load today's diary.");
      return;
    }
    const problem = diaryProblem(draft);
    if (problem) {
      setError(
        problem === "Corrective action required"
          ? "Corrective action required: explain what was done."
          : problem,
      );
      return;
    }
    writeLock.current = true;
    setSaving(true);
    setMessage("");
    setError("");
    const request = requestId.current;
    const values = { ...diaryValues(draft), updated_at: new Date().toISOString() };
    try {
      const write = record
        ? supabase
            .from("daily_diary_entries")
            .update(values)
            .eq("id", record.id)
            .eq("organization_id", organizationId)
            .eq("location_id", locationId)
            .eq("diary_date", date)
            .eq("updated_at", record.updated_at)
            .is("signed_off_at", null)
            .is("signed_off_by", null)
        : supabase.from("daily_diary_entries").insert({
            ...values,
            organization_id: organizationId,
            location_id: locationId,
            diary_date: date,
            created_by: userId,
          });
      const result = await write.select(DIARY_FIELDS).single();
      if (!active.current || request !== requestId.current) return;
      const saved = result.data as DiaryRecord | null;
      if (result.error || !saved || saved.diary_date !== date) {
        throw new Error("Diary save not confirmed");
      }
      setRecord(saved);
      setDraft(draftFromDiary(saved));
      setMessage("Diary draft saved.");
    } catch {
      if (active.current && request === requestId.current) {
        await load();
        setError("Save not confirmed. Review the latest diary before retrying.");
      }
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>DAILY FOOD SAFETY RECORD</Text>
      <Text style={styles.title}>Daily diary</Text>
      <Text style={styles.help}>
        UK operational date: {date || "Loading"}. Record actual checks and corrective action.
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {message && (
        <Text accessibilityLiveRegion="polite" style={styles.help}>
          {message}
        </Text>
      )}
      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading saved diary" />
      ) : !available ? (
        <Text style={styles.help}>Saved evidence unavailable.</Text>
      ) : (
        <View style={styles.card}>
          <Text style={styles.help}>
            {readOnly
              ? "Signature recorded. This entry is read-only."
              : record
                ? "Saved draft"
                : "No saved entry. Start a new draft."}
          </Text>
          <View style={styles.row}>
            <Text style={styles.label}>Opening checks completed</Text>
            <Switch
              accessibilityLabel="Opening checks completed"
              disabled={!editable}
              value={draft.opening}
              onValueChange={(opening) => edit({ opening })}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Closing checks completed</Text>
            <Switch
              accessibilityLabel="Closing checks completed"
              disabled={!editable}
              value={draft.closing}
              onValueChange={(closing) => edit({ closing })}
            />
          </View>
          <Text style={styles.label}>Problems or unusual events</Text>
          <TextInput
            accessibilityLabel="Problems or unusual events"
            style={styles.input}
            multiline
            maxLength={10000}
            editable={editable}
            value={draft.problems}
            onChangeText={(problems) => edit({ problems })}
          />
          <Text style={styles.label}>Corrective action</Text>
          <TextInput
            accessibilityLabel="Corrective action"
            style={styles.input}
            multiline
            maxLength={10000}
            editable={editable}
            value={draft.actions}
            onChangeText={(actions) => edit({ actions })}
          />
          {!readOnly && (
            <Pressable
              accessibilityRole="button"
              disabled={!editable}
              style={[styles.button, !editable && styles.disabled]}
              onPress={() => void save()}
            >
              <Text style={styles.buttonText}>{saving ? "Saving…" : "Save draft"}</Text>
            </Pressable>
          )}
          <Text style={styles.help}>Manager sign-off is available in the full web workspace.</Text>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={loading || saving}
        style={styles.refresh}
        onPress={() => {
          setMessage("");
          void load();
        }}
      >
        <Text style={styles.label}>Refresh saved diary</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { ...screen, gap: 14 },
  eyebrow: { color: colours.brand, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { fontSize: 24, fontWeight: "800", color: colours.ink },
  help: { color: colours.muted, fontSize: 13, lineHeight: 19 },
  error: { color: colours.danger, fontSize: 13, lineHeight: 19 },
  card: {
    padding: 16,
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colours.line,
    backgroundColor: colours.card,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, justifyContent: "space-between" },
  label: { fontSize: 14, fontWeight: "700", color: colours.ink, flexShrink: 1 },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colours.line,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: colours.ink,
    textAlignVertical: "top",
  },
  button: { backgroundColor: colours.ink, padding: 16, borderRadius: 14 },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "800", textAlign: "center" },
  refresh: { minHeight: 48, justifyContent: "center", alignItems: "center" },
});
