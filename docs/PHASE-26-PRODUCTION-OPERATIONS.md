# Phase 26 — production operations and release gates

## Delivered

- Service-role-only heartbeats for `file-scan`, `operations-dispatch`, `integration-dispatch` and `notification-dispatch`.
- A protected `operations-health` Edge Function that returns aggregate scheduler age and dead-letter counts only. It returns HTTP 503 when a required job is overdue, failed or has dead letters.
- Scheduled GitHub monitoring of the aggregate operations endpoint using a dedicated monitor credential that cannot invoke cron jobs.
- Production release evidence now requires healthy schedulers and queues for the exact deployed candidate.
- `notification-dispatch` is explicitly configured for cron-secret authentication instead of being blocked by Supabase JWT verification.
- A governed npm audit policy: root and Edge findings remain zero; only the two exact Expo/Metro `image-size` build-tool advisories are temporarily excepted, with a hard 30 September 2026 expiry.
- Repaired the native `nanoid` resolution and the Deno formatting regression inherited from the Phase 25 GitHub upload.

## Production configuration

Set the following Supabase Edge Function secret to a new random value of at least 32 characters:

- `OPERATIONS_MONITOR_SECRET`

It must be different from `CRON_SECRET`. The monitor can read only aggregate liveness/queue health; it cannot run dispatchers.

Set these GitHub values:

- Repository/environment variable `OPERATIONS_HEALTH_URL`, for example `https://<project-ref>.supabase.co/functions/v1/operations-health`.
- Repository secret `OPERATIONS_MONITOR_SECRET` for the scheduled uptime workflow.
- The same secret inside the protected production Environment for the release-evidence workflow.

After applying migration `20260809120000_production_job_heartbeats.sql` and deploying all Edge Functions:

1. Schedule `file-scan`, `operations-dispatch` and `integration-dispatch` at least every five minutes.
2. Schedule `notification-dispatch` at least every 15 minutes.
3. Invoke each dispatcher once with `x-cron-secret` to establish its first successful heartbeat.
4. Run `npm run operations:health` with `OPERATIONS_HEALTH_URL` and `OPERATIONS_MONITOR_SECRET`.
5. Resolve any dead-letter records; they intentionally keep production health degraded until reviewed.

The 15-minute GitHub uptime workflow then verifies the public application and protected operations state. Route GitHub Actions failures to the approved on-call channel in repository notification settings.

## Dependency exception control

`security/dependency-audit-exceptions.json` is deliberately narrow. The audit gate fails when:

- any additional advisory appears;
- advisory severity or package identity changes;
- a vulnerability chain cannot be traced to an approved direct advisory; or
- the exception reaches its expiry date.

This is not a permanent security waiver. Replace it with the patched Expo/Metro dependency tree as soon as a compatible release is available, and record security-owner approval before production release.

## Still external

Source code cannot provide Apple/Google signing, real provider credentials, a backup restore result, penetration-test evidence, UK legal/privacy approval or qualified food-safety validation. Those remain mandatory launch gates.
