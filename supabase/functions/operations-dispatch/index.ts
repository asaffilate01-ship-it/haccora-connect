import {
  constantTimeEqual,
  env,
  json,
  preflight,
  requirePost,
} from "../_shared/http.ts";
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
  const { data, error } = await supabase.rpc("dispatch_operations_control");
  if (error) {
    console.error(error);
    return json(request, { error: "operations_dispatch_failed" }, 500);
  }
  return json(request, { ok: true, ...(data ?? {}) });
});
