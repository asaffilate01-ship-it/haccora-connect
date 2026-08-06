import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "@/lib/session";
import { AppLockProvider } from "@/lib/app-lock";
import { View } from "react-native";
import { BottomNav } from "@/components/bottom-nav";

export default function RootLayout() {
  return (
    <SessionProvider>
      <AppLockProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerTintColor: "#111", headerShadowVisible: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ title: "Haccora" }} />
            <Stack.Screen name="onboarding" options={{ title: "Set up workspace" }} />
            <Stack.Screen name="dashboard" options={{ title: "Today", headerBackVisible: false }} />
            <Stack.Screen name="temperature" options={{ title: "Temperature check" }} />
            <Stack.Screen name="checks" options={{ title: "Daily check" }} />
            <Stack.Screen name="diary" options={{ title: "Daily diary" }} />
            <Stack.Screen name="actions" options={{ title: "Corrective actions" }} />
            <Stack.Screen name="alerts" options={{ title: "Action inbox" }} />
            <Stack.Screen name="incidents" options={{ title: "Report incident" }} />
            <Stack.Screen name="documents" options={{ title: "Evidence library" }} />
            <Stack.Screen name="staff-compliance" options={{ title: "Staff compliance" }} />
            <Stack.Screen name="training" options={{ title: "Training & certificates" }} />
            <Stack.Screen name="safe-methods" options={{ title: "Safe methods" }} />
            <Stack.Screen name="ppds" options={{ title: "PPDS labels" }} />
            <Stack.Screen name="inspection-readiness" options={{ title: "Evidence readiness" }} />
            <Stack.Screen name="coach" options={{ title: "Compliance coach" }} />
            <Stack.Screen name="settings" options={{ title: "Alerts & security" }} />
          </Stack>
          <BottomNav />
        </View>
      </AppLockProvider>
    </SessionProvider>
  );
}
