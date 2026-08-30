import { supabase } from "@/integrations/supabase/haccora-client";

// VAPID public key for browser push subscriptions. This value is public by
// design and is shipped as a fallback when no build-time env override is set.
export const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined) ??
  "BFYrxAGmeujWaIkBejrrOO7e_F7dELLXO2na7-DTD03Rz_HF2jeV5DL8vB6N2oH_KX0hYqEgDc-JBmFwPTUWdFI";

function decodePublicKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export async function registerWebPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Background notifications are not supported by this browser.");
  }
  const publicKey = VAPID_PUBLIC_KEY.trim();
  if (!publicKey) throw new Error("Web push has not been configured for this installation.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodePublicKey(publicKey),
    }));
  const { error } = await supabase.rpc("register_my_push_token", {
    p_token: JSON.stringify(subscription.toJSON()),
    p_platform: "web",
  });
  if (error) throw error;
}

export async function disableWebPush() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const token = JSON.stringify(subscription.toJSON());
  await supabase.rpc("disable_my_push_token", { p_token: token });
  await subscription.unsubscribe();
}
