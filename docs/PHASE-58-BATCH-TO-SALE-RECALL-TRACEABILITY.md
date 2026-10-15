# Haccora Phase 58 — Batch-to-sale recall traceability

**Status:** Proposed feature-branch implementation; not deployed to production.

## What this phase implements

- Adds `traceability_batches`: tenant/site-scoped accepted goods-in batch + ingredient + supplier identity.
- Adds `traceability_sale_allocations`: append-only manually attributed lot-to-order references, food item, portions, timestamp and staff evidence. Duplicate order/lot/item allocations are refused.
- Adds `traceability_batch_events`: read-only decision timeline, recording the authorised manager's reason, batch, optional recall case and transition time.
- Adds `set_traceability_batch_hold` RPC for manager quarantine/release, with row locks, premises checks, tenant checks and prevention of release during an associated active recall.
- Adds a manager UI at `/app/traceability`, accessible from Recalls and navigation, for linking accepted receipts to lots, recording manual allocation evidence, reviewing affected references and quarantining/releasing a lot.
- Adds source contract regression tests; the fresh staging database, RLS and full CI workflows are required to verify integration.

## Coverage and safety boundaries

This is **NOT** a full automatic Dishbee order import or verified lot-to-every-customer map. Choosing `dishbee` as an order reference source is still a manual human attribution. The screen is intentionally labelled as such.

The recall-impact list includes only the first 500 recent manually evidenced lot allocations loaded for a premises. Unrecorded purchases, multiple supplier batches used together, unrecorded preparation, cross-site movement, Dishbee orders, marketplace/aggregator sales and partner-held records may be absent. A zero result is **not** proof that no person received affected food.

Haccora never automatically sends customer notices, suspends a delivery-platform menu, closes a food-safety incident or certifies a lot safe. Physical stock segregation, evidence from vendors, decision-making, external customer communications and UK regulatory requirements remain with the business and qualified personnel.

The database enforces that:

1. New lots are tied to the chosen authenticated actor, an accepted premises-matched goods-in record and a matching lot number.
2. A lot and an order attribution cannot be associated across different organisations or premises.
3. A manually attributed order must not be assigned to a currently quarantined lot or predate receipt.
4. Direct client UPDATE/DELETE access is not granted on the sale allocation or batch event ledger.
5. Only the manager-held, audited server function can change a recorded lot's quarantine state.
6. An active linked recall blocks releasing the quarantined lot.

## Required staging and release checks

- Merge the dependency chain in order after review: PR #55, #59, #60, then this Phase 58 PR.
- Run source lint, formatting, build, native tests, migration lineage, fresh database/RLS, CodeQL, tenant-isolation, accessibility and Playwright browser E2E.
- Apply `20261016010000_batch_sale_recall_traceability.sql` to a **separate, isolated staging Supabase project** before hosting the new UI.
- Prove batches cannot be linked to rejected deliveries, unmapped sites, unrelated tenants, mismatched lot references or forged actor IDs.
- Prove cannot append allocations to quarantined batches, duplicate an already recorded allocation or release a batch against an active linked recall.
- Simulate a real recalled supplier lot and reconcile delivered purchase records, physical stock, recipe production logs, sales and relevant external provider orders independently.
- Obtain qualified UK food-safety, privacy and security reviews; verify physical device offline behaviour and produce an inspection evidence pack before claiming readiness.

## Remaining follow-on integrations

1. Signed and validated Dishbee batch usage and order event ingestion with deduplication and replay protection.
2. Shared-kitchen brand and batch allocation across multiple recipes and tenants with explicit legal responsibilities.
3. Order-completeness reconciliation, including a separate unknown/unmapped sales queue and minimum coverage report.
4. Signed supplier specifications, immutable corrections/reversal events and batch quantity reconciliation.
5. Controlled notification drafts, authorised external alerts and evidence of actual recalls/withdrawals.
6. Physical PPDS label printing and approval evidence, and rules-based/Omniqora monitoring with human safety-critical decision review.
