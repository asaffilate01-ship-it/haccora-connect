# Staging and production deployment

Deploy to a separate Supabase staging project first. A successful local build does not validate RLS against real Postgres data or configure external providers.

## Database and generated types

1. Back up the target database and storage.
2. Follow `MIGRATION_RECONCILIATION.md` and record the remote migration ledger.
3. Run `npm run migrations:check`, `supabase db start` and `supabase test db` before applying migrations to linked staging in timestamp order.
4. Reconcile legacy ownership using `DATA_MIGRATION.md`.
5. Correct any historical temperature rows outside the documented range, then run:

   ```sql
   ALTER TABLE public.temperature_logs
     VALIDATE CONSTRAINT ck_temperature_evidence_range;
   ```

6. Regenerate `src/integrations/supabase/types.ts` from the staging schema and rerun `npm run quality`.

## Edge Functions

Set the server-only Edge values documented in `.env.example`, including scanner, email, push and integration encryption values, in Supabase secrets. Stripe is served by the Lovable web runtime: keep its connection credentials and signing secrets in Lovable, and copy only `PAYMENTS_RUNTIME_PROVIDER`, `PAYMENTS_ENVIRONMENT` and `PAYMENTS_WEBHOOK_URL` to Supabase for platform routing-readiness reporting. The service-role key and built-in Supabase URL/auth keys are supplied by the function runtime and must never enter client variables.

Set `OPERATIONS_MONITOR_SECRET` to a separate 32+ character value. Do not reuse `CRON_SECRET`: the production monitor must be able to read aggregate health without gaining permission to execute jobs.

Deploy every directory under `supabase/functions`. JWT behavior is declared in `supabase/config.toml`.

Schedule `file-scan`, `operations-dispatch` and `integration-dispatch` at least every five minutes and `notification-dispatch` at least every 15 minutes using POST plus the `x-cron-secret` header. Monitor non-2xx responses, missed schedules and dead-letter rows.

The repository-managed `.github/workflows/production-dispatch.yml` supplies these schedules. Set the protected GitHub `SUPABASE_URL` variable and a `CRON_SECRET` repository secret matching the Supabase Edge Function secret, then manually run **Production scheduled dispatch** once. Keep the workflow enabled on the default branch; each invocation fails on any non-2xx dispatcher response.

After the first successful run of every schedule, set the GitHub `OPERATIONS_HEALTH_URL` variable and `OPERATIONS_MONITOR_SECRET` secret, then run `npm run operations:health`. The protected endpoint returns 503 for overdue/failed jobs or dead letters and is checked every 15 minutes by `.github/workflows/uptime.yml`.

Sensor secrets are returned once by `sensor-provision`. Deliver each secret through a secure device-management channel; never store it in GitHub, support tickets or analytics. Sensor POSTs use `x-device-secret` and must provide a globally unique event ID.

## Release verification

- Run `npm run quality`, `npm run audit:production`, the native typecheck/export and the Edge Function Deno checks.
- Configure protected `EAS_PROJECT_ID` from Haccora's `eas init` result. The native workflows map the protected staging/production Supabase variables to `EXPO_PUBLIC_*`; never copy a service-role or `sb_secret_` key into those values.
- Run `npm run test:e2e` locally and through the protected staging workflow. Staging and production now set `PLAYWRIGHT_BASE_URL` to the deployed HTTPS candidate and retain desktop/mobile accessibility results as release evidence.
- Run `npm run launch:bootstrap` to create the ignored local checklist and generate only Haccora-owned operational secrets. Complete the provider/legal values described in `LAUNCH-CONFIGURATION.md`, use `npm run launch:status` for a redacted gap report, then run `npm run launch:preflight`; placeholders and missing legal, Stripe, scanner or EAS configuration must block release.
- Exercise the ten acceptance tests in `PRODUCTION_READINESS.md` against staging.
- Verify real redirect URLs, CORS origins, email delivery, push receipts, signed-document expiry and scheduler alerts.
- Configure an external uptime monitor for `/health.json`; it intentionally reports only service identity and release liveness.
- Verify `/readiness.json` before customer traffic is enabled. It reports only non-secret booleans for authentication, UK legal publication, support/status links, browser push and the Lovable-hosted live payment runtime; the protected production workflow fails if any remain incomplete.
- Set the repository variables `PRODUCTION_RELEASE_SHA`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The scheduled workflow then detects release drift and directly checks the official Supabase Auth health endpoint.
- Until `PRODUCTION_URL` is configured explicitly, scheduled health and release-drift probes use the canonical `https://haccora.co.uk` deployment and the current main SHA. This fallback is public and contains no credentials; set the variable to remove the configuration warning.
- Set `PRODUCTION_PUBLIC_LAUNCH=true` only after the protected release gate passes. Scheduled readiness checks then fail closed if legal, support, status, push or authentication configuration regresses.
- Obtain legal/privacy, food-safety, security and product-owner sign-off before production traffic.
- Complete `docs/launch-acceptance.example.json` privately, set it as the protected production Environment secret `LAUNCH_ACCEPTANCE_JSON`, and require `npm run launch:acceptance` to pass for the exact deployed SHA and URL.
