import { z } from "zod";
import { hasDokuveraIntegrationAccess } from "../_shared/dokuvera-access.ts";
import {
  constantTimeEqual,
  env,
  json,
  preflight,
  readLimitedText,
  RequestBodyError,
  requirePost,
  sha256,
} from "../_shared/http.ts";
import { hmacHex } from "../_shared/integration-crypto.ts";
import { serviceClient } from "../_shared/supabase.ts";

const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const MAX_VOICE_BYTES = 15 * 1024 * 1024;
const SIGNATURE_AGE_SECONDS = 5 * 60;

const Asset = z.object({
  signed_url: z.string().url(),
  mime_type: z.string().trim().min(3).max(100),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .nullable()
    .optional(),
});

const Payload = z.object({
  id: z.string().uuid(),
  type: z.enum(["evidence.captured", "evidence.updated"]),
  occurred_at: z.string().datetime({ offset: true }),
  project_id: z.string().uuid(),
  media: z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid().nullable().optional(),
    kind: z.enum(["image", "photo", "video", "audio"]),
    captured_at: z.string().datetime({ offset: true }),
    asset: Asset,
    original_sha256: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .nullable()
      .optional(),
    voice_asset: Asset.nullable().optional(),
    gps: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        accuracy_m: z.number().min(0).max(100000).nullable().optional(),
      })
      .nullable()
      .optional(),
    location_label: z.string().max(250).nullable().optional(),
    notes: z.string().max(10000).nullable().optional(),
    voice_transcript: z.string().max(20000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
  }),
});

type AssetInput = z.infer<typeof Asset>;

function extension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
  };
  const value = extensions[mimeType.toLowerCase()];
  if (!value) throw new Error("unsupported_media_type");
  return value;
}

function validateSourceUrl(value: string): URL {
  const expectedOrigin = env("DOKUVERA_STORAGE_ORIGIN").replace(/\/$/, "");
  const url = new URL(value);
  if (
    url.origin !== expectedOrigin ||
    url.username ||
    url.password ||
    !url.pathname.startsWith("/storage/v1/object/sign/survey-media/") ||
    !url.searchParams.has("token")
  ) {
    throw new Error("invalid_source_url");
  }
  return url;
}

async function readLimitedBody(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("source_body_missing");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("source_file_too_large");
    }
    chunks.push(value);
  }
  if (total < 1) throw new Error("source_body_missing");
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function download(asset: AssetInput, maxBytes: number) {
  const url = validateSourceUrl(asset.signed_url);
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`source_download_${response.status}`);
  const announced = Number(response.headers.get("content-length") ?? "0");
  if (announced > maxBytes) throw new Error("source_file_too_large");
  const bytes = await readLimitedBody(response, maxBytes);
  const contentType = (response.headers.get("content-type") ?? asset.mime_type)
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== asset.mime_type.toLowerCase()) {
    throw new Error("source_mime_mismatch");
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.buffer as ArrayBuffer,
  );
  const computedSha256 = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  if (asset.sha256 && !constantTimeEqual(asset.sha256, computedSha256)) {
    throw new Error("source_hash_mismatch");
  }
  return { bytes, contentType, sha256: computedSha256 };
}

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  const service = serviceClient();
  let eventId: string | null = null;
  try {
    const rawBody = await readLimitedText(request, 256 * 1024);
    const timestampHeader = request.headers.get("x-dokuvera-timestamp") ?? "";
    const signatureHeader = request.headers.get("x-dokuvera-signature") ?? "";
    const eventHeader = request.headers.get("x-dokuvera-event-id") ?? "";
    const timestamp = Number(timestampHeader);
    if (!Number.isInteger(timestamp)) {
      return json(request, { error: "invalid_timestamp" }, 401);
    }
    if (Math.abs(Date.now() / 1000 - timestamp) > SIGNATURE_AGE_SECONDS) {
      return json(request, { error: "stale_request" }, 401);
    }
    const expected = await hmacHex(
      env("DOKUVERA_BRIDGE_SECRET"),
      `${timestampHeader}.${rawBody}`,
    );
    if (
      !signatureHeader.startsWith("v1=") ||
      !constantTimeEqual(signatureHeader.slice(3), expected)
    ) {
      return json(request, { error: "invalid_signature" }, 401);
    }

    const payload = Payload.parse(JSON.parse(rawBody));
    if (payload.id !== eventHeader) {
      return json(request, { error: "event_id_mismatch" }, 400);
    }
    eventId = payload.id;
    const stablePayload = {
      ...payload,
      media: {
        ...payload.media,
        asset: { ...payload.media.asset, signed_url: "" },
        voice_asset: payload.media.voice_asset
          ? { ...payload.media.voice_asset, signed_url: "" }
          : null,
      },
    };
    const payloadSha256 = await sha256(JSON.stringify(stablePayload));
    const { error: eventError } = await service.from("dokuvera_webhook_events")
      .insert({
        event_id: payload.id,
        event_type: payload.type,
        payload_sha256: payloadSha256,
        source_timestamp: new Date(timestamp * 1000).toISOString(),
      });
    if (eventError) {
      if (eventError.code !== "23505") throw eventError;
      const { data: previousEvent, error: previousEventError } = await service
        .from("dokuvera_webhook_events")
        .select("status,payload_sha256,updated_at,attempts")
        .eq("event_id", payload.id)
        .single();
      if (previousEventError || !previousEvent) {
        throw new Error("event_lookup_failed");
      }
      if (!constantTimeEqual(previousEvent.payload_sha256, payloadSha256)) {
        return json(request, { error: "event_payload_conflict" }, 409);
      }
      if (previousEvent.status === "delivered") {
        return json(request, { ok: true, replay: true });
      }
      const stillProcessing = previousEvent.status === "processing" &&
        Date.now() - new Date(previousEvent.updated_at).getTime() <
          SIGNATURE_AGE_SECONDS * 1000;
      if (stillProcessing) {
        return json(request, { error: "event_processing" }, 409);
      }
      if (previousEvent.attempts >= 1000) {
        return json(request, { error: "event_retry_limit" }, 409);
      }
      const { error: retryError } = await service
        .from("dokuvera_webhook_events")
        .update({
          status: "processing",
          failure_reason: null,
          processed_at: null,
          attempts: previousEvent.attempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", payload.id);
      if (retryError) throw retryError;
    }

    const { data: connection } = await service
      .from("dokuvera_connections")
      .select("id,organization_id,location_id")
      .eq("dokuvera_project_id", payload.project_id)
      .eq("enabled", true)
      .maybeSingle();
    if (!connection) throw new Error("project_not_connected");
    if (
      !(await hasDokuveraIntegrationAccess(service, connection.organization_id))
    ) {
      throw new Error("integration_not_active");
    }
    await service
      .from("dokuvera_webhook_events")
      .update({
        connection_id: connection.id,
        organization_id: connection.organization_id,
      })
      .eq("event_id", payload.id);

    const media = await download(payload.media.asset, MAX_MEDIA_BYTES);
    const mediaPath =
      `${connection.organization_id}/${connection.location_id}/${payload.media.id}/media.${
        extension(media.contentType)
      }`;
    const { error: uploadError } = await service.storage
      .from("dokuvera-evidence")
      .upload(mediaPath, media.bytes, {
        contentType: media.contentType,
        upsert: true,
      });
    if (uploadError) throw uploadError;

    let voice: Awaited<ReturnType<typeof download>> | null = null;
    let voicePath: string | null = null;
    if (payload.media.voice_asset) {
      voice = await download(payload.media.voice_asset, MAX_VOICE_BYTES);
      voicePath =
        `${connection.organization_id}/${connection.location_id}/${payload.media.id}/voice.${
          extension(voice.contentType)
        }`;
      const { error: voiceUploadError } = await service.storage
        .from("dokuvera-evidence")
        .upload(voicePath, voice.bytes, {
          contentType: voice.contentType,
          upsert: true,
        });
      if (voiceUploadError) throw voiceUploadError;
    }

    const { data: previous } = await service
      .from("dokuvera_evidence")
      .select("voice_storage_path,voice_mime_type,voice_file_size,voice_sha256")
      .eq("source_media_id", payload.media.id)
      .maybeSingle();
    const evidence = {
      organization_id: connection.organization_id,
      location_id: connection.location_id,
      connection_id: connection.id,
      source_event_id: payload.id,
      source_media_id: payload.media.id,
      source_project_id: payload.project_id,
      source_user_id: payload.media.user_id ?? null,
      media_type: payload.media.kind === "photo" ? "image" : payload.media.kind,
      storage_path: mediaPath,
      mime_type: media.contentType,
      file_size: media.bytes.byteLength,
      sha256: media.sha256,
      source_original_sha256: payload.media.original_sha256 ?? null,
      voice_storage_path: voicePath ?? previous?.voice_storage_path ?? null,
      voice_mime_type: voice?.contentType ?? previous?.voice_mime_type ?? null,
      voice_file_size: voice?.bytes.byteLength ?? previous?.voice_file_size ??
        null,
      voice_sha256: voice?.sha256 ?? previous?.voice_sha256 ?? null,
      captured_at: payload.media.captured_at,
      received_at: new Date().toISOString(),
      gps_lat: payload.media.gps?.lat ?? null,
      gps_lng: payload.media.gps?.lng ?? null,
      gps_accuracy_m: payload.media.gps?.accuracy_m ?? null,
      location_label: payload.media.location_label ?? null,
      text_notes: payload.media.notes ?? null,
      voice_transcript: payload.media.voice_transcript ?? null,
      source_metadata: payload.media.metadata,
      updated_at: new Date().toISOString(),
    };
    const { error: evidenceError } = await service
      .from("dokuvera_evidence")
      .upsert(evidence, { onConflict: "source_media_id" });
    if (evidenceError) throw evidenceError;

    await service
      .from("dokuvera_webhook_events")
      .update({
        status: "delivered",
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("event_id", payload.id);
    return json(request, { ok: true, evidence_id: payload.media.id }, 202);
  } catch (error) {
    console.error(error);
    if (eventId) {
      await service
        .from("dokuvera_webhook_events")
        .update({
          status: "failed",
          failure_reason: error instanceof Error
            ? error.message.slice(0, 500)
            : "unknown_error",
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", eventId);
    }
    if (error instanceof RequestBodyError) {
      return json(request, { error: error.code }, error.status);
    }
    return json(request, { error: "delivery_failed" }, 400);
  }
});
