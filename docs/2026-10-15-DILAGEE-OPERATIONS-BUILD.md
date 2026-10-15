# Haccora — Dilagee-informed operations upgrade (15 October 2026)

## Implemented on this feature branch (not yet released)

- **Daily**: stable day boundary prevents repeated fetches; failed compliance queries never display a false all-clear; out-of-range and alert temperatures are counted; temperature deviations take priority over routine checks; manual refresh is available.
- **Workforce**: existing rota/clock-in module now navigates weeks, uses local-calendar dates through UK DST, and reports clocking/shift-deletion errors rather than silently succeeding.
- **Staff quick access**: permission-filtered launch links to PPDS, recalls and shifts; existing temperature, cleaning, daily checks, goods-in, incidents and QR history are preserved.
- **PPDS**: label-version creation now requires each selected ingredient to have a reviewed statement and specification version; version display refreshes on successful generation. Human validation and label verification remain mandatory.
- **Dishbee ingestion**: requires mapped location, recognises supported event types only, validates temperature readings and limits, quantity and event timestamps, and no longer exposes raw internal database errors.
- **Currency**: additive GBP columns on recipes and waste entries; incoming Dishbee GBP amounts write only to GBP columns, preserving EUR data fields for non-GBP values. UK recipe/waste screens use their source currency. Existing legacy data is not rewritten.
- **Regression contracts**: tests/dilagee-operations-upgrade.test.mjs validates critical source contracts.

## Existing Haccora modules (not newly created on this branch)

Already in `haccora-connect`: HACCP and approved safe methods, cleaning, checks, equipment QR, temperature and sensors, incidents, corrective actions, training, rota/clock-in, waste, inventory, recalls, ingredient/PPDS labels, multi-location tenancy, inspection exports, access-controlled mobile/offline capture, versioned UK regulatory content, and an Omniqora AI assistant.

**Repository code presence is not proof of hosted production acceptance.** Do not represent these modules as approved by a local authority, the FSA or FSS.

## Subsequent implementation tracks (not delivered by this branch)

1. **Daily v2**: location-aware summary aggregation, due schedules, non-completion escalation, accessible glove mode on additional screens, offline queue status across all workflows, linked equipment/sensor telemetry.
2. **HACCP/SFBB wizard**: business-type-specific approved templates, hazard-to-control mapping, manager-approved changes, risk-based task generation, source provenance and dated qualified reviewer sign-off for England, Scotland, Wales and Northern Ireland.
3. **Allergen provenance**: supplier specification attachment, ingredient substitutions held for review, PPDS printer templates validated at real dimensions, recipe-to-menu-to-order version lineage, recall fan-out with a human-approved Dishbee order suspension mechanism.
4. **Hospitality operations**: shift swaps, leave requests, payroll exports, planned/actual hours and cost, labour-law review, staff notices, reusable shared-equipment checks for multi-brand kitchens and business-responsibility ledger.
5. **Omniqora Intelligence**: cost-capped model routing via approved MCP providers, tenancy-scoped retrieval, human-verified action proposals, drift detection, machine-readable citations, evaluation suite and fallback to rule-based dashboards.
6. **Enterprise/multi-site**: franchise templates, audit scorecards, policy distributions, cross-premises exception escalation, existing integration reconciliation and subscription entitlements.

## Rollout sequence / acceptance criteria

1. Confirm this branch passes root `npm run quality`, `npm run migrations:check`, relevant web E2E and native tests. Protect merge with CI; investigate any existing test regressions.
2. Apply `20261015211500_dishbee_gbp_compliance_evidence.sql` to a fresh isolated staging database; run staging tenant RLS, permissions and migration-ledger checks. Do **not** deploy the receiver before its schema is present.
3. Verify UK Dishbee event payloads for checklist, waste, supplier receipt, recipe allergen update, temperature, incidents and corrective actions against the new schemas. Ensure mapped premises and retry/dead-letter behaviour, including rejected inputs, duplicate events and concurrent deliveries.
4. Run real-device PPDS/allergen, rota navigation across BST transition and Today exception/error tests, including mobile offline/reconnect.
5. Complete external legal, food-safety-qualified validation, GDPR, penetration test, backups/restore, provider credentials, physical native QA and launch approvals listed in `docs/GO_LIVE_CHECKLIST.md`.

## Operator scope

The UK codebase is `haccora-connect`. Keep the German product `haccora` on its separate reviewed release path; do not copy UK food safety thresholds, PPDS rules or local-law marketing claims into Germany.

## Compatibility note

The current UK database has legacy fields named `price_eur`/`cost_eur`; older UK rows may have held GBP values there. This branch intentionally does not assume a historical currency or automatically migrate old records. A separately approved one-time reconciliation must identify their actual original currency before converting or relabelling them.
