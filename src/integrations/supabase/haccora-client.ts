import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getPublicSupabaseConfig, SUPABASE_UNAVAILABLE_MESSAGE } from "./config";

function isOpaqueSupabaseKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(publishableKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // Opaque publishable keys belong in apikey, not as an authentication bearer token.
    if (
      isOpaqueSupabaseKey(publishableKey) &&
      headers.get("Authorization") === `Bearer ${publishableKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", publishableKey);
    return fetch(input, { ...init, headers });
  };
}

function createHaccoraSupabaseClient() {
  const { url, publishableKey, configured } = getPublicSupabaseConfig();

  if (!configured || !url || !publishableKey) {
    throw new Error(SUPABASE_UNAVAILABLE_MESSAGE);
  }

  return createClient<Database>(url, publishableKey, {
    global: { fetch: createSupabaseFetch(publishableKey) },
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let client: ReturnType<typeof createHaccoraSupabaseClient> | undefined;

/**
 * Haccora-owned public client boundary. Application code must import this adapter,
 * never the hosting integration's generated client.ts file.
 */
export const supabase = new Proxy({} as ReturnType<typeof createHaccoraSupabaseClient>, {
  get(_, property, receiver) {
    client ??= createHaccoraSupabaseClient();
    return Reflect.get(client, property, receiver);
  },
});
