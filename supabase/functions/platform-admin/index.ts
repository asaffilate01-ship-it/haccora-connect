import { z } from "zod";
import {
  env,
  json,
  preflight,
  readJsonBody,
  RequestBodyError,
  requirePost,
} from "../_shared/http.ts";
import { requireUser, serviceClient } from "../_shared/supabase.ts";

const Input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("invite_tenant_owner"),
    setupId: z.string().uuid(),
    revision: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("invite_operator"),
    email: z.string().email().max(254).transform((value) =>
      value.toLowerCase()
    ),
    displayName: z.string().trim().min(2).max(120),
    role: z.enum(["platform_owner", "platform_support", "platform_auditor"]),
  }),
  z.object({
    action: z.literal("update_contact_request"),
    requestId: z.string().uuid(),
    status: z.enum(["new", "contacted", "closed", "spam"]),
  }),
  z.object({
    action: z.literal("update_support_case"),
    caseId: z.string().uuid(),
    status: z.enum([
      "open",
      "in_progress",
      "pending_customer",
      "resolved",
      "closed",
    ]),
    priority: z.enum(["normal", "high", "urgent"]),
    message: z.string().trim().min(2).max(4000).optional(),
    internal: z.boolean().default(false),
  }),
]);

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  try {
    const { client, user: actor } = await requireUser(request);
    const input = Input.parse(await readJsonBody(request, 32 * 1024));
    const { data: platformContext, error: contextError } = await client.rpc(
      "get_my_platform_context",
    );
    if (contextError) throw contextError;
    const role = platformContext && typeof platformContext === "object"
      ? String((platformContext as Record<string, unknown>).role ?? "")
      : "";
    const canManageSupport = input.action === "update_support_case" &&
      role === "platform_support";
    if (role !== "platform_owner" && !canManageSupport) {
      return json(request, { error: "forbidden" }, 403);
    }
    const { data: assurance, error: assuranceError } = await client.auth.mfa
      .getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") {
      return json(request, { error: "mfa_step_up_required" }, 403);
    }

    if (input.action === "update_contact_request") {
      const { error: updateError } = await client.rpc(
        "platform_update_contact_request",
        {
          p_request_id: input.requestId,
          p_status: input.status,
        },
      );
      if (updateError) throw updateError;
      return json(request, { ok: true });
    }

    if (input.action === "update_support_case") {
      const { error: updateError } = await client.rpc(
        "platform_manage_support_case",
        {
          p_case_id: input.caseId,
          p_status: input.status,
          p_priority: input.priority,
          p_message: input.message ?? null,
          p_internal: input.internal,
        },
      );
      if (updateError) throw updateError;
      return json(request, { ok: true });
    }

    const service = serviceClient();
    const redirectTo = `${env("PUBLIC_APP_URL").replace(/\/$/, "")}/login`;

    if (input.action === "invite_operator") {
      const invited = await service.auth.admin.inviteUserByEmail(input.email, {
        redirectTo,
      });
      if (invited.error || !invited.data.user) {
        return json(request, { error: "operator_invite_failed" }, 409);
      }
      const { error: operatorError } = await service.from("platform_operators")
        .upsert({
          user_id: invited.data.user.id,
          role: input.role,
          status: "active",
          display_name: input.displayName,
          created_by: actor.id,
          updated_at: new Date().toISOString(),
        });
      if (operatorError) {
        await service.auth.admin.deleteUser(invited.data.user.id);
        throw operatorError;
      }
      await service.from("platform_audit_events").insert({
        actor_id: actor.id,
        event_type: "platform_operator_invited",
        metadata: { user_id: invited.data.user.id, role: input.role },
      });
      return json(request, { ok: true, userId: invited.data.user.id }, 201);
    }

    // Read the saved setup through the caller's MFA-protected RPC. The browser
    // cannot supply a different email or grant a plan through this invitation.
    const { data: setups, error: setupError } = await client.rpc(
      "platform_get_tenant_setups",
    );
    if (setupError) throw setupError;
    const setup = (Array.isArray(setups) ? setups : []).find(
      (row: Record<string, unknown>) => row.id === input.setupId,
    );
    if (!setup || setup.revision !== input.revision || setup.organization_id) {
      return json(request, { error: "setup_changed_reload_required" }, 409);
    }
    if (setup.owner_verified) {
      return json(request, { ok: true, alreadyVerified: true });
    }
    const invited = await service.auth.admin.inviteUserByEmail(
      String(setup.owner_email),
      { redirectTo },
    );
    if (invited.error || !invited.data.user) {
      return json(request, {
        error: "owner_invite_failed_use_existing_account_or_retry",
      }, 409);
    }
    const { error: auditError } = await service.from("platform_audit_events")
      .insert({
        actor_id: actor.id,
        event_type: "platform_tenant_owner_invited",
        metadata: { setup_id: setup.id, revision: setup.revision },
      });
    if (auditError) throw auditError;
    return json(request, { ok: true }, 201);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return json(request, { error: error.code }, error.status);
    }
    if (error instanceof z.ZodError) {
      return json(request, { error: "invalid_request" }, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return json(request, { error: "unauthorized" }, 401);
    }
    console.error(error);
    return json(request, { error: "platform_admin_failed" }, 500);
  }
});
