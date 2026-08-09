import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

const TOKEN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

export default function ScanAsset() {
  const { session, actionPermissions, loading } = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState("");
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!actionPermissions.includes("assets.record")) return <Redirect href="/assets" />;
  if (!permission)
    return (
      <View style={styles.center}>
        <Text>Checking camera permission…</Text>
      </View>
    );
  if (!permission.granted)
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.intro}>
          Haccora only uses the camera here to read an equipment QR label.
        </Text>
        <Pressable style={styles.button} onPress={() => void requestPermission()}>
          <Text style={styles.buttonText}>Allow camera</Text>
        </Pressable>
      </View>
    );

  const receive = async (data: string) => {
    if (scanned) return;
    const token = data.match(TOKEN)?.[0];
    if (
      !token ||
      (!data.includes("/app/assets/") &&
        !data.startsWith("haccora://") &&
        !data.startsWith("haccorauk://"))
    ) {
      setError("This is not a Haccora equipment label.");
      setScanned(true);
      return;
    }
    setScanned(true);
    let latitude: number | null = null;
    let longitude: number | null = null;
    let accuracy: number | null = null;
    try {
      const permissionResult = await Location.requestForegroundPermissionsAsync();
      if (permissionResult.granted) {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        accuracy = position.coords.accuracy;
      }
    } catch {
      // The scan remains usable when GPS is denied or unavailable.
    }
    const { data: scan, error: scanError } = await supabase.rpc("record_asset_scan", {
      p_qr_token: token,
      p_source: "native_camera",
      p_client_scanned_at: new Date().toISOString(),
      p_latitude: latitude,
      p_longitude: longitude,
      p_accuracy_metres: accuracy,
    });
    if (scanError || !scan || typeof scan !== "object" || !("scan_session_id" in scan)) {
      setError(scanError?.message ?? "The equipment scan could not be registered.");
      return;
    }
    router.replace({
      pathname: "/assets/[assetId]",
      params: { assetId: token, scanId: String(scan.scan_session_id) },
    });
  };

  return (
    <View style={styles.page}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => void receive(data)}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.help}>
          {scanned && !error
            ? "Registering asset, time and permitted GPS…"
            : "Hold the Haccora QR label inside the frame"}
        </Text>
        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => {
                setScanned(false);
                setError("");
              }}
            >
              <Text style={styles.retry}>Scan again</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#111" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  title: { fontSize: 20, fontWeight: "800" },
  intro: { color: "#666", fontSize: 14, lineHeight: 20, textAlign: "center" },
  button: {
    backgroundColor: "#c8102e",
    borderRadius: 10,
    paddingHorizontal: 18,
    minHeight: 48,
    paddingVertical: 13,
  },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  frame: { width: 250, height: 250, borderColor: "#fff", borderRadius: 22, borderWidth: 3 },
  help: {
    marginTop: 18,
    backgroundColor: "rgba(0,0,0,.7)",
    borderRadius: 9,
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    padding: 10,
  },
  error: { marginTop: 12, backgroundColor: "#fff", borderRadius: 12, gap: 8, padding: 14 },
  errorText: { color: "#b42318", fontSize: 14, lineHeight: 20 },
  retry: { color: "#c8102e", fontSize: 14, fontWeight: "900", padding: 8, textAlign: "center" },
});
