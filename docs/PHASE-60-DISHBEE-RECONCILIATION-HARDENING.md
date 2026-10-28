# Haccora Phase 60 — Source-order reconciliation hardening

This is **not deployed**. It builds on Haccora PR #62 and accompanies Dishbee's outbound final-order publisher in Dishbee PR #72.

## Fixes

- Enforces a stable source identity on the Haccora `dishbee.order.handed_over` endpoint: `subjectType=order`, `subjectId=payload.orderId`, and `eventKey=haccora-order-handover:<orderId>`. Mismatches fail with HTTP 422 instead of recording inconsistent order evidence.
- Changes reconciliation retrieval from three unrelated latest-row queries to a parent-first query of the most recent 100 **source orders**; loads at most 500 associated source lines and reads batch links only for those line IDs.
- Splits link queries into groups of 60 source-line IDs to limit API URL size and prevent unrelated tenant/site data from crowding the result set.
- Requests exact counts and warns if a fetched order, line or link result is truncated. A zero or unmatched count is never a verified no-exposure conclusion.
- Adds regression contract tests for identity and correct child-query scoping.

## Safety boundaries

This does not certify a complete traceability chain. Batch links are still explicit manager attestations and never automatically inferred from recipe names. An incomplete query window triggers a visible warning. An empty source-order list is not proof there were no sales, and orders from other POS systems or providers may be absent.

## Required verification before merge

1. Merge parent PRs #55, #59, #60, #61 and #62 in order after reviews.
2. Verify latest-sha web, browser, native and fresh database/RLS checks.
3. Run a real, permitted Dishbee order-event delivery through the corresponding authorised tenant token and mapped premises.
4. Test duplicate and conflicting event keys; verify the same source lot cannot be linked across unrelated organisations or kitchens.
5. Import more than 100 orders and more than 500 lines; verify the partial-window warning and absence of false safe/green zero-exposure messaging.
6. Verify physical ingredient batch segregation, review sign-off, privacy, security and any legally required recall/withdrawal communication procedures.
