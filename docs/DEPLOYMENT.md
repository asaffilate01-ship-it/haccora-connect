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

Set every server-only value documented in `.env.example`, including scanner, Stripe and integration encryption values, in Supabase secrets. Set `STRIPE_LIVE_MODE=false` in staging and `true` only beside live Stripe credentials. The service-role key and built-in Supabase URL/auth keys are supplied by the function runtime and must never enter client variables.

Set `OPERATIONS_MONITOR_SECRET` to a separate 32+ character value. Do not reuse `CRON_SECRET`: the production monitor must be able to read aggregate health without gaining permission to execute jobs.

Deploy every directory under `supabase/functions`. JWT behavior is declared in `supabase/config.toml`.

Schedule `file-scan`, `operations-dispatch` and `integration-dispatch` at least every five minutes and `notification-dispatch` at least every 15 minutes using POST plus the `x-cron-secret` header. Monitor non-2xx responses, missed schedules and dead-letter rows.

After the first successful run of every schedule, set the GitHub `OPERATIONS_HEALTH_URL` variable and `OPERATIONS_MONITOR_SECRET` secret, then run `npm run operations:health`. The protected endpoint returns 503 for overdue/failed jobs or dead letters and is checked every 15 minutes by `.github/workflows/uptime.yml`.

Sensor secrets are returned once by `sensor-provision`. Deliver each secret through a secure device-management channel; never store it in GitHub, support tickets or analytics. Sensor POSTs use `x-device-secret` and must provide a globally unique event ID.

## Release verification

- Run `npm run quality`, `npm run audit:production`, the native typecheck/export and the Edge Function Deno checks.
- Run `npm run test:e2e` and retain the browser-accessibility report as release evidence.
- Populate a production `.env` outside Git, then run `npm run launch:preflight`; placeholders and missing legal, Stripe, scanner or EAS configuration must block release.
- Exercise the ten acceptance tests in `PRODUCTION_READINESS.md` against staging.
- Verify real redirect URLs, CORS origins, email delivery, push receipts, signed-document expiry and scheduler alerts.
- Configure an external uptime monitor for `/health.json`; the endpoint intentionally reports only service identity and readiness state.
- Obtain legal/privacy, food-safety, security and product-owner sign-off before production traffic.
- Complete `docs/launch-acceptance.example.json` privately, set it as the protected production Environment secret `LAUNCH_ACCEPTANCE_JSON`, and require `npm run launch:acceptance` to pass for the exact deployed SHA and URL.
