# Haccora Phase 61 — Audited recall decisions

**Status:** Implemented on a review branch; not deployed to production.

## What changed

- Recall status changes now pass through a manager-only database function with a row lock and an expected-status check, so stale screens cannot silently overwrite a newer decision.
- Each change requires a 12–2000 character reason and appends a tenant- and premises-bound decision event.
- Authenticated clients can read the decision history but cannot insert, edit or delete its events. Direct recall UPDATE and DELETE privileges are revoked; recall creation remains available under existing tenant policies.
- The recall screen scopes records to the active organisation and premises, shows decision history, and asks the manager to confirm a reason before changing a status.
- Closed recalls are final. A recall without a premises mapping requires the manager to select an active premises before its first transition can be recorded.

## Boundaries

This adds an auditable internal decision trail. It does not notify customers, suppliers, regulators or delivery platforms, and it does not automatically link the recall to every affected sale. Existing batch-to-sale evidence remains manually attributed and may be incomplete. A closed status records an internal decision; it is not a food-safety clearance or regulator sign-off.

## Verification needed before release

Run the repository quality and native gates, then require remote fresh-database migration/RLS, security and browser workflows before merging. Apply this migration only through the reviewed release process and verify on an isolated staging database first. Production deployment is a separate action.
