import { z } from "zod";
import {
  clientIpAddress,
  env,
  json,
  preflight,
  readJsonBody,
  RequestBodyError,
  requirePost,
  sha256,
} from "../_shared/http.ts";
import { requireUser } from "../_shared/supabase.ts";

const Input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("register_session"),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    label: z.string().trim().min(1).max(120),
    platform: z.enum(["web", "ios", "android"]),
    assuranceLevel: z.enum(["aal1", "aal2"]),
  }),
  z.object({ action: z.literal("sign_out_others") }),
  z.object({
    action: z.literal("revoke_session"),
    sessionId: z.string().uuid(),
  }),
]);

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  try {
    const { client, user } = await requireUser(request);
    const input = Input.parse(await readJsonBody(request, 16 * 1024));
    const ip = clientIpAddress(request);
    const agent = request.headers.get("user-agent") ?? "unknown";
    const salt = env("CONTACT_HASH_SALT");
    const ipHash = await sha256(`${salt}:${ip}`);
    const userAgentHash = await sha256(agent);

    if (input.action === "register_session") {
      const { data, error } = await client.rpc("register_device_session", {
        p_session_fingerprint: input.fingerprint,
        p_device_label: input.label,
        p_platform: input.platform,
        p_user_agent_hash: userAgentHash,
        p_ip_hash: ipHash,
        p_assurance_level: input.assuranceLevel,
      });
      if (error) throw error;
      return json(request, { ok: true, sessionId: data });
    }

    if (input.action === "revoke_session") {
      const { error } = await client.from("device_sessions").update({
        revoked_at: new Date().toISOString(),
      })
        .eq("id", input.sessionId).eq("user_id", user.id);
      if (error) throw error;
    }

    const { error: signOutError } = await client.auth.signOut({
      scope: "others",
    });
    if (signOutError) throw signOutError;
    await client.rpc("record_security_event", {
      p_event_type: "other_sessions_signed_out",
      p_metadata: {
        requested_session: input.action === "revoke_session"
          ? input.sessionId
          : null,
      },
    });
    return json(request, { ok: true });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return json(request, { error: error.code }, error.status);
    }
    return json(request, {
      error: error instanceof Error && error.message === "Unauthorized"
        ? "unauthorized"
        : "security_action_failed",
    }, error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
  }
});
