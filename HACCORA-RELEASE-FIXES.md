# Haccora release-fix package

This package is based on `main` commit
`8600ab6d58c2f82a353002b33f8a936217186288`.

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
- Included the existing UK-only language, legal, pricing, role-aware navigation, compact typography, equipment QR, audit-history and compliance workflow improvements from `main`.

## Verification completed

- `npm ci`
- `npm run quality` — 128 tests, TypeScript, lint, formatting, migration lineage, secret scan, production build, bundle budget and worker smoke test all passed.
- `cd mobile && npm ci`
- `cd mobile && npm run typecheck`
- `cd mobile && npm run export:check` — web, iOS and Android exports passed.

## Still requires the owner's production accounts or approval

- Link and verify the intended backend staging project before applying migrations.
- Seed and verify demo accounts and every RLS role against that same hosted project.
- Replace the EAS project placeholder using `eas init`, then configure Apple/Google signing and APNs/FCM credentials.
- Configure Expo enhanced push security, the access token and scheduled delivery-receipt checks.
- Configure the production backend, Stripe, email, malware scanning, monitoring, backups and scheduled jobs.
- Complete physical-device push-notification, offline-sync, tenant-isolation, restore and penetration testing.
- Track upstream fixes for the current transitive `nanoid` and Expo/Metro `image-size` advisories; npm currently reports no available fix for these dependency chains.
- Add the real UK company identity and obtain UK legal/privacy and competent food-safety review. Haccora can support compliant records but cannot itself guarantee regulatory acceptance.

Do not add `.env` files, service-role keys, signing credentials or provider secrets
to GitHub.
