import { z } from "zod";
import {
  json,
  preflight,
  readJsonBody,
  RequestBodyError,
  requirePost,
} from "../_shared/http.ts";
import { requireUser } from "../_shared/supabase.ts";

const Input = z.object({
  type: z.enum([
    "access",
    "export",
    "rectification",
    "restriction",
    "deletion",
    "objection",
  ]),
  details: z.string().trim().max(2000).optional().default(""),
});

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  try {
    const { client, user } = await requireUser(request);
    const input = Input.parse(await readJsonBody(request, 16 * 1024));
    const { data: context, error: contextError } = await client.rpc(
      "get_my_context",
    );
    if (contextError) throw contextError;
    const workspace = context && typeof context === "object"
      ? context as Record<string, unknown>
      : {};
    const organizationId = typeof workspace.organization_id === "string"
      ? workspace.organization_id
      : null;
    if (!organizationId) {
      return json(request, { error: "workspace_required" }, 409);
    }

    const { data: existing } = await client.from("privacy_requests").select(
      "id,status",
    )
      .eq("requested_by", user.id).eq("request_type", input.type)
      .in("status", [
        "submitted",
        "identity_verified",
        "in_review",
        "blocked_by_legal_hold",
      ]).maybeSingle();
    if (existing) {
      return json(request, { ok: true, request: existing, duplicate: true });
    }

    const { data, error } = await client.from("privacy_requests").insert({
      organization_id: organizationId,
      requested_by: user.id,
      request_type: input.type,
      details: input.details || null,
    }).select("id,status,due_at,created_at").single();
    if (error) throw error;

    await client.rpc("record_security_event", {
      p_event_type: "privacy_request_submitted",
      p_metadata: { request_id: data.id, request_type: input.type },
    });
    return json(request, { ok: true, request: data }, 201);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return json(request, { error: error.code }, error.status);
    }
    return json(request, {
      error: error instanceof Error && error.message === "Unauthorized"
        ? "unauthorized"
        : "request_failed",
    }, error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
  }
});
