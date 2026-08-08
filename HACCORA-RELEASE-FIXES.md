# Haccora release-fix package

This package is based on `main` commit `c8432b3d05a770307c0208f6113c4924984c0078`.

## Fixed in this package

- Synchronised the root npm lockfile so a clean `npm ci` succeeds.
- Made the duplicated Phase 23 platform migration safe on fresh databases while preserving both published migration versions.
- Extended migration-lineage verification for the documented published replay.
- Changed the PWA language metadata from German to UK English.
- Restricted the public contact function to the UK English launch locale.
- Formatted generated authentication clients so the enforced lint and formatting gates pass.
- Regenerated the TanStack route tree with the locked generator version and verified that a second build produces the same file.
- Added regression tests for UK-only language defaults.
- Added role-aware native navigation: inspectors receive a focused evidence/equipment surface, management-only tools are hidden from staff, and the bottom navigation respects device safe areas.

## Verification completed

- `npm ci`
- `npm run quality` — 121 tests, TypeScript, lint, formatting, migration lineage, secret scan, production build, bundle budget and worker smoke test all passed.
- `cd mobile && npm ci`
- `cd mobile && npm run typecheck`
- `cd mobile && npm run export:check` — web, iOS and Android exports passed.

## Still requires the owner's production accounts or approval

- Link and verify the intended backend staging project before applying migrations.
- Seed and verify demo accounts against that same hosted project.
- Replace the EAS project placeholder using `eas init`, then configure Apple/Google signing and APNs/FCM credentials.
- Configure the production backend, Stripe, email, malware scanning, monitoring, backups and scheduled jobs.
- Complete physical-device, tenant-isolation, restore and penetration testing.
- Track upstream fixes for the current transitive `nanoid` and Expo/Metro `image-size` advisories; npm currently reports no available fix for these dependency chains.
- Add the real UK company identity and obtain UK legal/privacy and competent food-safety review.

Do not add `.env` files, service-role keys, signing credentials or provider secrets to GitHub.