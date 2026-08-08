# Haccora release-fix package

This phase was started from GitHub `main` commit
`896c42e73b645a154048b23034369da73a11cee4`.

## Fixed in this package

- Synchronised the root npm lockfile so a clean `npm ci` succeeds.
- Made the duplicated Phase 23 platform migration safe on fresh databases while preserving both published migration versions.
- Added a forward-only reconciliation migration that restores owner access to their tenant billing data after the latest Lovable policy change.
- Kept SaaS platform-operator access active-only, audited and outside direct tenant billing rows.
- Extended production and migration-lineage checks to require the final policy reconciliation.
- Formatted generated authentication clients so the enforced lint and formatting gates pass.
- Added regression tests for the final tenant billing, platform access and native role-routing behaviour.
- Added a native SaaS operator handoff: platform users are recognised before tenant onboarding and directed to the governed web console.
- Made the native web-console URL an explicit environment setting and removed a hard-coded redirect after sign-in.
- Added complete scan-gated native evidence opening with five-minute signed links, safe HTTPS handling and retained archiving.
- Added SHA-256, MIME type and byte-size evidence metadata to native uploads.
- Made notification permission an explicit user action and session registration preference-aware.
- Added safe device-token account transfer plus Expo push-ticket receipt reconciliation and stale-token retirement.
- Added a protected, two-stage Supabase deployment rehearsal with remote ledger proof, Edge Function inventory and redacted evidence.
- Added hosted RLS verification across sensitive evidence tables and an inspector write-denial probe.
- Added an internal-only EAS workflow for signed iOS/Android test candidates, pinned CLI use and committed-source enforcement.
- Made production launch preflight fail closed when enhanced Expo push security is not configured.
- Reconciled the two published Phase 24 migration ledgers without deleting either timestamp or weakening general duplicate detection.
- Pinned the patched `nanoid` release across web and native dependency trees; the root production dependency audit now reports zero findings.
- Corrected the inspection-export Deno formatting regression so all 14 Edge Functions pass format, lint and type checks.
- Included the existing UK-only language, legal, pricing, role-aware navigation, compact typography, equipment QR, audit-history and compliance workflow improvements from `main`.

## Verification completed

- `npm ci`
- `npm run quality` — 135 tests, TypeScript, lint, formatting, migration lineage, secret scan, production build, bundle budget and worker smoke test all passed.
- `cd mobile && npm ci`
- `cd mobile && npm run typecheck`
- `cd mobile && npm run export:check` — web, iOS and Android exports passed.
- All 14 Edge Functions passed Deno format, lint and type checks; their production dependency audit reports zero findings.
- Root production dependency audit reports zero findings. Expo/Metro still reports the upstream `image-size` advisory described below.

## Still requires the owner's production accounts or approval

- Configure and run the protected staging workflow against the intended backend project and hosted candidate.
- Retain successful remote migration, Edge Function, demo-account and every-role RLS evidence.
- Replace the EAS project placeholder using `eas init`, then configure Apple/Google signing and APNs/FCM credentials.
- Configure Expo enhanced push security, the access token and scheduled delivery-receipt checks.
- Configure the production backend, Stripe, email, malware scanning, monitoring, backups and scheduled jobs.
- Complete physical-device push-notification, offline-sync, tenant-isolation, restore and penetration testing.
- Track the Expo/Metro transitive `image-size` advisory. npm currently offers no non-breaking fix for the Expo 57 dependency chain, so native release approval must record or remediate this residual build-tool risk.
- Add the real UK company identity and obtain UK legal/privacy and competent food-safety review. Haccora can support compliant records but cannot itself guarantee regulatory acceptance.

Do not add `.env` files, service-role keys, signing credentials or provider secrets
to GitHub.
