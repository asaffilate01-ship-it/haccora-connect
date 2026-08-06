import { z } from "zod";
import { env, json, preflight, requirePost, sha256 } from "../_shared/http.ts";
import { requireUser, serviceClient } from "../_shared/supabase.ts";

const Scope = z.enum([
  "haccp",
  "temperature",
  "cleaning",
  "pest",
  "allergens",
  "training",
  "traceability",
  "audits",
  "documents",
  "incidents",
  "equipment",
]);
const Input = z.object({
  email: z
    .string()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  locationIds: z.array(z.string().uuid()).min(1).max(20),
  scopes: z.array(Scope).min(1).max(11),
  accessHours: z.number().int().min(1).max(168),
  reason: z.string().trim().max(500).optional().default(
    "Inspection evidence access",
  ),
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
    if (!organizationId || !["owner", "manager"].includes(String(ctx.role))) {
      return json(request, { error: "forbidden" }, 403);
    }

    const supabase = serviceClient();
    const { count } = await supabase
      .from("inspector_access_invitations")
      .select("id", { count: "exact", head: true })
      .eq("invited_by", user.id)
      .gte("created_at", new Date(Date.now() - 60 * 60_000).toISOString());
    if ((count ?? 0) >= 20) {
      return json(request, { error: "rate_limited" }, 429);
    }

    const { data: locations, error: locationError } = await supabase
      .from("locations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .in("id", input.locationIds);
    if (locationError) throw locationError;
    if (locations?.length !== new Set(input.locationIds).size) {
      return json(request, { error: "invalid_location_scope" }, 400);
    }

    await supabase
      .from("inspector_access_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("email", input.email)
      .is("accepted_at", null)
      .is("revoked_at", null);

    const token = crypto.randomUUID() + crypto.randomUUID();
    const validUntil = new Date(Date.now() + input.accessHours * 60 * 60_000);
    const expiresAt = new Date(
      Math.min(validUntil.getTime(), Date.now() + 7 * 86400000),
    );
    const { data: invitation, error } = await supabase
      .from("inspector_access_invitations")
      .insert({
        organization_id: organizationId,
        email: input.email,
        location_ids: [...new Set(input.locationIds)],
        evidence_scopes: [...new Set(input.scopes)],
        access_valid_until: validUntil.toISOString(),
        token_hash: await sha256(token),
        invited_by: user.id,
        reason: input.reason,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;

    const url = `${
      env("PUBLIC_APP_URL").replace(
        /\/$/,
        "",
      )
    }/login?inspectorInvite=${encodeURIComponent(token)}`;
    const email = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `haccora-inspector-invite-${invitation.id}`,
      },
      body: JSON.stringify({
        from: env("NOTIFICATION_FROM_EMAIL"),
        to: [input.email],
        subject: "Time-limited Haccora inspection access",
        text:
          `You have been granted read-only access to selected Haccora evidence until ${validUntil.toISOString()}. Open the secure link below to sign in or create an account.\n\n${url}`,
      }),
    });
    if (!email.ok) {
      await supabase
        .from("inspector_access_invitations")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", invitation.id);
      throw new Error(`Invitation email provider returned ${email.status}`);
    }
    return json(
      request,
      { ok: true, validUntil: validUntil.toISOString() },
      201,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json(request, { error: "invalid_request" }, 400);
    }
    console.error(error);
    return json(request, { error: "inspector_invite_failed" }, 500);
  }
});
