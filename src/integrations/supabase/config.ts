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
 * Resolve the public Supabase connection without touching the client singleton.
 * VITE_* values are embedded for browsers; the aliases support SSR runtimes.
 */
export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const browserEnvironment = import.meta.env as Record<string, unknown>;
  const runtimeEnvironment =
    typeof process !== "undefined" ? (process.env as Record<string, unknown>) : {};

  const url =
    nonEmpty(browserEnvironment.VITE_SUPABASE_URL) ??
    nonEmpty(runtimeEnvironment.SUPABASE_URL) ??
    nonEmpty(runtimeEnvironment.VITE_SUPABASE_URL);
  const publishableKey =
    publicKey(browserEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY) ??
    publicKey(runtimeEnvironment.SUPABASE_PUBLISHABLE_KEY) ??
    publicKey(runtimeEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY);

  return { url, publishableKey, configured: Boolean(url && publishableKey) };
}

export const isSupabaseConfigured = () => getPublicSupabaseConfig().configured;

export const SUPABASE_UNAVAILABLE_MESSAGE =
  "Haccora authentication is temporarily unavailable because the secure service connection is not configured.";
