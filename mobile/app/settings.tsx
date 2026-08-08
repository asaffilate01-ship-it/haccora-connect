import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppLock } from "@/lib/app-lock";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { registerPushNotifications, unregisterPushNotifications } from "@/lib/push";

export default function Settings() {
  const { session, loading } = useSession();
  const { enabled, setEnabled } = useAppLock();
  const [busy, setBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [startOfDay, setStartOfDay] = useState(true);
  const [issueAlerts, setIssueAlerts] = useState(true);
  const [expiryAlerts, setExpiryAlerts] = useState(true);
  const [startTime, setStartTime] = useState("08:00");
  useEffect(() => {
    if (!session) return;
    void supabase
      .from("notification_preferences")
      .select(
        "push_enabled,start_of_day_enabled,issue_alerts_enabled,expiry_alerts_enabled,start_of_day_local_time",
      )
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setPushEnabled(data.push_enabled);
        setStartOfDay(data.start_of_day_enabled);
        setIssueAlerts(data.issue_alerts_enabled);
        setExpiryAlerts(data.expiry_alerts_enabled);
        setStartTime(String(data.start_of_day_local_time || "08:00").slice(0, 5));
      });
  }, [session]);
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  const toggle = async (value: boolean) => {
    const ok = await setEnabled(value);
    if (!ok)
      Alert.alert("Biometrics unavailable", "Set up Face ID, Touch ID or device biometrics first.");
  };
  const privacy = async (type: "export" | "deletion") => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("privacy-requests", {
      body: { type, details: "Submitted from native app" },
    });
    setBusy(false);
    if (error) Alert.alert("Request failed", error.message);
    else
      Alert.alert(
        "Request received",
        type === "deletion"
          ? "Deletion will be reviewed against legal retention duties."
          : "We will prepare your data securely.",
      );
  };
  const saveSchedule = async (patch: {
    startOfDay?: boolean;
    issueAlerts?: boolean;
    expiryAlerts?: boolean;
    startTime?: string;
  }) => {
    const next = {
      startOfDay: patch.startOfDay ?? startOfDay,
      issueAlerts: patch.issueAlerts ?? issueAlerts,
      expiryAlerts: patch.expiryAlerts ?? expiryAlerts,
      startTime: patch.startTime ?? startTime,
    };
    setStartOfDay(next.startOfDay);
    setIssueAlerts(next.issueAlerts);
    setExpiryAlerts(next.expiryAlerts);
    setStartTime(next.startTime);
    const { error } = await supabase.rpc("set_my_notification_schedule", {
      p_start_of_day_enabled: next.startOfDay,
      p_issue_alerts_enabled: next.issueAlerts,
      p_expiry_alerts_enabled: next.expiryAlerts,
      p_start_of_day_local_time: next.startTime,
    });
    if (error) Alert.alert("Could not save alerts", error.message);
  };
  const togglePush = async (value: boolean) => {
    setPushEnabled(value);
    try {
      if (value) await registerPushNotifications({ requestPermission: true });
      else await unregisterPushNotifications();
      const { error } = await supabase.rpc("set_my_notification_preferences", {
        p_email_enabled: null,
        p_push_enabled: value,
        p_weekly_digest: null,
      });
      if (error) throw error;
    } catch (error) {
      setPushEnabled(!value);
      Alert.alert(
        "Could not update notifications",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>SECURITY & PRIVACY</Text>
      <Text style={styles.title}>Protect this device</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Compliance alerts</Text>
        <Text style={styles.body}>
          Receive timely reminders without relying on the app being open.
        </Text>
        <SettingRow label="Push notifications" value={pushEnabled} onChange={togglePush} />
        <SettingRow
          label="Start-of-day routine"
          value={startOfDay}
          onChange={(value) => saveSchedule({ startOfDay: value })}
        />
        <SettingRow
          label="Open food-safety issues"
          value={issueAlerts}
          onChange={(value) => saveSchedule({ issueAlerts: value })}
        />
        <SettingRow
          label="Training and document expiry"
          value={expiryAlerts}
          onChange={(value) => saveSchedule({ expiryAlerts: value })}
        />
        <View style={styles.row}>
          <Text style={[styles.body, styles.copy]}>Start-of-day time</Text>
          <TextInput
            accessibilityLabel="Start-of-day time"
            value={startTime}
            onChangeText={setStartTime}
            onEndEditing={() => {
              if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)) void saveSchedule({ startTime });
              else {
                setStartTime("08:00");
                Alert.alert("Use a 24-hour time", "For example, 08:00.");
              }
            }}
            style={styles.timeInput}
            maxLength={5}
          />
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.cardTitle}>Biometric app lock</Text>
            <Text style={styles.body}>
              Require device authentication after Haccora leaves the foreground.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={(value) => void toggle(value)}
            trackColor={{ true: "#e43f2c" }}
          />
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your privacy rights</Text>
        <Text style={styles.body}>
          Requests are authenticated, time-stamped and tracked. Legal holds and required food-safety
          retention may limit deletion.
        </Text>
        <Pressable disabled={busy} style={styles.secondary} onPress={() => void privacy("export")}>
          <Text style={styles.secondaryText}>Request data export</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          style={styles.danger}
          onPress={() =>
            Alert.alert(
              "Request account deletion?",
              "This starts a reviewed privacy request; it does not silently erase regulated records.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Continue", style: "destructive", onPress: () => void privacy("deletion") },
              ],
            )
          }
        >
          <Text style={styles.dangerText}>Request account deletion</Text>
        </Pressable>
      </View>
      <Text style={styles.note}>
        Haccora stores authentication tokens in the device secure enclave/keychain where supported.
        Never share screenshots containing food-safety or staff data.
      </Text>
    </ScrollView>
  );
}

function SettingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void | Promise<void>;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.body, styles.copy]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={(next) => void onChange(next)}
        trackColor={{ true: "#e43f2c" }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  page: { padding: 20, gap: 14 },
  eyebrow: { color: "#e43f2c", fontWeight: "900", letterSpacing: 2 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 4 },
  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ddd",
    gap: 13,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  body: { color: "#666", lineHeight: 20, marginTop: 4 },
  timeInput: {
    minWidth: 76,
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: "center",
    fontWeight: "800",
  },
  secondary: {
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbb",
  },
  secondaryText: { fontWeight: "800" },
  danger: {
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#fee4e1",
  },
  dangerText: { fontWeight: "800", color: "#9d2118" },
  note: { fontSize: 12, color: "#666", lineHeight: 18 },
});
