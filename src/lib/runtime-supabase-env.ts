/**
 * Runtime bridge for the public Supabase connection.
 *
 * Build-time `import.meta.env` inlining is not guaranteed in every deployment
 * pipeline. When those values are missing from the browser bundle the app used
 * to fail closed with "secure service connection is not configured". The SSR
 * runtime always has the values, so we serialise them into the HTML shell and
 * read them back on the client.
 */

export const RUNTIME_ENV_SCRIPT_ID = "__haccora_public_env";

export type RuntimeSupabaseEnv = { url: string | null; publishableKey: string | null };

const nonEmpty = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const publicKey = (value: unknown): string | null => {
  const key = nonEmpty(value);
  return key && !key.startsWith("sb_secret_") ? key : null;
};

function readFromProcessEnv(): RuntimeSupabaseEnv {
  const env = typeof process !== "undefined" ? (process.env as Record<string, unknown>) : {};
  return {
    url: nonEmpty(env.VITE_SUPABASE_URL) ?? nonEmpty(env.SUPABASE_URL),
    publishableKey:
      publicKey(env.VITE_SUPABASE_PUBLISHABLE_KEY) ?? publicKey(env.SUPABASE_PUBLISHABLE_KEY),
  };
}

/**
 * Server render: emit the assignment. Client hydration: re-use the exact text
 * already present in the document so the markup matches and hydration is safe.
 */
export function runtimeEnvScriptContent(): string {
  if (typeof document !== "undefined") {
    return document.getElementById(RUNTIME_ENV_SCRIPT_ID)?.textContent ?? "";
  }
  const env = readFromProcessEnv();
  if (!env.url || !env.publishableKey) return "";
  return `window.__HACCORA_PUBLIC_ENV__=${JSON.stringify(env).replace(/</g, "\\u003c")};`;
}

export function readRuntimeSupabaseEnv(): RuntimeSupabaseEnv {
  if (typeof window !== "undefined") {
    const injected = (window as unknown as Record<string, unknown>).__HACCORA_PUBLIC_ENV__;
    if (injected && typeof injected === "object") {
      const record = injected as Record<string, unknown>;
      return { url: nonEmpty(record.url), publishableKey: publicKey(record.publishableKey) };
    }
    return { url: null, publishableKey: null };
  }
  return readFromProcessEnv();
}
