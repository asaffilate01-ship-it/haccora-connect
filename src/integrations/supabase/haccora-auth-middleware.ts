import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import type { Database } from "./types";

type HttpError = Error & { status: number; statusCode: number };

function unauthorized(): HttpError {
  return Object.assign(new Error("Unauthorized"), {
    status: 401,
    statusCode: 401,
  });
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const supabaseUrl = process.env["SUPABASE_URL"];
    const supabasePublishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!supabaseUrl || !supabasePublishableKey) {
      console.error("[Supabase] Required server authentication configuration is missing");
      throw Object.assign(new Error("Service unavailable"), {
        status: 503,
        statusCode: 503,
      });
    }

    const request = getRequest();
    const match = request?.headers.get("authorization")?.match(/^Bearer ([^\s]{1,8192})$/);
    const token = match?.[1];
    if (!token || token.split(".").length !== 3) throw unauthorized();

    const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
      global: {
        fetch: createSupabaseFetch(supabasePublishableKey),
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) throw unauthorized();

    return next({
      context: {
        supabase,
        userId: data.claims.sub,
        claims: data.claims,
      },
    });
  },
);
