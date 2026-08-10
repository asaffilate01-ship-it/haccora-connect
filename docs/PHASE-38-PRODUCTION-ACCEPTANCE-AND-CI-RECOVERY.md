# Haccora Phase 38 — production acceptance and CI recovery

Audited: 10 August 2026  
GitHub main: `e9fd79d90e825060a58cfb0ec50f82d7184aba05`  
Live deployment: `e9fd79d90e825060a58cfb0ec50f82d7184aba05`  
Target: Haccora · Haccora Ltd · `haccora.co.uk` · UK only

## Outcome

The Phase 37 release has reached the live Lovable deployment and its liveness, security headers, release identity and public readiness route are working. Phase 38 repairs authentication-source drift introduced while that release was split into Lovable commits, makes that drift a dependency-free CI blocker, restores npm 10 lockfile reproducibility, and adds direct Supabase Auth health evidence plus post-launch readiness monitoring.

The Phase 38 source candidate is approximately **96/100 implemented**. The currently deployed Phase 37 release is approximately **62/100 proven-live ready**: it serves the exact GitHub SHA and has configured authentication, but its own readiness contract still blocks public launch and two mandatory GitHub workflows are red.

## Current live evidence

- `/health.json` returns 200 with release `e9fd79d90e825060a58cfb0ec50f82d7184aba05`.
- `/readiness.json` returns 200 and `action_required` with `publicWebReady: false`.
- Authentication configuration is present.
- Legal identity, legal approval, support, status monitoring and browser push are not launch-ready.
- The public company-details page still says `Draft — do not publish` and lacks the registered office, postal town/city, company number and phone.
- HSTS, CSP, anti-framing, no-sniff, cross-origin and permissions-policy headers are present.
- No active German interface or legal copy was found by the current UK regression suite.
- Interactive authenticated journeys were not re-run against the live service in this audit; those remain a protected staging acceptance task.

## GitHub evidence before Phase 38

- CodeQL: passed.
- Native build/export: passed.
- Edge Function format, lint and type checks: passed.
- Production checks: failed at root `npm ci` because npm 10 found `lru-cache@11.5.2` missing from the lockfile.
- Fresh database and RLS checks: failed while starting the fresh local database; no migration changed in Phase 37, so this is a pre-existing release blocker and must be re-run with owner-visible logs after Phase 38 is published.
- The split Phase 37 source failed 3/185 tests because Lovable restored its generated Supabase client and weakened the new source-integrity script.

## Changes built in Phase 38

- Restored the exact verified Phase 37 Supabase client, auth middleware, auth attacher and privileged server client.
- Strengthened `source:integrity` across all authentication boundaries and both sides of the production build.
- Added a dependency-free `release-integrity` CI job that blocks web, native and Edge jobs before installation when generated source drifts.
- Regenerated the root lockfile with npm 10.9.4 and recorded that package-manager version.
- Added an official `/auth/v1/health` Supabase Auth probe that rejects insecure URLs and secret keys.
- Added Auth health to staging, protected production release evidence and scheduled production monitoring.
- Added release-SHA monitoring and an opt-in post-launch readiness monitor. `PRODUCTION_PUBLIC_LAUNCH` must remain false until all public gates pass.
- Added four Phase 38 regression tests.

## Validation completed

- Root install reproduced successfully with the same npm 10.9.4 line used by GitHub Actions.
- `npm run quality` passed: type checking, linting, formatting, production build, bundle budgets, worker route smoke tests, 64-migration lineage, 266 RLS policies, 119 database functions, secret scanning and all 189 regression tests.
- The Expo native workspace passed a clean dependency install and TypeScript check.
- Expo exported Android, iOS and web production bundles successfully.
- The generated route tree was regenerated to the same verified state as the complete Phase 37 candidate.
- A fresh remote database/RLS replay was not possible locally; the existing GitHub failure still needs its owner-visible log and a new workflow run after this branch is published.

## Remaining P0 release blockers

1. Publish Phase 38 and obtain green Production checks, CodeQL and Fresh database/RLS checks. Inspect and fix the exact fresh-database replay error if it remains red.
2. Supply and verify Haccora Ltd's Companies House number, registered office, postal town/city and business phone.
3. Obtain recorded UK legal/privacy and competent food-safety approval for the exact release.
4. Configure verified support and independent status URLs, web push, transactional email, Stripe, malware scanning, scheduler monitoring and alert routing.
5. Run the protected staging `apply-and-test` rehearsal, every seeded role journey, cross-tenant/storage denials and inspector scope tests.
6. Complete penetration testing, DPIA/worker-monitoring review, backup restoration and incident rehearsal.
7. Run the protected production evidence workflow and retain the SHA-bound manifest, SBOMs and attestations.

## Native-store blockers

- Replace `SET_WITH_EAS_INIT` with Haccora's real EAS project.
- Configure Apple/Google signing and APNs/FCM credentials.
- Complete physical-device, offline, QR/GPS consent, document, alert, freeze and tablet testing.
- Complete TestFlight, Play internal testing and store review.

No source build can responsibly invent statutory company data, provider credentials, signing identities or accountable approvals. Those are the remaining distance between a strong release candidate and an evidence-backed public launch.
