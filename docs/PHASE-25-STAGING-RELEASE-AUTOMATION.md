# Phase 25 — staging and native release automation

## Delivered

- A protected `staging` GitHub Environment workflow with two modes:
  - `verify-only` links the allow-listed project, previews forward migrations, validates source/native exports and smoke-tests the exact hosted commit.
  - `apply-and-test` additionally applies migrations, reconciles the remote ledger, deploys every Edge Function, seeds the demo client and signs in as every role to prove RLS isolation.
- A redacted, SHA-256-backed staging evidence manifest. It records passed gates and supporting outputs without copying credentials or customer records.
- A separate signed internal iOS/Android build workflow. It uses a pinned EAS CLI version, the internal `preview` profile and never auto-submits to either store.
- Stronger hosted role tests across assets, asset history, cleaning, corrective actions, documents, goods-in and training evidence, including an explicit inspector write-denial probe.
- A fail-closed production preflight requirement for Expo enhanced-push access tokens.
- A narrow migration-lineage reconciliation for the two already-published Phase 24 ledger entries, without deleting or rewriting either migration.
- Patched `nanoid` resolution for web/native and a corrected Deno-formatted inspection export. Web and Edge production audits are clear; Expo/Metro's current transitive `image-size` advisory remains an explicit native release risk because npm offers no non-breaking fix for this Expo 57 tree.

## Configure the protected GitHub `staging` Environment

Environment variables:

- `STAGING_DEPLOY_CONFIRM=HACCORA_STAGING_ONLY`
- `STAGING_BACKUP_OR_DISPOSABLE_CONFIRMED=true` only after confirming the project is disposable or backed up
- `STAGING_PROJECT_REF`
- `PRODUCTION_SUPABASE_PROJECT_REF` — must be different
- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_PUBLISHABLE_KEY`
- `PRODUCTION_APP_URL`
- `DEMO_EMAIL_DOMAIN=demo.haccora.co.uk`
- `EAS_CLI_VERSION` — an explicitly approved three-part version

Environment secrets:

- `SUPABASE_ACCESS_TOKEN`
- `STAGING_SUPABASE_DB_PASSWORD`
- `STAGING_SUPABASE_SERVICE_ROLE_KEY`
- `DEMO_PASSWORD`
- `EXPO_TOKEN`

Use required reviewers on the Environment. Do not place any of these secrets in repository variables, workflow inputs, source files or action logs.

## Run the staging rehearsal

1. Deploy the web candidate for the exact Git commit to an HTTPS staging origin.
2. Open **Actions → Protected staging rehearsal → Run workflow**.
3. Run `verify-only` first with the deployed URL.
4. Review the migration dry-run artifact.
5. Run `apply-and-test` only after confirming the staging backup/disposable setting.
6. Download `haccora-staging-<commit>` and retain the manifest with the release record.

The workflow follows Supabase's forward migration model: it uses `db push --dry-run` before `db push`, never runs a remote reset, and proves the local and remote migration timestamps match afterwards.

## Create signed internal apps

1. From `mobile`, run `eas init`/`eas build:configure` with the intended Haccora Expo account and store the real UUID as protected `EAS_PROJECT_ID`.
2. Configure Apple/Google credentials and APNs/FCM in Expo.
3. Run **Actions → Native internal candidate** for iOS, Android or both.
4. Install the resulting internal distributions on representative physical devices.
5. Retain the EAS build artifact plus push, offline-sync, QR, document and deep-link test evidence.

## Remaining external evidence

- Hosted provider secrets and scheduled dispatcher operation.
- Malware scan clean/infected/retry evidence.
- Stripe test/live lifecycle evidence.
- Backup restore, penetration, accessibility and device testing.
- UK legal/privacy approval and competent food-safety review.

This automation proves a deployment; it does not make Haccora “FSA approved” or replace a food business operator's legal responsibilities.
