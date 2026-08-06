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
};

export default function AssetDetail() {
  const { assetId } = useLocalSearchParams<{ assetId: string }>();
  const { session, loading, role } = useSession();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState("inspection");
  const [outcome, setOutcome] = useState("pass");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
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
      const history = await supabase
        .from("asset_events")
        .select(
          "id,event_type,outcome,title,notes,recorded_by_name,recorded_at,measured_value,measured_unit",
        )
        .eq("asset_id", next.id)
        .order("recorded_at", { ascending: false })
        .limit(250);
      setEvents((history.data ?? []) as Event[]);
    }
    setRefreshing(false);
  }, [assetId]);
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
  const save = async () => {
    if (title.trim().length < 2)
      return Alert.alert("Add a title", "Briefly describe what was checked or done.");
    try {
      await enqueue("asset_events", {
        organization_id: asset.organization_id,
        location_id: asset.location_id,
        asset_id: asset.id,
        event_type: type,
        outcome,
        title: title.trim(),
        notes: notes.trim() || null,
        recorded_by: session.user.id,
      });
      setTitle("");
      setNotes("");
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
      {role !== "inspector" && !asset.retired_at && (
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
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Finding, repair or corrective action"
            multiline
          />
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
  eyebrow: {
    color: "#c8102e",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: { fontSize: 22, fontWeight: "800" },
  name: { fontSize: 16, fontWeight: "800" },
  intro: { color: "#666", fontSize: 11, lineHeight: 16 },
  summary: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  summaryCell: { borderRightColor: "#eee", borderRightWidth: 1, flex: 1, padding: 11 },
  summaryLabel: { color: "#777", fontSize: 8, textTransform: "uppercase" },
  summaryValue: { fontSize: 10, fontWeight: "800", marginTop: 4, textTransform: "capitalize" },
  form: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 13,
    borderWidth: 1,
    gap: 8,
    padding: 13,
  },
  formTitle: { fontSize: 13, fontWeight: "800" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  choice: {
    borderColor: "#ccc",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  choiceOn: { backgroundColor: "#c8102e", borderColor: "#c8102e" },
  choiceText: { color: "#555", fontSize: 9, fontWeight: "800", textTransform: "capitalize" },
  choiceTextOn: { color: "#fff" },
  input: {
    backgroundColor: "#fafafa",
    borderColor: "#ddd",
    borderRadius: 9,
    borderWidth: 1,
    fontSize: 11,
    padding: 10,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  save: { alignItems: "center", backgroundColor: "#176b3a", borderRadius: 9, padding: 10 },
  saveText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  history: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 13,
    borderWidth: 1,
    padding: 13,
  },
  audit: { color: "#777", fontSize: 9, marginBottom: 5 },
  event: { borderTopColor: "#eee", borderTopWidth: 1, paddingVertical: 10 },
  eventTop: { flexDirection: "row", justifyContent: "space-between" },
  outcome: { color: "#176b3a", fontSize: 9, fontWeight: "900" },
  bad: { color: "#b42318" },
  time: { color: "#777", fontSize: 8 },
  eventTitle: { fontSize: 11, fontWeight: "800", marginTop: 4 },
  eventMeta: { color: "#777", fontSize: 9, marginTop: 2, textTransform: "capitalize" },
  eventNotes: { color: "#444", fontSize: 10, lineHeight: 15, marginTop: 5 },
  empty: { color: "#777", fontSize: 10, paddingVertical: 18, textAlign: "center" },
});
