import { z } from "zod";
import { hasDokuveraIntegrationAccess } from "../_shared/dokuvera-access.ts";
import { env, json, preflight, requirePost } from "../_shared/http.ts";
import { requireUser, serviceClient } from "../_shared/supabase.ts";

const Input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_connection"),
    location_id: z.string().uuid(),
    dokuvera_project_id: z.string().uuid(),
    project_label: z.string().trim().min(2).max(120),
  }),
  z.object({
    action: z.literal("disable_connection"),
    connection_id: z.string().uuid(),
  }),
]);

function callbackUrl(): string {
  return `${
    env("SUPABASE_URL").replace(/\/$/, "")
  }/functions/v1/dokuvera-webhook`;
}

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
    if (input.action === "disable_connection") {
      const { data, error } = await service
        .from("dokuvera_connections")
        .update({
          enabled: false,
          disabled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.connection_id)
        .eq("organization_id", organizationId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return json(request, { error: "not_found" }, 404);
      return json(request, { ok: true, callback_url: callbackUrl() });
    }

    if (!(await hasDokuveraIntegrationAccess(service, organizationId))) {
      return json(request, { error: "integration_not_in_plan" }, 403);
    }

    const { data: location } = await service
      .from("locations")
      .select("id")
      .eq("id", input.location_id)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .maybeSingle();
    if (!location) return json(request, { error: "invalid_location" }, 400);

    const { data: existing } = await service
      .from("dokuvera_connections")
      .select("id,organization_id")
      .eq("dokuvera_project_id", input.dokuvera_project_id)
      .maybeSingle();
    if (existing && existing.organization_id !== organizationId) {
      return json(request, { error: "project_already_connected" }, 409);
    }

    const values = {
      organization_id: organizationId,
      location_id: input.location_id,
      dokuvera_project_id: input.dokuvera_project_id,
      project_label: input.project_label,
      enabled: true,
      disabled_at: null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };
    const query = existing
      ? service.from("dokuvera_connections").update(values).eq(
        "id",
        existing.id,
      )
      : service.from("dokuvera_connections").insert(values);
    const { data, error } = await query
      .select(
        "id,location_id,dokuvera_project_id,project_label,enabled,created_at",
      )
      .single();
    if (error) throw error;
    return json(request, {
      ok: true,
      connection: data,
      callback_url: callbackUrl(),
    }, 201);
  } catch (error) {
    const unauthorized = error instanceof Error &&
      error.message === "Unauthorized";
    console.error(error);
    return json(
      request,
      { error: unauthorized ? "unauthorized" : "request_failed" },
      unauthorized ? 401 : 400,
    );
  }
});
