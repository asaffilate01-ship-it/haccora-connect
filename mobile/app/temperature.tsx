import { decimalInput } from "@/lib/evidence-input";
import { useRef, useState } from "react";
import { Redirect } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { enqueue } from "@/lib/offline-queue";
import { useSession } from "@/lib/session";

export default function Temperature() {
  const [location, setLocation] = useState("");
  const [reading, setReading] = useState("");
  const [targetMin, setTargetMin] = useState("0");
  const [targetMax, setTargetMax] = useState("7");
  const [busy, setBusy] = useState(false);
  const { session, workspaceReady, organizationId, locationId, role, loading } = useSession();
  const pending = useRef(false);
  const save = async () => {
    if (pending.current || role === "inspector") return;
    const value = decimalInput(reading);
    const min = decimalInput(targetMin);
    const max = decimalInput(targetMax);
    if (
      !session ||
      !workspaceReady ||
      !organizationId ||
      !location.trim() ||
      value === null ||
      min === null ||
      max === null ||
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
    pending.current = true;
    setBusy(true);
    try {
      await enqueue("temperature_logs", {
        user_id: session.user.id,
        organization_id: organizationId,
        location_id: locationId,
        location: location.trim(),
        reading: value,
        target_min: min,
        target_max: max,
        logged_at: new Date().toISOString(),
      });
      setReading("");
      Alert.alert(
        "Queued on this device",
        "Server sync is not yet confirmed. Do not enter the same reading again.",
      );
    } catch {
      Alert.alert(
        "Not saved",
        "Check your account and device storage, then retry. Your entries have been kept.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  if (role === "inspector") return <Redirect href="/inspection-readiness" />;
  return (
    <View style={styles.page}>
      <Text style={styles.label}>UNIT / LOCATION</Text>
      <TextInput
        editable={!busy}
        accessibilityLabel="Unit or location"
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
            editable={!busy}
            accessibilityLabel="Minimum in degrees Celsius"
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
            editable={!busy}
            accessibilityLabel="Maximum in degrees Celsius"
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
        editable={!busy}
        accessibilityLabel="Reading in degrees Celsius"
        value={reading}
        onChangeText={setReading}
        keyboardType="decimal-pad"
        placeholder="4.2"
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={save}
        style={styles.button}
      >
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
    backgroundColor: "#bd2b1b",
    minHeight: 48,
    borderRadius: 24,
    padding: 15,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800" },
  limits: { flexDirection: "row", gap: 10 },
  limit: { flex: 1 },
});
