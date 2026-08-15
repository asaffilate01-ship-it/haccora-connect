# Phase 46 — enquiry operations and release recovery

Date: 15 August 2026
Baseline: `main` at `e7c2992c7fcfec90edce27473b95911df01f393b`

## Outcome

The public marketing journey now captures the information Haccora needs to respond to a prospect, and SaaS operators have a private lead inbox instead of relying on direct database access. The phase also restores the red web CI gate introduced by the latest Lovable update.

## Changes

- Added enquiry type, premises count and a bounded 10–2,000 character message to the public contact journey.
- Extended the protected contact Edge Function and database model without exposing client-side insert permissions.
- Added a private, responsive website-enquiry queue to the SaaS control plane.
- Added owner-only, AAL2-protected lead status changes with immutable platform audit events.
- Kept personal details out of audit metadata; only the request ID and new status are recorded.
- Replaced the absolute “Natasha's Law compliant” marketing statement with review-led PPDS wording.
- Reworded EHO copy so Haccora supports review rather than claiming an officer has verified the records.
- Restored the two formatter-blocked files and the current TanStack `validator()` API.
- Added regression coverage for the public form, Edge validation, database bounds, private queue, governed mutations and marketing claims.

## Observed live boundary

At the start of this phase the Lovable deployment had caught up to `e7c2992c7fcfec90edce27473b95911df01f393b` and `/health.json` was healthy. `/readiness.json` still reported `action_required`: the marketing origin, statutory/legal approvals, support service, status page and browser push key were not configured. Those are genuine external launch controls and are not bypassed by this source phase.
