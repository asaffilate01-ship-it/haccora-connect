type PublicSupabaseConfig = {
  url: string | null;
  publishableKey: string | null;
  configured: boolean;
};

const nonEmpty = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const publicKey = (value: unknown): string | null => {
  const key = nonEmpty(value);
  return key && !key.startsWith("sb_secret_") ? key : null;
};

/**
 * Resolve the connection that is embedded in the browser bundle. Public app
 * availability must never be inferred from server-only aliases: doing that can
 * render an enabled login during SSR and then disable it during hydration.
 */
export function getBrowserSupabaseConfig(): PublicSupabaseConfig {
  const browserEnvironment = import.meta.env as Record<string, unknown>;
  const url = nonEmpty(browserEnvironment.VITE_SUPABASE_URL);
  const publishableKey = publicKey(browserEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY);

  return { url, publishableKey, configured: Boolean(url && publishableKey) };
}

export const getPublicSupabaseConfig = getBrowserSupabaseConfig;

export const isSupabaseConfigured = () => getPublicSupabaseConfig().configured;

export const SUPABASE_UNAVAILABLE_MESSAGE =
  "Haccora authentication is temporarily unavailable because the secure service connection is not configured.";
