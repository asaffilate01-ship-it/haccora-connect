import { z } from "zod";
import { encryptSecret } from "../_shared/integration-crypto.ts";
import { json, preflight, requirePost, sha256 } from "../_shared/http.ts";
import { requireUser, serviceClient } from "../_shared/supabase.ts";
import { assertSafeWebhookUrl } from "../_shared/webhook-url.ts";

const Input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_endpoint"),
    name: z.string().trim().min(2).max(120),
    url: z.string().url().refine((value) => value.startsWith("https://")),
    event_types: z.array(z.string().regex(/^[a-z_]+\.(insert|update|delete)$/))
      .max(20),
  }),
  z.object({
    action: z.literal("disable_endpoint"),
    endpoint_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("test_endpoint"),
    endpoint_id: z.string().uuid(),
  }),
]);

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
    const workspace = (context ?? {}) as Record<string, unknown>;
    const organizationId = typeof workspace.organization_id === "string"
      ? workspace.organization_id
      : null;
    if (
      !organizationId || !["owner", "manager"].includes(String(workspace.role))
    ) {
      return json(request, { error: "forbidden" }, 403);
    }
    const service = serviceClient();
    if (input.action === "create_endpoint") {
      assertSafeWebhookUrl(input.url);
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const secret = `whsec_${
        Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0"))
          .join("")
      }`;
      const { data, error } = await service.from("webhook_endpoints").insert({
        organization_id: organizationId,
        name: input.name,
        url: input.url,
        event_types: input.event_types,
        signing_secret_hash: await sha256(secret),
        encrypted_signing_secret: await encryptSecret(secret),
        created_by: user.id,
      }).select("id,name,url,event_types,enabled,created_at").single();
      if (error) throw error;
      return json(
        request,
        { ok: true, endpoint: data, signing_secret: secret },
        201,
      );
    }

    const { data: endpoint } = await service.from("webhook_endpoints")
      .select("id").eq("id", input.endpoint_id).eq(
        "organization_id",
        organizationId,
      ).maybeSingle();
    if (!endpoint) return json(request, { error: "not_found" }, 404);
    if (input.action === "disable_endpoint") {
      const { error } = await service.from("webhook_endpoints").update({
        enabled: false,
        disabled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", input.endpoint_id);
      if (error) throw error;
      return json(request, { ok: true });
    }
    const eventId = crypto.randomUUID();
    const { error } = await service.from("webhook_deliveries").insert({
      organization_id: organizationId,
      endpoint_id: input.endpoint_id,
      event_id: eventId,
      event_type: "integration.test",
      payload: {
        id: eventId,
        type: "integration.test",
        occurred_at: new Date().toISOString(),
      },
    });
    if (error) throw error;
    return json(request, { ok: true, event_id: eventId }, 202);
  } catch (error) {
    const unauthorized = error instanceof Error &&
      error.message === "Unauthorized";
    console.error(error);
    return json(request, {
      error: unauthorized ? "unauthorized" : "request_failed",
    }, unauthorized ? 401 : 400);
  }
});
