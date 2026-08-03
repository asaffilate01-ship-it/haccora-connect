import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";

const KEY = "haccora-biometric-lock-v1";
type LockContextValue = { enabled: boolean; setEnabled: (value: boolean) => Promise<boolean> };
const LockContext = createContext<LockContextValue>({
  enabled: false,
  setEnabled: async () => false,
});

export function AppLockProvider({ children }: PropsWithChildren) {
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const unlock = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock Haccora",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
    setLocked(!result.success);
  };
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((value) => {
      const active = value === "true";
      setEnabledState(active);
      setLocked(active);
      if (active) void unlock();
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") setLocked(enabled);
      if (state === "active" && enabled) void unlock();
    });
    return () => subscription.remove();
  }, [enabled]);
  const setEnabled = async (value: boolean) => {
    if (value) {
      const [hardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hardware || !enrolled) return false;
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Enable Haccora app lock",
      });
      if (!result.success) return false;
    }
    await AsyncStorage.setItem(KEY, String(value));
    setEnabledState(value);
    setLocked(false);
    return true;
  };
  return (
    <LockContext.Provider value={{ enabled, setEnabled }}>
      {children}
      {enabled && locked && (
        <View style={styles.overlay} accessibilityViewIsModal>
          <Text style={styles.logo}>HACCORA</Text>
          <Text style={styles.title}>App locked</Text>
          <Text style={styles.body}>
            Authenticate with your device to protect food-safety records.
          </Text>
          <Pressable style={styles.button} onPress={() => void unlock()}>
            <Text style={styles.buttonText}>Unlock</Text>
          </Pressable>
        </View>
      )}
    </LockContext.Provider>
  );
}

export const useAppLock = () => useContext(LockContext);
const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  logo: { color: "#e43f2c", fontWeight: "900", letterSpacing: 3 },
  title: { marginTop: 18, color: "white", fontSize: 28, fontWeight: "800" },
  body: { marginTop: 8, color: "#bbb", textAlign: "center", lineHeight: 21 },
  button: {
    marginTop: 24,
    minHeight: 52,
    minWidth: 180,
    borderRadius: 15,
    backgroundColor: "#e43f2c",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "white", fontWeight: "800" },
});
