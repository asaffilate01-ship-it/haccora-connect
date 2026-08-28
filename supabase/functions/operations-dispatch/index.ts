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
  const { data: billingData, error: billingError } = await supabase.rpc(
    "reconcile_billing_access",
  );
  if (billingError) {
    console.error(billingError);
    await recordJobHeartbeat(
      supabase,
      "operations-dispatch",
      "failed",
      startedAt,
      { error: "billing_access_reconciliation_failed" },
    );
    return json(
      request,
      { error: "billing_access_reconciliation_failed" },
      500,
    );
  }
  const result = data && typeof data === "object" ? data : {};
  const billingResult = billingData && typeof billingData === "object"
    ? billingData
    : {};
  const combinedResult = { ...result, ...billingResult };
  await recordJobHeartbeat(
    supabase,
    "operations-dispatch",
    "succeeded",
    startedAt,
    combinedResult,
  );
  return json(request, { ok: true, ...combinedResult });
});
