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
  const scannerUrl = env("MALWARE_SCAN_URL");
  const scannerToken = env("MALWARE_SCAN_TOKEN");
  const supabase = serviceClient();
  const startedAt = new Date().toISOString();
  await recordJobHeartbeat(supabase, "file-scan", "started", startedAt);
  const { data: jobs, error: claimError } = await supabase.rpc(
    "claim_file_scan_jobs",
    { p_limit: 10 },
  );
  if (claimError) {
    await recordJobHeartbeat(supabase, "file-scan", "failed", startedAt, {
      error: "claim_failed",
    });
    return json(request, { error: "claim_failed" }, 500);
  }
  let clean = 0;
  let failed = 0;
  for (const job of jobs ?? []) {
    try {
      const { data: file, error: downloadError } = await supabase.storage.from(
        "documents",
      ).download(job.storage_path);
      if (downloadError || !file) {
        throw downloadError ?? new Error("download failed");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("file exceeds scan limit");
      }
      const response = await fetch(scannerUrl, {
        method: "POST",
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${scannerToken}`,
          "content-type": file.type || "application/octet-stream",
        },
        body: file,
      });
      if (!response.ok) throw new Error(`scanner returned ${response.status}`);
      const verdict = await response.json() as {
        clean?: boolean;
        reference?: string;
        reason?: string;
      };
      const status = verdict.clean === true ? "clean" : "infected";
      const { error } = await supabase.from("file_scan_jobs").update({
        status,
        provider_reference: verdict.reference ?? null,
        result: verdict,
        completed_at: new Date().toISOString(),
        locked_at: null,
      }).eq("id", job.id);
      if (error) throw error;
      clean += status === "clean" ? 1 : 0;
    } catch (error) {
      failed += 1;
      const dead = job.attempts >= 5;
      await supabase.from("file_scan_jobs").update({
        status: dead ? "dead_letter" : "failed",
        last_error: error instanceof Error
          ? error.message.slice(0, 1000)
          : "unknown",
        next_attempt_at: new Date(
          Date.now() + Math.min(3600, 60 * 2 ** job.attempts) * 1000,
        ).toISOString(),
        locked_at: null,
      }).eq("id", job.id);
    }
  }
  const result = { claimed: jobs?.length ?? 0, clean, failed };
  await recordJobHeartbeat(
    supabase,
    "file-scan",
    "succeeded",
    startedAt,
    result,
  );
  return json(request, { ok: true, ...result });
});
