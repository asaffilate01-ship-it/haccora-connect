import { z } from "zod";
import { env, json, preflight, requirePost } from "../_shared/http.ts";
import { requireUser, serviceClient } from "../_shared/supabase.ts";

const Input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_tenant"),
    businessName: z.string().trim().min(2).max(160),
    ownerEmail: z.string().email().max(254).transform((value) =>
      value.toLowerCase()
    ),
    locationName: z.string().trim().min(2).max(160),
    plan: z.enum(["trial", "solo", "complete", "group", "enterprise"]),
  }),
  z.object({
    action: z.literal("invite_operator"),
    email: z.string().email().max(254).transform((value) =>
      value.toLowerCase()
    ),
    displayName: z.string().trim().min(2).max(120),
    role: z.enum(["platform_owner", "platform_support", "platform_auditor"]),
  }),
]);

function slugFor(name: string) {
  const base =
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "tenant";
  return `${base.slice(0, 48)}-${
    crypto.randomUUID().replaceAll("-", "").slice(0, 8)
  }`;
}

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  try {
    const { client, user: actor } = await requireUser(request);
    const input = Input.parse(await request.json());
    const { data: platformContext, error: contextError } = await client.rpc(
      "get_my_platform_context",
    );
    if (contextError) throw contextError;
    const role = platformContext && typeof platformContext === "object"
      ? String((platformContext as Record<string, unknown>).role ?? "")
      : "";
    if (role !== "platform_owner") {
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

    const { data: plan, error: planError } = await service.from(
      "platform_plan_catalog",
    )
      .select(
        "code,monthly_price_pence,included_seats,max_locations,enabled_modules",
      )
      .eq("code", input.plan).eq("active", true).single();
    if (planError || !plan) {
      return json(request, { error: "invalid_plan" }, 400);
    }

    const invited = await service.auth.admin.inviteUserByEmail(
      input.ownerEmail,
      { redirectTo },
    );
    if (invited.error || !invited.data.user) {
      return json(request, { error: "tenant_owner_invite_failed" }, 409);
    }
    const ownerId = invited.data.user.id;
    let organizationId: string | null = null;
    try {
      const { data: organization, error: organizationError } = await service
        .from("organizations")
        .insert({
          name: input.businessName,
          slug: slugFor(input.businessName),
          country_code: "GB",
          timezone: "Europe/London",
          enabled_modules: plan.enabled_modules,
          created_by: ownerId,
          service_status: "active",
        }).select("id").single();
      if (organizationError || !organization) throw organizationError;
      organizationId = organization.id;

      const { data: location, error: locationError } = await service.from(
        "locations",
      ).insert({
        organization_id: organization.id,
        name: input.locationName,
        timezone: "Europe/London",
      }).select("id").single();
      if (locationError || !location) throw locationError;

      const { error: membershipError } = await service.from(
        "organization_memberships",
      ).insert({
        organization_id: organization.id,
        user_id: ownerId,
        role: "owner",
        default_location_id: location.id,
        status: "active",
        invited_by: actor.id,
      });
      if (membershipError) throw membershipError;

      const { error: subscriptionError } = await service.from("subscriptions")
        .upsert({
          organization_id: organization.id,
          plan: plan.code,
          status: plan.code === "trial" ? "trialing" : "active",
          seats: plan.included_seats,
          location_limit: plan.max_locations,
          contract_mrr_pence: plan.monthly_price_pence ?? 0,
          currency: "gbp",
          billing_email: input.ownerEmail,
          trial_ends_at: plan.code === "trial"
            ? new Date(Date.now() + 7 * 86400000).toISOString()
            : null,
        });
      if (subscriptionError) throw subscriptionError;

      await service.from("profiles").update({
        current_organization_id: organization.id,
        current_location_id: location.id,
        restaurant_name: input.businessName,
        location: input.locationName,
        language: "en",
      }).eq("id", ownerId);

      await service.from("platform_audit_events").insert({
        actor_id: actor.id,
        event_type: "platform_tenant_created",
        metadata: {
          organization_id: organization.id,
          owner_user_id: ownerId,
          plan: plan.code,
        },
      });
      return json(request, {
        ok: true,
        organizationId: organization.id,
        ownerId,
      }, 201);
    } catch (error) {
      if (organizationId) {
        await service.from("organizations").update({
          service_status: "closed",
          service_status_reason:
            "Automatic rollback after tenant provisioning failed",
          archived_at: new Date().toISOString(),
        }).eq("id", organizationId);
      }
      await service.auth.admin.deleteUser(ownerId);
      throw error;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json(request, { error: "invalid_request" }, 400);
    }
    console.error(error);
    return json(request, { error: "platform_admin_failed" }, 500);
  }
});
