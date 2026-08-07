# Upload and release handoff

## Upload this project

The distributed ZIP contains the repository contents but intentionally excludes `.git`, `.env`, `node_modules`, build output and local caches.

1. Create an empty GitHub repository or open the existing Haccora repository.
2. Extract the ZIP into the repository root.
3. Review `git diff`. Do not squash or rewrite existing Lovable history.
4. Keep all 44 tracked migration timestamps. Five duplicated Phase 9/14/15/16/20 timestamps have been safely reduced to ledger-preserving no-op or service-role deltas.
5. Preserve Lovable's platform-generated root `.env` if the platform recreates it. It may contain only publishable Supabase client declarations; never add server secrets or other production configuration to it.
6. Run `npm ci`, `npm run quality`, then `cd mobile && npm ci && npm run typecheck && npm run export:check`; run the Edge Function checks locally or in CI.
7. Commit on a branch and open a pull request.
8. Require every configured GitHub check to pass before merging, then deploy the exact merge commit to staging and verify `/health.json`.

## Required deployment order

1. Create a separate Supabase staging project and configure Auth redirect URLs.
2. Reconcile the remote migration ledger using `docs/MIGRATION_RECONCILIATION.md`, then apply the canonical migrations in timestamp order.
3. Set Edge Function secrets from `.env.example` and deploy the functions in `supabase/functions`.
4. Test isolation with two unrelated organizations and a third inspector user.
5. Configure web hosting secrets, deploy to staging, and exercise the release checklist.
6. Back up production, schedule the cut-over, apply the migration and verify audit/storage policies.
7. Run `eas init` in `mobile`, complete native signing/store metadata, and build iOS/Android release candidates.

Never put service-role keys, provider secrets, device secrets, signing certificates or store credentials in GitHub. Lovable currently recreates a tracked root `.env` containing only publishable Supabase client declarations; `npm run secrets:check` and `npm run verify` reject non-publishable declarations in that platform exception. Keep every other environment value in managed production configuration.
