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
            <Stack.Screen name="inductions" options={{ title: "Staff induction" }} />
            <Stack.Screen name="fitness-to-work" options={{ title: "Fitness to work" }} />
            <Stack.Screen name="goods-in" options={{ title: "Delivery check" }} />
            <Stack.Screen name="cleaning" options={{ title: "Cleaning schedule" }} />
            <Stack.Screen name="allergens" options={{ title: "Allergen lookup" }} />
            <Stack.Screen name="scan-asset" options={{ title: "Scan equipment" }} />
            <Stack.Screen name="assets/index" options={{ title: "Equipment" }} />
            <Stack.Screen name="assets/[assetId]" options={{ title: "Equipment record" }} />
            <Stack.Screen name="quick-log" options={{ title: "Quick log" }} />
            <Stack.Screen name="more" options={{ title: "All tools" }} />
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
