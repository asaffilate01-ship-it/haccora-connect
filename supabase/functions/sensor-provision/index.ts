import { z } from "zod";
import { json, preflight, requirePost, sha256 } from "../_shared/http.ts";
import { requireUser, serviceClient } from "../_shared/supabase.ts";

const Input = z
  .object({
    name: z.string().trim().min(2).max(160),
    externalDeviceId: z.string().trim().min(3).max(160),
    locationId: z.string().uuid(),
    targetMin: z.number().finite().min(-100).max(300),
    targetMax: z.number().finite().min(-100).max(300),
  })
  .refine((value) => value.targetMin < value.targetMax, {
    message: "targetMin must be lower than targetMax",
  });

function createSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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
    const ctx = context && typeof context === "object"
      ? (context as Record<string, unknown>)
      : {};
    const organizationId = String(ctx.organization_id ?? "");
    if (!organizationId || !["owner", "manager"].includes(String(ctx.role))) {
      return json(request, { error: "forbidden" }, 403);
    }

    const supabase = serviceClient();
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("id")
      .eq("id", input.locationId)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .maybeSingle();
    if (locationError) throw locationError;
    if (!location) return json(request, { error: "invalid_location" }, 400);

    const secret = createSecret();
    const { data: device, error } = await supabase
      .from("sensor_devices")
      .insert({
        organization_id: organizationId,
        location_id: input.locationId,
        name: input.name,
        external_device_id: input.externalDeviceId,
        secret_hash: await sha256(secret),
        target_min: input.targetMin,
        target_max: input.targetMax,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error?.code === "23505") {
      return json(request, { error: "device_id_exists" }, 409);
    }
    if (error) throw error;
    return json(request, {
      id: device.id,
      deviceId: input.externalDeviceId,
      secret,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json(request, { error: "invalid_request" }, 400);
    }
    console.error(error);
    return json(request, { error: "sensor_provision_failed" }, 500);
  }
});
