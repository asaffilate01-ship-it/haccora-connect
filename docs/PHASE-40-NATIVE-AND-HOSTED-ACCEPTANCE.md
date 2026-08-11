# Haccora Phase 40 — native and hosted acceptance

Built from Phase 39 commit `712bc8a` on 11–12 August 2026.

## Purpose

Phase 40 closes two release-proof gaps that could otherwise produce a green pipeline without a usable candidate: native exports previously did not prove that a safe Supabase project and application URL were embedded, and browser accessibility tests ran only against a local development server rather than the deployed staging or production release.

## Implemented

- Removed the obsolete committed Expo project placeholder and added dynamic `EAS_PROJECT_ID` injection through `mobile/app.config.js`.
- Added a shared native runtime validator for HTTPS Supabase/application origins, publishable-key safety and the EAS UUID.
- Made CI, protected staging, production release and signed internal-candidate workflows supply and validate the correct native public configuration before export.
- Made the native Supabase client reject `sb_secret_` values and non-HTTPS/non-Supabase project origins at runtime.
- Added a signed-EAS-result verifier that requires finished internal iOS/Android builds and writes a redacted, release-SHA-bound manifest without signed download URLs.
- Added a required staging URL to the internal-candidate workflow so builds cannot silently retain a production or placeholder web destination.
- Extended Playwright to run securely against a clean HTTPS hosted origin without starting the local development server.
- Added desktop and mobile browser accessibility acceptance to protected staging and production workflows and bound the result into release evidence.
- Removed the remaining German-password allowance from the active browser acceptance test.

## Validation completed

- `npm run quality` passed: production structure, migration lineage, secret and Action checks, TypeScript, 195/195 tests, lint, formatting, production build, source integrity, bundle budget and the 11-route worker smoke test.
- Native runtime, store and internal-candidate preflights passed with non-production validation values.
- Native TypeScript and Expo exports passed for iOS, Android and web; the resulting bundle contained the selected validation Supabase origin.
- Expo's resolved dynamic configuration contained the supplied EAS project UUID.
- The signed-build verifier accepted complete iOS/Android fixture results and removed their signed artifact URLs from retained evidence.
- The hosted Playwright configuration and evidence gates are covered by Phase 40 regression tests. The local browser run could not complete because this workspace had no Chromium binary and the browser download endpoint returned a certificate-time 502; GitHub installs Chromium in the protected workflows and remains the execution gate.

## External setup still required

- Run `eas init` in Haccora's Expo account and configure its returned UUID as protected variable `EAS_PROJECT_ID`.
- Configure the staging and production `EXPO_PUBLIC_*` mappings already referenced by the workflows.
- Supply Expo, Apple, Google, APNs and FCM credentials and complete signed physical-device acceptance.
- Publish Phase 39/40 and obtain green GitHub Fresh Database/RLS, Production checks and hosted staging evidence.

The source now fails closed when those account values are absent; it does not fabricate them.
