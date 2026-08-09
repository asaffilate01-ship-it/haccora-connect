# Phase 31 — current-main integration

Updated: 9 August 2026

## Why this integration was required

GitHub `main` advanced to release `b75b763ad0c99f1e0bababa28e80843f70c3e70a` after the original Phase 30 candidate was built. That redeployment correctly exposes the complete release identity through the `X-Haccora-Release` header and `/health.json`, but it contains only the Phase 29 application plus generated router and release-SHA changes.

The live site still exposes five internal-facing FAQs and raises `TypeError: re is not a function` from the forced TanStack vendor chunk. Phase 31 applies the complete FAQ, responsive typography, native lockfile, role/RLS documentation and cycle-safe build changes on top of the new current main.

## Current-main changes preserved

- `PUBLIC_RELEASE_SHA` remains the first supported build release identifier for Lovable deployments.
- The generated TanStack Start router registration remains present.
- The worker smoke test now recognises and verifies a valid `PUBLIC_RELEASE_SHA`, keeping local, GitHub Actions and Lovable release-identity checks consistent.

## Deployment requirement

The source correction does not alter the existing Lovable deployment until this commit is merged and redeployed. After deployment, the committed browser test must prove that all twelve FAQs render, Sign in reaches `/login`, no TanStack runtime error is logged and phone, tablet and desktop layouts have no horizontal overflow.
