import { useState } from "react";
import { Redirect } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { enqueue } from "@/lib/offline-queue";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

export default function Temperature() {
  const [location, setLocation] = useState("");
  const [reading, setReading] = useState("");
  const [targetMin, setTargetMin] = useState("0");
  const [targetMax, setTargetMax] = useState("7");
  const [busy, setBusy] = useState(false);
  const { session, workspaceReady, organizationId, locationId, loading } = useSession();
  const save = async () => {
    const value = Number(reading.replace(",", "."));
    const min = Number(targetMin.replace(",", "."));
    const max = Number(targetMax.replace(",", "."));
    if (
      !organizationId ||
      !location.trim() ||
      !Number.isFinite(value) ||
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      value < -100 ||
      value > 300 ||
      min < -100 ||
      max > 300 ||
      min >= max
    )
      return Alert.alert(
        "Check the values",
        "Location, reading and valid minimum/maximum limits are required.",
      );
    setBusy(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setBusy(false);
      return;
    }
    try {
      await enqueue("temperature_logs", {
        user_id: data.user.id,
        organization_id: organizationId,
        location_id: locationId,
        location: location.trim(),
        reading: value,
        target_min: min,
        target_max: max,
        logged_at: new Date().toISOString(),
      });
      setReading("");
      Alert.alert("Saved", "The reading is stored or safely queued for sync.");
    } catch {
      Alert.alert("Not saved", "The encrypted app storage was unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  return (
    <View style={styles.page}>
      <Text style={styles.label}>UNIT / LOCATION</Text>
      <TextInput
        value={location}
        onChangeText={setLocation}
        maxLength={160}
        placeholder="Walk-in fridge"
        style={styles.input}
      />
      <View style={styles.limits}>
        <View style={styles.limit}>
          <Text style={styles.label}>MINIMUM °C</Text>
          <TextInput
            value={targetMin}
            onChangeText={setTargetMin}
            keyboardType="decimal-pad"
            placeholder="0"
            style={styles.input}
          />
        </View>
        <View style={styles.limit}>
          <Text style={styles.label}>MAXIMUM °C</Text>
          <TextInput
            value={targetMax}
            onChangeText={setTargetMax}
            keyboardType="decimal-pad"
            placeholder="7"
            style={styles.input}
          />
        </View>
      </View>
      <Text style={styles.label}>READING °C</Text>
      <TextInput
        value={reading}
        onChangeText={setReading}
        keyboardType="decimal-pad"
        placeholder="4.2"
        style={styles.input}
      />
      <Pressable disabled={busy} onPress={save} style={styles.button}>
        <Text style={styles.buttonText}>{busy ? "Saving…" : "Save reading"}</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: 20, gap: 10 },
  label: { marginTop: 10, fontSize: 11, color: "#666", fontWeight: "800", letterSpacing: 1.5 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
  },
  button: {
    marginTop: 18,
    backgroundColor: "#e43f2c",
    borderRadius: 24,
    padding: 15,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800" },
  limits: { flexDirection: "row", gap: 10 },
  limit: { flex: 1 },
});
