# Haccora Phase 37 — live acceptance and release-drift protection

Audited: 10 August 2026  
GitHub baseline: `2fad1c39290efe8898f9e7e6a6e2d3c60f599345`  
Live deployment: `a9f7f472fc1e25115ee50cd8c202cb091f146dd7`  
Target: Haccora · Haccora Ltd · `haccora.co.uk` · UK only

## Outcome

Phase 37 closes a release-governance defect rather than adding another partially proven feature. The repository now blocks Lovable-generated Supabase drift before and after every production build, and the deployed application has a dedicated public-readiness endpoint that distinguishes “the server is alive” from “customers can safely use the public service”.

The Phase 37 source candidate is approximately **95/100 implemented**. The current Lovable deployment remains approximately **39/100 proven-live ready** because it is six commits behind GitHub `main`, does not contain Phase 36 or Phase 37, exposes no readiness endpoint, still publishes incomplete company details, and has no recorded GitHub workflow or commit-status evidence.

## Audit findings

- GitHub `main` is six commits ahead of the deployed release.
- The current live `/health.json` is healthy and identifies the old release exactly.
- The current live `/readiness.json` returns 404 because Phase 37 is not deployed.
- The current live Company Details page says `Draft — do not publish` and lacks the registered office, postcode/town, company number and phone.
- No active German product or legal wording was found in runtime source. German terms remain only in historical audit statements and regression-test deny-lists.
- GitHub reports no workflow runs or combined statuses for the latest `main` commit.
- Before Phase 37, current GitHub `main` failed two of 182 tests because Lovable restored platform-specific Supabase client code after the tested Phase 36 package was split into commits.
- The repository already contains the broad food-safety, SaaS-owner, tenant, role/RLS, QR, offline, PWA, native, billing, notification and document feature set described in the Phase 36 audit. The remaining distance is now dominated by deployment, configuration and accountable evidence.

## Changes built in Phase 37

- Restored the resilient shared Supabase public configuration and deployment-neutral failure handling.
- Removed the returned Lovable-only logo metadata file.
- Added `source:integrity`, enforced both before and after every production build.
- Added `/readiness.json` with non-secret checks for:
  - authentication connection;
  - complete Haccora Ltd public identity;
  - recorded legal publication approval;
  - verified support URL;
  - verified status URL;
  - browser-push configuration.
- Added a release-bound external readiness checker that fails on an incorrect deployed SHA or any incomplete public gate.
- Added readiness to the production release workflow and tamper-evident release manifest.
- Expanded deployment smoke and built-worker coverage from seven to eight routes.
- Added three Phase 37 regression tests.

## What “100%” now requires

### P0 — before any customer or paid launch

1. Merge Phase 37 through a reviewable PR and obtain green Production checks, CodeQL and fresh-database/RLS checks.
2. Deploy the exact merge SHA to an isolated staging environment and run the protected `apply-and-test` rehearsal.
3. Configure Supabase Auth and execute all nine seeded role journeys plus cross-tenant, storage and inspector denials.
4. Supply Haccora Ltd’s real registered office, postal town/city, Companies House number and phone. Record VAT and ICO registration/exemption decisions.
5. Obtain documented UK legal/privacy and competent food-safety approval tied to the exact release.
6. Configure and prove Stripe, transactional email, APNs/FCM, web push, scheduler jobs, malware scanning, monitoring and support/status channels.
7. Complete independent penetration testing, DPIA/legitimate-interest work, backup restore timing and incident rehearsal.
8. Run the protected production workflow and retain its SHA-bound acceptance record, SBOMs, attestations and deployment record.

### P1 — before public native-app launch

1. Replace `SET_WITH_EAS_INIT` using Haccora’s real EAS project; do not invent this identifier.
2. Configure Apple and Google signing, APNs/FCM, store privacy disclosures, screenshots, support links and review credentials.
3. Complete physical-device testing across iPhone, Android and tablets for offline queues, QR camera, GPS consent, evidence uploads, secure documents, alerts and account freeze.
4. Complete TestFlight and Play internal acceptance, then store review.
5. Print durable equipment labels and complete a real-premises scan/read/correct/history/export pilot.

## Readiness movement

| Measure               | Phase 36 |   Phase 37 | Reason                                                                                                |
| --------------------- | -------: | ---------: | ----------------------------------------------------------------------------------------------------- |
| Implemented source    |   94/100 | **95/100** | Release drift is now build-blocking and deployed public readiness is machine-verifiable.              |
| Current live evidence |   39/100 | **39/100** | The live deployment is still the older Phase 35 SHA and remains legally/configurationally incomplete. |
| Core source tests     |      182 |    **185** | Three Phase 37 acceptance tests added.                                                                |
| Worker smoke routes   |        7 |      **8** | `/readiness.json` added.                                                                              |

The remaining five source points cannot responsibly be filled with guessed company data, provider credentials, signing IDs or approvals. They convert to launch readiness only after the protected workflows prove the real environment and accountable reviewers accept the exact release.

## Validation completed

- `npm run quality`: passed.
- 185/185 source tests: passed.
- TypeScript, ESLint, Prettier, migration lineage, secret scan and pinned Action checks: passed.
- 64 migrations, 266 RLS policy declarations and 119 database-function definitions verified.
- Production build, source-integrity checks, bundle budget and eight-route worker smoke: passed.
- Native TypeScript: passed.
- Offline Expo web, iOS and Android exports: passed.

Hosted RLS, authenticated user journeys, external providers, signed binaries, physical devices and accountable approvals remain deployment evidence—not local source checks.
