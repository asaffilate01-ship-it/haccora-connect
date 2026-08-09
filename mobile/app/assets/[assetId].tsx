import { Redirect, useLocalSearchParams } from "expo-router";
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
import { enqueue } from "@/lib/offline-queue";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

type Asset = {
  id: string;
  organization_id: string;
  location_id: string | null;
  asset_code: string;
  name: string;
  category: string | null;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
  serial: string | null;
  last_service_at: string | null;
  next_service_at: string | null;
  notes: string | null;
  status: string;
  retired_at: string | null;
};
type Event = {
  id: string;
  event_type: string;
  outcome: string;
  title: string;
  notes: string | null;
  recorded_by_name: string;
  recorded_at: string;
  measured_value: number | null;
  measured_unit: string | null;
  corrective_action: string | null;
  scan_recorded_at: string | null;
  scan_latitude: number | null;
  scan_longitude: number | null;
  scan_accuracy_metres: number | null;
};
type Scan = {
  id: string;
  scanned_at: string;
  client_scanned_at: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy_metres: number | null;
};
type Schedule = {
  id: string;
  name: string;
  instructions: string | null;
  event_type: string;
  frequency_days: number;
  measured_unit: string | null;
  minimum_value: number | null;
  maximum_value: number | null;
  next_due_at: string;
};

export default function AssetDetail() {
  const { assetId, scanId } = useLocalSearchParams<{ assetId: string; scanId?: string }>();
  const { session, loading, role, actionPermissions } = useSession();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeScan, setActiveScan] = useState<Scan | null>(null);
  const [scanConsumed, setScanConsumed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState("inspection");
  const [outcome, setOutcome] = useState("pass");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [measuredValue, setMeasuredValue] = useState("");
  const [measuredUnit, setMeasuredUnit] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!assetId) return;
    setRefreshing(true);
    const result = await supabase
      .from("assets")
      .select(
        "id,organization_id,location_id,asset_code,name,category,location,manufacturer,model,serial,last_service_at,next_service_at,notes,status,retired_at",
      )
      .eq("qr_token", assetId)
      .maybeSingle();
    const next = result.data as Asset | null;
    setAsset(next);
    if (next) {
      const [history, scheduleResult, scanResult] = await Promise.all([
        supabase
          .from("asset_events")
          .select(
            "id,event_type,outcome,title,notes,recorded_by_name,recorded_at,measured_value,measured_unit,corrective_action,scan_recorded_at,scan_latitude,scan_longitude,scan_accuracy_metres",
          )
          .eq("asset_id", next.id)
          .order("recorded_at", { ascending: false })
          .limit(250),
        supabase
          .from("asset_check_schedules")
          .select(
            "id,name,instructions,event_type,frequency_days,measured_unit,minimum_value,maximum_value,next_due_at",
          )
          .eq("asset_id", next.id)
          .eq("active", true)
          .order("next_due_at"),
        scanId && !scanConsumed
          ? supabase
              .from("asset_scans")
              .select("id,scanned_at,client_scanned_at,latitude,longitude,accuracy_metres")
              .eq("id", scanId)
              .eq("asset_id", next.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setEvents((history.data ?? []) as Event[]);
      setSchedules((scheduleResult.data ?? []) as Schedule[]);
      setActiveScan((scanResult.data ?? null) as Scan | null);
    }
    setRefreshing(false);
  }, [assetId, scanConsumed, scanId]);
  useEffect(() => {
    if (session) void load();
  }, [load, session]);
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!asset && !refreshing)
    return (
      <View style={styles.center}>
        <Text style={styles.name}>Equipment not available</Text>
        <Text style={styles.intro}>
          The QR may belong to another site, be invalid, or fall outside your role scope.
        </Text>
      </View>
    );
  if (!asset) return null;
  const canRecord = role !== "inspector" && actionPermissions.includes("assets.record");
  const selectedSchedule = schedules.find((item) => item.id === scheduleId);
  const currentReading = measuredValue.trim() ? Number(measuredValue) : null;
  const readingOutsideRange =
    selectedSchedule &&
    currentReading !== null &&
    Number.isFinite(currentReading) &&
    ((selectedSchedule.minimum_value !== null && currentReading < selectedSchedule.minimum_value) ||
      (selectedSchedule.maximum_value !== null && currentReading > selectedSchedule.maximum_value));
  const needsCorrectiveAction = ["fail", "open"].includes(outcome) || Boolean(readingOutsideRange);
  const save = async () => {
    if (title.trim().length < 2)
      return Alert.alert("Add a title", "Briefly describe what was checked or done.");
    const reading = measuredValue.trim() ? Number(measuredValue) : null;
    const schedule = schedules.find((item) => item.id === scheduleId);
    const expectsReading =
      schedule && (schedule.minimum_value !== null || schedule.maximum_value !== null);
    if (expectsReading && !Number.isFinite(reading))
      return Alert.alert("Reading required", "Enter the reading expected by this check.");
    const outsideRange =
      schedule &&
      reading !== null &&
      ((schedule.minimum_value !== null && reading < schedule.minimum_value) ||
        (schedule.maximum_value !== null && reading > schedule.maximum_value));
    const finalOutcome = outsideRange ? "fail" : outcome;
    if (["fail", "open"].includes(finalOutcome) && correctiveAction.trim().length < 2)
      return Alert.alert(
        "Corrective action required",
        "Record what was made safe and what happens next.",
      );
    try {
      await enqueue("asset_events", {
        organization_id: asset.organization_id,
        location_id: asset.location_id,
        asset_id: asset.id,
        event_type: type,
        outcome: finalOutcome,
        title: title.trim(),
        notes: notes.trim() || null,
        schedule_id: scheduleId,
        measured_value: Number.isFinite(reading) ? reading : null,
        measured_unit: measuredUnit.trim() || null,
        corrective_action: correctiveAction.trim() || null,
        recorded_by: session.user.id,
        scan_session_id: activeScan?.id ?? null,
      });
      setTitle("");
      setNotes("");
      setMeasuredValue("");
      setMeasuredUnit("");
      setCorrectiveAction("");
      setScheduleId(null);
      setActiveScan(null);
      setScanConsumed(true);
      Alert.alert(
        "Equipment record saved",
        "The timestamped record is saved or securely queued for sync.",
      );
      await load();
    } catch {
      Alert.alert("Not saved", "Secure offline storage was unavailable. Try again.");
    }
  };
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.eyebrow}>
        {asset.asset_code} · {asset.location || asset.category || "EQUIPMENT"}
      </Text>
      <Text style={styles.title}>{asset.name}</Text>
      <Text style={styles.intro}>
        {[asset.manufacturer, asset.model, asset.serial && `Serial ${asset.serial}`]
          .filter(Boolean)
          .join(" · ") || "Equipment details not completed"}
      </Text>
      <View style={styles.summary}>
        <Summary label="Status" value={asset.retired_at ? "Retired" : asset.status} />
        <Summary
          label="Last service"
          value={
            asset.last_service_at
              ? new Date(asset.last_service_at).toLocaleDateString("en-GB")
              : "None"
          }
        />
        <Summary
          label="Next due"
          value={
            asset.next_service_at
              ? new Date(asset.next_service_at).toLocaleDateString("en-GB")
              : "Not set"
          }
        />
      </View>
      {activeScan && (
        <View style={styles.scanEvidence}>
          <Text style={styles.scanTitle}>QR identity verified for this record</Text>
          <Text style={styles.audit}>
            Server time {new Date(activeScan.scanned_at).toLocaleString("en-GB")}
            {activeScan.latitude !== null && activeScan.longitude !== null
              ? ` · GPS ${Number(activeScan.latitude).toFixed(5)}, ${Number(activeScan.longitude).toFixed(5)} · ±${Math.round(Number(activeScan.accuracy_metres ?? 0))}m`
              : " · GPS not shared"}
          </Text>
        </View>
      )}
      <View style={styles.history}>
        <Text style={styles.formTitle}>Due QR checks</Text>
        <Text style={styles.audit}>Tap a check to load its instructions and expected reading.</Text>
        {schedules.map((schedule) => {
          const overdue = new Date(schedule.next_due_at).getTime() < Date.now();
          return (
            <Pressable
              key={schedule.id}
              style={[styles.schedule, scheduleId === schedule.id && styles.scheduleOn]}
              onPress={() => {
                setScheduleId(schedule.id);
                setType(schedule.event_type);
                setTitle(schedule.name);
                setMeasuredUnit(schedule.measured_unit || "");
              }}
            >
              <View style={styles.flex}>
                <Text style={styles.scheduleTitle}>{schedule.name}</Text>
                <Text style={[styles.scheduleDue, overdue && styles.bad]}>
                  {overdue ? "OVERDUE" : "DUE"}{" "}
                  {new Date(schedule.next_due_at).toLocaleDateString("en-GB")} · every{" "}
                  {schedule.frequency_days} days
                </Text>
                {schedule.instructions && (
                  <Text style={styles.eventNotes}>{schedule.instructions}</Text>
                )}
                {(schedule.measured_unit ||
                  schedule.minimum_value !== null ||
                  schedule.maximum_value !== null) && (
                  <Text style={styles.eventMeta}>
                    Expected {schedule.minimum_value ?? "—"}–{schedule.maximum_value ?? "—"}{" "}
                    {schedule.measured_unit}
                  </Text>
                )}
              </View>
              <Text style={styles.start}>
                {scheduleId === schedule.id ? "SELECTED" : "START ›"}
              </Text>
            </Pressable>
          );
        })}
        {schedules.length === 0 && (
          <Text style={styles.empty}>No recurring checks are scheduled for this item.</Text>
        )}
      </View>
      {canRecord && !asset.retired_at && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Add timestamped record</Text>
          <View style={styles.choices}>
            {["inspection", "maintenance", "repair", "calibration", "cleaning", "issue"].map(
              (item) => (
                <Pressable
                  key={item}
                  style={[styles.choice, type === item && styles.choiceOn]}
                  onPress={() => setType(item)}
                >
                  <Text style={[styles.choiceText, type === item && styles.choiceTextOn]}>
                    {item}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
          <View style={styles.choices}>
            {["pass", "completed", "monitoring", "fail", "open"].map((item) => (
              <Pressable
                key={item}
                style={[styles.choice, outcome === item && styles.choiceOn]}
                onPress={() => setOutcome(item)}
              >
                <Text style={[styles.choiceText, outcome === item && styles.choiceTextOn]}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What was checked or done?"
          />
          <View style={styles.readingRow}>
            <TextInput
              style={[styles.input, styles.flex]}
              value={measuredValue}
              onChangeText={setMeasuredValue}
              placeholder="Reading"
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, styles.unitInput]}
              value={measuredUnit}
              onChangeText={setMeasuredUnit}
              placeholder="Unit (°C)"
            />
          </View>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Finding, repair or corrective action"
            multiline
          />
          {needsCorrectiveAction && (
            <View>
              {readingOutsideRange && (
                <Text style={styles.rangeWarning}>Reading is outside the safe range.</Text>
              )}
              <TextInput
                style={[styles.input, styles.multiline, styles.dangerInput]}
                value={correctiveAction}
                onChangeText={setCorrectiveAction}
                placeholder="Corrective action required: what was made safe and what happens next?"
                multiline
              />
            </View>
          )}
          <Pressable style={styles.save} onPress={() => void save()}>
            <Text style={styles.saveText}>Save record</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.history}>
        <Text style={styles.formTitle}>Complete history</Text>
        <Text style={styles.audit}>Saved evidence is append-only and attributed.</Text>
        {events.map((event) => (
          <View style={styles.event} key={event.id}>
            <View style={styles.eventTop}>
              <Text
                style={[styles.outcome, ["fail", "open"].includes(event.outcome) && styles.bad]}
              >
                {event.outcome.toUpperCase()}
              </Text>
              <Text style={styles.time}>{new Date(event.recorded_at).toLocaleString("en-GB")}</Text>
            </View>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventMeta}>
              {event.event_type} · {event.recorded_by_name}
            </Text>
            {event.notes && <Text style={styles.eventNotes}>{event.notes}</Text>}
            {event.measured_value !== null && (
              <Text style={styles.reading}>
                {event.measured_value} {event.measured_unit}
              </Text>
            )}
            {event.corrective_action && (
              <Text style={styles.correction}>Corrective action: {event.corrective_action}</Text>
            )}
            {event.scan_recorded_at && (
              <Text style={styles.scanHistory}>
                QR identified {new Date(event.scan_recorded_at).toLocaleString("en-GB")}
                {event.scan_latitude !== null && event.scan_longitude !== null
                  ? ` · GPS ${Number(event.scan_latitude).toFixed(5)}, ${Number(event.scan_longitude).toFixed(5)} · ±${Math.round(Number(event.scan_accuracy_metres ?? 0))}m`
                  : " · GPS not shared"}
              </Text>
            )}
          </View>
        ))}
        {events.length === 0 && <Text style={styles.empty}>No equipment events recorded yet.</Text>}
      </View>
    </ScrollView>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { gap: 11, padding: 18, paddingBottom: 90 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  flex: { flex: 1 },
  eyebrow: {
    color: "#c8102e",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: { fontSize: 25, fontWeight: "800" },
  name: { fontSize: 18, fontWeight: "800" },
  intro: { color: "#666", fontSize: 14, lineHeight: 20 },
  summary: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  summaryCell: { borderRightColor: "#eee", borderRightWidth: 1, flex: 1, padding: 13 },
  summaryLabel: { color: "#777", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  summaryValue: { fontSize: 13, fontWeight: "800", marginTop: 5, textTransform: "capitalize" },
  form: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 13,
    borderWidth: 1,
    gap: 8,
    padding: 13,
  },
  formTitle: { fontSize: 16, fontWeight: "800" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  choice: {
    borderColor: "#ccc",
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choiceOn: { backgroundColor: "#c8102e", borderColor: "#c8102e" },
  choiceText: { color: "#555", fontSize: 12, fontWeight: "800", textTransform: "capitalize" },
  choiceTextOn: { color: "#fff" },
  input: {
    backgroundColor: "#fafafa",
    borderColor: "#ddd",
    borderRadius: 9,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 46,
    padding: 12,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  save: {
    alignItems: "center",
    backgroundColor: "#176b3a",
    borderRadius: 9,
    minHeight: 48,
    justifyContent: "center",
    padding: 12,
  },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  history: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 13,
    borderWidth: 1,
    padding: 13,
  },
  audit: { color: "#777", fontSize: 12, lineHeight: 17, marginBottom: 5 },
  event: { borderTopColor: "#eee", borderTopWidth: 1, paddingVertical: 10 },
  eventTop: { flexDirection: "row", justifyContent: "space-between" },
  outcome: { color: "#176b3a", fontSize: 12, fontWeight: "900" },
  bad: { color: "#b42318" },
  time: { color: "#777", fontSize: 11 },
  eventTitle: { fontSize: 14, fontWeight: "800", marginTop: 5 },
  eventMeta: { color: "#777", fontSize: 12, marginTop: 3, textTransform: "capitalize" },
  eventNotes: { color: "#444", fontSize: 13, lineHeight: 19, marginTop: 6 },
  empty: { color: "#777", fontSize: 13, paddingVertical: 18, textAlign: "center" },
  schedule: {
    alignItems: "center",
    borderTopColor: "#eee",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 62,
    paddingVertical: 12,
  },
  scheduleOn: { backgroundColor: "#fff5f3" },
  scheduleTitle: { fontSize: 14, fontWeight: "800" },
  scheduleDue: { color: "#176b3a", fontSize: 11, fontWeight: "800", marginTop: 3 },
  start: { color: "#c8102e", fontSize: 11, fontWeight: "900" },
  readingRow: { flexDirection: "row", gap: 8 },
  unitInput: { width: 110 },
  dangerInput: { borderColor: "#b42318" },
  rangeWarning: { color: "#b42318", fontSize: 12, fontWeight: "800", marginBottom: 6 },
  reading: { fontSize: 13, fontWeight: "800", marginTop: 6 },
  correction: {
    backgroundColor: "#fff0ed",
    borderRadius: 7,
    color: "#b42318",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    padding: 8,
  },
  scanEvidence: {
    backgroundColor: "#edf8f1",
    borderColor: "#98d5aa",
    borderRadius: 13,
    borderWidth: 1,
    padding: 13,
  },
  scanTitle: { color: "#176b3a", fontSize: 14, fontWeight: "900", marginBottom: 4 },
  scanHistory: {
    backgroundColor: "#f3f4f6",
    borderRadius: 7,
    color: "#555",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
    padding: 8,
  },
});
