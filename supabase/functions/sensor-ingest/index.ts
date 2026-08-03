import { z } from "zod";
import {
  constantTimeEqual,
  json,
  preflight,
  requirePost,
  sha256,
} from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";

const Input = z.object({
  deviceId: z.string().min(1).max(160),
  eventId: z.string().min(1).max(160),
  reading: z.number().finite().min(-100).max(300),
  capturedAt: z.string().datetime(),
  unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
});

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  try {
    const body = Input.parse(await request.json());
    const capturedAt = new Date(body.capturedAt).getTime();
    const now = Date.now();
    if (capturedAt < now - 7 * 86400000 || capturedAt > now + 10 * 60_000) {
      return json(request, { error: "captured_at_out_of_range" }, 400);
    }
    const secret = request.headers.get("x-device-secret") ?? "";
    if (secret.length < 24) {
      return json(request, { error: "unauthorized" }, 401);
    }
    const supabase = serviceClient();
    const { data: device, error: deviceError } = await supabase
      .from("sensor_devices")
      .select("*")
      .eq("external_device_id", body.deviceId)
      .eq("is_active", true)
      .maybeSingle();
    if (deviceError) throw deviceError;
    if (
      !device || !constantTimeEqual(await sha256(secret), device.secret_hash)
    ) {
      return json(request, { error: "unauthorized" }, 401);
    }

    const { error } = await supabase.from("sensor_readings").upsert(
      {
        organization_id: device.organization_id,
        location_id: device.location_id,
        device_id: device.id,
        external_event_id: body.eventId,
        reading: body.reading,
        unit: body.unit,
        captured_at: body.capturedAt,
        raw_payload: body,
      },
      { onConflict: "device_id,external_event_id", ignoreDuplicates: true },
    );
    if (error) throw error;

    const celsiusReading = body.unit === "fahrenheit"
      ? (body.reading - 32) * (5 / 9)
      : body.reading;
    const { error: temperatureError } = await supabase.from("temperature_logs")
      .insert({
        organization_id: device.organization_id,
        location_id: device.location_id,
        user_id: device.created_by,
        location: device.name,
        reading: Number(celsiusReading.toFixed(3)),
        target_min: device.target_min,
        target_max: device.target_max,
        logged_at: body.capturedAt,
        idempotency_key: `sensor:${device.id}:${body.eventId}`,
        note:
          `Automated sensor reading (${body.deviceId}; source unit: ${body.unit})`,
      });
    if (temperatureError && temperatureError.code !== "23505") {
      throw temperatureError;
    }

    await supabase
      .from("sensor_devices")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", device.id);
    return json(request, { ok: true }, 202);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json(request, { error: "invalid_request" }, 400);
    }
    console.error(error);
    return json(request, { error: "ingest_failed" }, 500);
  }
});
