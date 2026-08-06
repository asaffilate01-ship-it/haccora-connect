import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushNotifications() {
  if (Platform.OS === "web") return;
  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
  if (!projectId || projectId.startsWith("SET_")) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("critical", {
      name: "Critical food-safety alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync("routines", {
      name: "Daily food-safety routines",
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync("expiry", {
      name: "Training and document expiry",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc("register_my_push_token", {
    p_token: token,
    p_platform: Platform.OS,
  });
  if (error) throw error;
}

const ALLOWED_ROUTES = new Set([
  "/dashboard",
  "/checks",
  "/actions",
  "/alerts",
  "/documents",
  "/training",
  "/inductions",
  "/inspection-readiness",
  "/settings",
]);

function openNotification(response: Notifications.NotificationResponse | null) {
  const data = response?.notification.request.content.data;
  const requested = typeof data?.nativeRoute === "string" ? data.nativeRoute : "/dashboard";
  router.push((ALLOWED_ROUTES.has(requested) ? requested : "/dashboard") as never);
}

export function configureNotificationNavigation() {
  void Notifications.getLastNotificationResponseAsync().then(openNotification);
  const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
  return () => subscription.remove();
}

export async function unregisterPushNotifications() {
  if (Platform.OS === "web") return;
  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
  if (!projectId || projectId.startsWith("SET_")) return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await supabase.rpc("disable_my_push_token", { p_token: token });
}
