import { z } from "zod";
import { env, json, preflight, requirePost, sha256 } from "../_shared/http.ts";
import { requireUser, serviceClient } from "../_shared/supabase.ts";

const Input = z.object({
  email: z
    .string()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  role: z.enum(["manager", "chef", "staff"]),
  roleProfileId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid(),
});

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  try {
    const { client, user } = await requireUser(request);
    const input = Input.parse(await request.json());
    const { data: context, error: contextError } = await client.rpc(
      "get_my_context",
    );
    if (contextError) throw contextError;
    const ctx = context && typeof context === "object"
      ? (context as Record<string, unknown>)
      : {};
    const organizationId = String(ctx.organization_id ?? "");
    const actorRole = String(ctx.role ?? "");
    if (!organizationId || !["owner", "manager"].includes(actorRole)) {
      return json(request, { error: "forbidden" }, 403);
    }
    const { error: capacityError } = await client.rpc(
      "assert_tenant_invite_allowed",
      {
        p_role: input.role,
        p_role_profile_id: input.roleProfileId ?? null,
      },
    );
    if (capacityError) {
      return json(
        request,
        { error: capacityError.message },
        capacityError.code === "42501" ? 403 : 409,
      );
    }

    const supabase = serviceClient();
    const { data: assignedLocation, error: locationError } = await supabase
      .from("locations")
      .select("id,name")
      .eq("id", input.locationId)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .maybeSingle();
    if (locationError || !assignedLocation) {
      return json(request, { error: "invalid_location" }, 400);
    }

    const token = crypto.randomUUID() + crypto.randomUUID();
    const since = new Date(Date.now() - 60 * 60_000).toISOString();
    const { count } = await supabase
      .from("organization_invitations")
      .select("id", { count: "exact", head: true })
      .eq("invited_by", user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= 20) {
      return json(request, { error: "rate_limited" }, 429);
    }

    await supabase
      .from("organization_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("email", input.email)
      .is("accepted_at", null)
      .is("revoked_at", null);

    const { data: invitation, error } = await supabase
      .from("organization_invitations")
      .insert({
        organization_id: organizationId,
        email: input.email,
        role: input.role,
        role_profile_id: input.roleProfileId ?? null,
        default_location_id: assignedLocation.id,
        token_hash: await sha256(token),
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;

    const redirectTo = `${
      env("PUBLIC_APP_URL").replace(
        /\/$/,
        "",
      )
    }/login?invite=${encodeURIComponent(token)}`;
    const invited = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `haccora-invite-${invitation.id}`,
      },
      body: JSON.stringify({
        from: env("NOTIFICATION_FROM_EMAIL"),
        to: [input.email],
        subject: "You have been invited to Haccora",
        text:
          `You have been assigned the ${input.role} role at ${assignedLocation.name}. Open this secure invitation link to sign in or create your account. The link expires in seven days.\n\n${redirectTo}`,
      }),
    });
    if (!invited.ok) {
      await supabase
        .from("organization_invitations")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", invitation.id);
      throw new Error(`Invitation email provider returned ${invited.status}`);
    }
    return json(request, { ok: true }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json(request, { error: "invalid_request" }, 400);
    }
    console.error(error);
    return json(request, { error: "invite_failed" }, 500);
  }
});
