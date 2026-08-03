import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
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

export async function unregisterPushNotifications() {
  if (Platform.OS === "web") return;
  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
  if (!projectId || projectId.startsWith("SET_")) return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await supabase.rpc("disable_my_push_token", { p_token: token });
}
