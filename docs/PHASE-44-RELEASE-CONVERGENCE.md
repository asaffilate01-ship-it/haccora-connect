# Phase 44 — release convergence and origin safety

Date: 15 August 2026  
Baseline: current `main` at `0996b5b270738a7730481377ddee51ba9cdccfe8`

## Outcome

This phase restores a deterministic clean install after the Lovable build package was changed without updating its resolved npm lock entry. It also makes the marketing and authenticated application origins separate, mandatory production controls and proves both are present in CORS.

## Changes

- Regenerated `package-lock.json` with the npm 10 major used by GitHub so the declared and resolved `@lovable.dev/vite-tanstack-config` versions are both `2.13.1` and Nitro's optional peer layout remains reproducible.
- Added a regression test that inspects the actual resolved lock entry, closing the gap left by the earlier root-only assertion.
- Added `PUBLIC_MARKETING_URL` to the fail-closed production configuration registry and protected release workflow.
- Requires `ALLOWED_ORIGINS` to contain both the marketing and authenticated application origins.
- Added `marketingOrigin` and `applicationOrigin` to `/readiness.json`; the deployment check therefore blocks a release with missing, non-HTTPS or path-bearing origins.
- Updated the environment example and configuration handbook to the current 44-control gate.
- Repaired two formatting regressions that blocked the main-branch lint gate and migrated the FSA prospect server action from TanStack's deprecated `inputValidator()` API to `validator()`.
- Extended the lockfile test to cover npm lockfile-version, root-package and declared dependency integrity while retaining Nitro's npm-10 optional-peer assertion.

## Still outside source control

Code cannot supply or approve the real Supabase project, Companies House details, legal/ICO evidence, Stripe live account, email/push/scanner credentials, support/status services, EAS signing identities, hosted role tests, penetration/accessibility results, backup restore evidence or named release acceptance. Those remain fail-closed production gates.
