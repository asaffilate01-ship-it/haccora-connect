import {
  constantTimeEqual,
  env,
  json,
  preflight,
  requirePost,
} from "../_shared/http.ts";
import { recordJobHeartbeat } from "../_shared/job-heartbeat.ts";
import { serviceClient } from "../_shared/supabase.ts";

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
    "operations-dispatch",
    "started",
    startedAt,
  );
  const { data, error } = await supabase.rpc("dispatch_operations_control");
  if (error) {
    console.error(error);
    await recordJobHeartbeat(
      supabase,
      "operations-dispatch",
      "failed",
      startedAt,
      {
        error: "operations_dispatch_failed",
      },
    );
    return json(request, { error: "operations_dispatch_failed" }, 500);
  }
  const result = data && typeof data === "object" ? data : {};
  await recordJobHeartbeat(
    supabase,
    "operations-dispatch",
    "succeeded",
    startedAt,
    result,
  );
  return json(request, { ok: true, ...result });
});
