import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "@/lib/session";
import { AppLockProvider } from "@/lib/app-lock";

export default function RootLayout() {
  return (
    <SessionProvider>
      <AppLockProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerTintColor: "#111", headerShadowVisible: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: "Haccora" }} />
          <Stack.Screen name="onboarding" options={{ title: "Set up workspace" }} />
          <Stack.Screen name="dashboard" options={{ title: "Today", headerBackVisible: false }} />
          <Stack.Screen name="temperature" options={{ title: "Temperature check" }} />
          <Stack.Screen name="checks" options={{ title: "Daily check" }} />
          <Stack.Screen name="diary" options={{ title: "Daily diary" }} />
          <Stack.Screen name="actions" options={{ title: "Corrective actions" }} />
          <Stack.Screen name="incidents" options={{ title: "Report incident" }} />
          <Stack.Screen name="documents" options={{ title: "Evidence library" }} />
          <Stack.Screen name="settings" options={{ title: "Security & privacy" }} />
        </Stack>
      </AppLockProvider>
    </SessionProvider>
  );
}
