import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./http.ts";

export function serviceClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function userClient(request: Request): SupabaseClient {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("Unauthorized");
  return createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(request: Request) {
  const client = userClient(request);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized");
  return { client, user: data.user };
}
