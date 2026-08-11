import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { secureAuthStorage } from "./secure-storage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key)
  throw new Error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
if (key.startsWith("sb_secret_"))
  throw new Error("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must never contain a secret key");

const projectUrl = new URL(url);
if (projectUrl.protocol !== "https:" || !projectUrl.hostname.endsWith(".supabase.co")) {
  throw new Error("EXPO_PUBLIC_SUPABASE_URL must be the HTTPS Supabase project origin");
}

export const supabase = createClient(url, key, {
  auth: {
    storage: secureAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
