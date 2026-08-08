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

type RegistrationOptions = { requestPermission?: boolean };

function easProjectId() {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined)
  );
}

export async function registerPushNotifications(options: RegistrationOptions = {}) {
  if (Platform.OS === "web") return false;
  const projectId = easProjectId();
  if (!projectId || projectId.startsWith("SET_")) {
    if (options.requestPermission) {
      throw new Error("Push notifications require the signed Haccora app configuration");
    }
    return false;
  }

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
  if (permission.status !== "granted" && options.requestPermission) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (permission.status !== "granted") {
    if (options.requestPermission) throw new Error("Notification permission was not granted");
    return false;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc("register_my_push_token", {
    p_token: token,
    p_platform: Platform.OS,
  });
  if (error) throw error;
  return true;
}

export async function syncPushNotifications() {
  if (Platform.OS === "web") return false;
  const { data: context, error: contextError } = await supabase.rpc("get_my_context");
  if (contextError || !context || typeof context !== "object" || Array.isArray(context))
    return false;
  const organizationId = (context as Record<string, unknown>).organization_id;
  if (typeof organizationId !== "string") return false;
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("push_enabled")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || data?.push_enabled === false) return false;
  return registerPushNotifications();
}

const ALLOWED_ROUTES = new Set([
  "/dashboard",
  "/checks",
  "/actions",
  "/alerts",
  "/documents",
  "/training",
  "/inductions",
  "/fitness-to-work",
  "/goods-in",
  "/cleaning",
  "/allergens",
  "/quick-log",
  "/more",
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
  const projectId = easProjectId();
  if (!projectId || projectId.startsWith("SET_")) return;
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc("disable_my_push_token", { p_token: token });
  if (error) throw error;
}
