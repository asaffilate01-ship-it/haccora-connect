# Phase 57 — Controlled supplier changes and mobile dependency security

Date: 15 October 2026  
Branch: `feature/haccora-supplier-controls-mobile-security-oct2026`

This phase is **code-complete only where specifically described**, not a production launch approval. It is stacked on Phase 56 (PR #59) and the Phase 55 UK operations hardening PR.

## Implemented

1. **Mobile supply-chain fixes.** Updated the Expo/mobile dependency overrides and npm-generated lockfile to `compression@1.8.2`, `shell-quote@1.11.0`, and `source-map-js@1.2.2`, addressing three high/critical advisory blockers. Follow-on CI, export, native QA and production audits must still pass.
2. **Supplier specification change proposals.** Added `ingredient_change_requests` with tenant-bound foreign keys, RLS, a single pending revision per ingredient, mandatory original/new specification versions, allergen and may-contain declarations, evidence reference, and human reason.
3. **Manager review.** Created a restricted `review_ingredient_change` function that locks the pending request and ingredient, confirms the reviewer's organisation permission, prevents approval of a stale or unchanged supplier version, updates the ingredient atomically after approval, and records previous/new snapshots and a decision note.
4. **Kitchen experience.** Added a proposal and review panel to the existing PPDS workspace, including a list of known affected recipes. This intentionally does **not** automatically send new allergen declarations to Dishbee, suspend stock, release products, or approve printed labels.
5. **Regression checks.** Added source-contract tests and mobile package-version assertions.

## Remaining limitations and responsible use

- Existing direct ingredient-edit APIs elsewhere in the platform have not yet been migrated to proposal-only workflows. Review permissions and other write paths before claiming exclusive change control.
- Versioned supplier reference text is not independent verification. Require a real supplier specification or product documentation, ideally associated with a private evidence document.
- The recipe impact list only covers currently linked records. It does not yet prove batch-to-order traceability or downstream delivery-platform propagation.
- Approval means a new ingredient specification was recorded. Any impacted printed PPDS label, menu, recipe, cross-contact procedure, or quarantined stock requires separate competent staff review.
- The manager may be both proposer and reviewer for small businesses; organisations needing dual control require a policy/feature setting and enforcement.
- Changing source records can invalidate earlier labels, but the software must not claim every printed label has been withdrawn until that has been evidenced.
- Haccora is not FSA/FSS-approved and does not guarantee compliance or food hygiene ratings.

## Pre-merge and pre-deploy requirements

- Parent PRs #55 and #59 must be reviewed, validated and merged in order, before the stacked Phase 57 PR can merge.
- Run the complete latest-sha CI suite (web, native/mobile, Edge Functions, CodeQL, fresh migrations/RLS and dependency audits). Validate the patch does not create unsupported Expo/React Native version combinations.
- Apply `20261015232000_ingredient_change_approval.sql` to isolated staging and verify before using its UI in a hosted tenant.
- Test as owner, manager, chef/staff and a second unrelated tenant. Ensure staff cannot approve/reject or alter another organisation's proposals; verify concurrent requests and stale versions fail closed.
- Test a real supplier change from proposal to approval, old and new snapshots, PPDS label freshness, allergen changes, offline state and actual physical label print/verification.
- Have a qualified UK food-safety specialist approve the workflows, policy limits, and official-guidance references before production.
- Complete outstanding production secrets/provider, GDPR/security, tenant isolation, rollback, backup/restore, penetration and signed mobile build acceptance before public launch.

## Next gaps

- Server-verified PPDS label freshness and physical printer integrations.
- Direct ingredient update guard across all write paths and Dishbee sync impact/reconciliation.
- Batch-to-sale recall impact graph and documented recall actions.
- Shift-swaps, annual leave and workforce communications with UK labour/privacy controls.
- Shared-kitchen cross-brand equipment responsibilities and franchise compliance controls.
- Evidence-grounded Omniqora risk detection and human approval of any safety-critical action.
