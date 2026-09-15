import { decryptSecret, hmacHex } from "../_shared/integration-crypto.ts";
import {
  constantTimeEqual,
  env,
  json,
  preflight,
  requirePost,
} from "../_shared/http.ts";
import { recordJobHeartbeat } from "../_shared/job-heartbeat.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { assertSafeWebhookUrl } from "../_shared/webhook-url.ts";

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  if (
    !constantTimeEqual(
      request.headers.get("x-cron-secret") ?? "",
      env("CRON_SECRET"),
    )
  ) {
    return json(request, { error: "unauthorized" }, 401);
  }
  const supabase = serviceClient();
  const startedAt = new Date().toISOString();
  await recordJobHeartbeat(
    supabase,
    "integration-dispatch",
    "started",
    startedAt,
  );
  const { data: jobs, error: claimError } = await supabase.rpc(
    "claim_webhook_deliveries",
    {
      p_limit: 25,
    },
  );
  if (claimError) {
    await recordJobHeartbeat(
      supabase,
      "integration-dispatch",
      "failed",
      startedAt,
      {
        error: "claim_failed",
      },
    );
    return json(request, { error: "claim_failed" }, 500);
  }
  let delivered = 0;
  let failed = 0;
  for (const job of jobs ?? []) {
    try {
      const { data: endpoint, error } = await supabase.from("webhook_endpoints")
        .select("url,encrypted_signing_secret,enabled")
        .eq("id", job.endpoint_id).single();
      if (error || !endpoint.enabled) {
        throw error ?? new Error("endpoint disabled");
      }
      const body = JSON.stringify(job.payload);
      if (new TextEncoder().encode(body).length > 256 * 1024) {
        throw new Error("payload too large");
      }
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = await hmacHex(
        await decryptSecret(endpoint.encrypted_signing_secret),
        `${timestamp}.${body}`,
      );
      const target = assertSafeWebhookUrl(endpoint.url);
      const response = await fetch(target, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
        headers: {
          "content-type": "application/json",
          "user-agent": "Haccora-Webhooks/1.0",
          "idempotency-key": job.event_id,
          "x-haccora-event": job.event_type,
          "x-haccora-signature": `t=${timestamp},v1=${signature}`,
        },
        body,
      });
      const excerpt = (await response.text()).slice(0, 500);
      if (!response.ok) {
        throw new Error(`endpoint returned ${response.status}: ${excerpt}`);
      }
      await supabase.from("webhook_deliveries").update({
        status: "delivered",
        response_status: response.status,
        response_excerpt: excerpt,
        delivered_at: new Date().toISOString(),
        locked_at: null,
      }).eq("id", job.id);
      await supabase.from("webhook_endpoints").update({
        failure_count: 0,
        updated_at: new Date().toISOString(),
      })
        .eq("id", job.endpoint_id);
      delivered += 1;
    } catch (error) {
      failed += 1;
      const dead = job.attempts >= 8;
      await supabase.from("webhook_deliveries").update({
        status: dead ? "dead_letter" : "failed",
        next_attempt_at: new Date(
          Date.now() + Math.min(21600, 30 * 2 ** job.attempts) * 1000,
        ).toISOString(),
        last_error: error instanceof Error
          ? error.message.slice(0, 1000)
          : "unknown",
        locked_at: null,
      }).eq("id", job.id);
      const { data: endpoint } = await supabase.from("webhook_endpoints")
        .select("failure_count")
        .eq("id", job.endpoint_id).single();
      const failures = (endpoint?.failure_count ?? 0) + 1;
      await supabase.from("webhook_endpoints").update({
        failure_count: failures,
        enabled: failures < 20,
        disabled_at: failures >= 20 ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", job.endpoint_id);
    }
  }
  const result = {
    claimed: jobs?.length ?? 0,
    delivered,
    failed,
  };
  await recordJobHeartbeat(
    supabase,
    "integration-dispatch",
    "succeeded",
    startedAt,
    result,
  );
  return json(request, { ok: true, ...result });
});
