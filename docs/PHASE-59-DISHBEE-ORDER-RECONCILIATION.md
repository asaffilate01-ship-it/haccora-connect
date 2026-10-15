# Phase 59 — Dishbee source-order ingestion and batch reconciliation

**Implementation branch:** `feature/haccora-dishbee-order-reconciliation-oct2026`  
**Parent dependency:** PR #61 (itself stacked on #60, #59 and #55).  
**Environment:** Code committed for review; not production-connected or deployed.

## Newly implemented

Haccora's existing authenticated `POST /api/integrations/dishbee` route now accepts **one additional exact event family**, `dishbee.order.handed_over`. It uses the existing SHA-256 bearer-token connection lookup, tenant UUID verification, active Dishbee-to-Haccora premises mapping, request-size limit and read-only validation probe.

Each accepted event is passed to the **service-role-only** `ingest_dishbee_trace_order` database function. The function locks data transactionally, checks connection/site activity, validates a bounded recent timestamp and up to 100 line items, persists an order and its lines without personal information, and rejects an event-key or order-reference replay whose canonical payload hash does not match the original.

The new manager dashboard inside `/app/traceability` lists recent imported orders, which lines have no recorded batch link and manually reviewed lot links. It offers a tenant/site-scoped `link_dishbee_trace_batch` RPC. The manager must provide at least 12 characters of production evidence, and the referenced lot must have been received before the recorded order time. A quarantined lot may be linked retrospectively for investigation, not released.

## Example source event (contract; NOT proof that Dishbee emits it yet)

```json
{
  "eventKey": "fulfilled-order-14923-v1",
  "eventType": "dishbee.order.handed_over",
  "dishbeeTenantId": "c0000000-0000-4000-8000-000000000001",
  "dishbeeLocationId": "c0000000-0000-4000-8000-000000000002",
  "subjectType": "order",
  "subjectId": "order-14923",
  "occurredAt": "2026-10-15T20:10:00+01:00",
  "payload": {
    "orderId": "order-14923",
    "items": [
      {
        "lineId": "item-1",
        "menuItemId": "burger-42",
        "name": "Chicken burger",
        "quantity": 2
      }
    ]
  }
}
```

Required request header: `Authorization: Bearer <a unique secret with at least 32 characters>`. Never log, embed or store the plaintext token in the repository.

**Rejected and not persisted:** arbitrary payload keys, customer addresses, phones, names, emails, card details, unsolicited statuses, empty item lists, repeated item IDs, invalid premises UUIDs, unsupported order lifecycle event types, and stale or future event timestamps. Never bypass the tenant/premises mapping.

## Evidence provenance and limits

- Incoming order lines are **received from an authenticated Dishbee-tenant integration**, not independently verified by Haccora against provider settlement, inventory consumption or customer fulfilment.
- A lot association is **manually reviewed** and recorded as `manager_reviewed_not_complete`. The existence of one lot link does **not** prove that all ingredients, preparation batches, cross-brand kitchens or external partner transactions were accounted for.
- Screens currently load at most 100 recent orders, 500 lines and 1,000 reviewed lot links per site; all counts are explicitly limited to the loaded window. Do not derive total coverage percentages from this partial dataset.
- An event with no batch evidence remains **unreviewed**. A lack of matching orders for a recalled lot is **unknown exposure**, not proof of zero exposure.
- No automatic customer messaging, recall notification, payment integration, menu suspension, inventory deduction or authority report is performed.
- No PII is ingested: this phase stores order references and menu item names/quantities only.

## Deployment and certification blockers

1. All parent PRs (#55 → #59 → #60 → #61) must be reviewed and safely merged, with current-commit CI passing, before this feature is eligible for merge.
2. Execute fresh staging migrations for `20261016020000_dishbee_order_reconciliation.sql`, confirm RLS/role privileges and deterministic replay/idempotency with two unrelated tenant identities and two premises.
3. Implement and **verify a compatible outbound event producer in Dishbee**. The current connection validates *incoming* events only; there is no evidenced production order publisher in this PR. Do not declare a live integration until end-to-end provider testing.
4. Verify order changes, cancellations, returned items, multiple brands, shared production kitchens, order timestamps, replay attacks, tenant mismatch, multiple simultaneous item records and secure secret rotation.
5. Prove manager-only batch linkage, cross-location denial and no direct browser inserts, updates or deletes on the protected source order tables.
6. Verify iOS/Android and browser QA, failed/offline replays, GDPR data-retention policy, penetration assessment and a qualified UK food-safety specialist's review.
7. Separately validate actual printed PPDS labels, physical recall stock holds and real customer/authority notification workflows when needed.

## Further phases

A proper **Dishbee outbound order event publisher**, multi-brand per-item kitchen attribution, deterministic ingredient/stock usage and completeness reconciliation are still outstanding. They should be treated as independent workstreams, not as features that have been implicitly certified by this receiving endpoint.
