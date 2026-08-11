# Haccora Phase 39 — CI and clean-database recovery

Built from GitHub main `152f5d89e2f2db7b1950e4b49fc3ee2bd3820ea9` on 11 August 2026.

## Purpose

Phase 39 addresses the code-controlled blockers found after Phase 38 reached Lovable. It isolates Haccora application authentication from hosting-generated files, preserves the published migration ledger while making clean local replay possible, expands hosted route smoke coverage and makes scheduled monitoring exercise the current release before public launch.

## Implemented

- Added a Haccora-owned public Supabase client and auth-attacher.
- Migrated web application imports away from the generated Lovable client.
- Strengthened source integrity to reject any future direct application import of the generated client.
- Rejected accidental `sb_secret_` key exposure at the shared public configuration boundary.
- Added a non-login, non-inheriting, non-RLS-bypassing compatibility role through `supabase/roles.sql` so historic migrations replay without rewriting their published history.
- Extended pgTAP coverage to prove the compatibility role retains no login, RLS bypass, `auth.users` or `auth` schema privilege.
- Expanded hosted smoke coverage to Help, Platform, Terms and Company Details.
- Applied private, non-cacheable responses to every web account and control-plane entry point and made the built-worker gate prove them.
- Allowed hosted smoke monitoring to recognise Lovable's revalidation-only normalisation while retaining strict `no-store` for Haccora's health and readiness endpoints.
- Enabled scheduled health and release-drift monitoring against the temporary Lovable deployment when production repository variables are not yet configured.
- Made public-launch monitoring fail when authentication or operational probes are incomplete.

## Validation completed

- `npm run quality` passed: production structure, 64-migration lineage, 466-file secret scan, seven pinned workflows, TypeScript, 192/192 tests, lint, formatting, production build, source-integrity, bundle budget and an 11-route built-worker smoke test.
- Live smoke passed against `https://hacccora-chums.lovable.app` and deployed release `152f5d89e2f2db7b1950e4b49fc3ee2bd3820ea9` across ten public, auth, legal, health and readiness routes.
- Native `npm ci`, TypeScript and Expo offline export passed for iOS, Android and web.
- Native store preflight now stops only on the Haccora Expo/EAS project UUID. The source contains no invented account identifier.
- A local clean Supabase replay could not be executed because this build environment does not provide Docker. The repaired fresh-database workflow is the authoritative acceptance gate once this phase is published to GitHub.

Passing source and bundle gates means this phase is buildable; it is not a substitute for the external launch evidence below.

## Remaining external acceptance

- Haccora Ltd statutory identity and qualified UK legal/privacy approval.
- Production payment, email, push, malware-scanning, support, status and operational-monitoring providers.
- Protected staging role, tenant-isolation, inspector, document and billing journeys.
- Penetration test, DPIA, backup restoration and incident rehearsal.
- Apple/Google signing, physical-device testing and store approval.

These items require accountable details, provider credentials or real-world evidence and are intentionally not replaced with source placeholders.
