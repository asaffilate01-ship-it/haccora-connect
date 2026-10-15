# Phase 59 — Dishbee order reconciliation

Implementation: Haccora UK, stacked on Phase 58 (PR #61). This code is not
production-connected or deployed.

## Implemented

- Existing Dishbee HTTP receiver accepts only the new `dishbee.order.handed_over` event type for order tracing.
- The receiver authenticates the existing hashed bearer secret and confirms the mapped tenant and premises.
- A strict schema accepts order reference, occurrence time and up to 100 order lines, without customer names, addresses, phones, payment details or other unsolicited fields.
- Service-role-only database ingestion atomically records immutable orders and lines, checks the event hash, and rejects conflicting event-key or order-reference replays.
- The Traceability page lists authenticated source order references, unresolved lines and reviewed lot links.
- Managers can attach a lot to an imported order line using real production evidence. Database checks enforce the same premises and ensure the lot existed at the order time.
- Read-only audit data and explicit uncertainty indicators support investigations. A linked line is not certified as complete.

## Incoming contract

The supported event type is `dishbee.order.handed_over`. Use the existing
`POST /api/integrations/dishbee` endpoint with its bearer token. The envelope
requires `eventKey`, `eventType`, `dishbeeTenantId`, `dishbeeLocationId`,
`subjectType`, `subjectId`, `occurredAt` and `payload`.

The payload requires `orderId` and a nonempty `items` array. Each item
requires `lineId`, `name` and a positive integer `quantity`. An optional
`menuItemId` is accepted. Duplicate line IDs and unexpected properties are
rejected. Event timestamps must fall within the configured recent window.

A received order does not prove which supplier lots were consumed. Lot linkage
requires a separate manager review and cannot be inferred from recipe names or
stock records alone.

## Limits and responsibilities

- The receiving adapter is implemented, but an outbound Dishbee producer has not been verified or connected in this pull request.
- A selected `dishbee` order is a source event from the configured integration, not independent fulfilment or payment verification.
- A manager-reviewed batch link does not prove that every ingredient or preparation lot was used or accounted for.
- The dashboard loads at most 100 recent orders, 500 lines and 1,000 links per premises. Its counts describe that limited window only.
- No missing lot link or affected order result may be interpreted as zero recall exposure.
- No customer notifications, delivery-platform menu suspension, stock write-down, recall closure or regulatory submissions run automatically.
- All linked tenant and premises permissions, privacy controls and operational policies must be independently checked before rollout.

## Acceptance requirements

- Merge parent pull requests in order: #55, #59, #60, #61, then review this stacked PR.
- Apply `20261016020000_dishbee_order_reconciliation.sql` in a fresh isolated staging database, not directly in production.
- Validate fresh database migrations, role/RLS isolation, CodeQL, web/mobile builds and browser end-to-end tests against the final commit.
- Reconcile duplicate webhook delivery, changed payload, concurrent events, cross-tenant tokens, cross-site mapping, unknown item IDs and stale timestamps.
- Confirm that the exact event contract is emitted by a Dishbee producer using real end-to-end test credentials and an authorised tenant.
- Verify captured order lines, manager evidence notes, blocked cross-location lot associations and real recalled-batch investigations.
- Obtain appropriate specialist UK food-safety, security, privacy and release approvals.

## Remaining development

The outbound Dishbee event publisher, multi-kitchen production usage, complete
batch consumption, all-sales coverage reconciliation and authorised recall
notifications remain separate unimplemented workstreams. Never mark them live
based only on this incoming adapter.
