# Haccora V2 — File 2: operations control

This cumulative package contains File 1 plus the persistent operations control plane.

## Included

- Versioned workflow templates, required steps, approvals, scheduled runs and idempotent execution.
- A tenant-scoped unified inbox for excursions, overdue work and offline sensors.
- Corrective-action ownership, timelines, escalation, evidence, manager verification and closure.
- Automated corrective actions for manual temperature excursions and IoT sensor readings.
- Sensor health snapshots and a cron-protected operations dispatcher.
- Lot-to-lot traceability edges and timed recall drills.
- Versioned regulatory content with HTTPS sources, hashes and specialist review evidence.
- Versioned training courses and persistent assignments.
- A bilingual Control Centre and Workflow Studio with live refresh and role-based access.

## Deployment order

1. Apply `20260802090000_v2_security_privacy_launch.sql`.
2. Apply `20260802100000_v2_operations_control.sql`.
3. Deploy all Edge Functions, including `operations-dispatch`.
4. Schedule `operations-dispatch` every five minutes and send the same `CRON_SECRET` configured in Supabase secrets.
5. Deploy the web application only after staging RLS and workflow transition tests pass for every role.

## Mandatory staging tests

- Confirm one organization cannot read or mutate another organization's templates, runs, inbox or actions.
- Confirm staff can claim assigned work but cannot publish templates or verify actions.
- Confirm a workflow cannot complete while a required step is missing.
- Confirm a corrective action cannot verify without evidence and only a manager/owner can verify it.
- Insert in-range and out-of-range manual and sensor temperatures; check action/inbox creation and deduplication.
- Simulate a silent sensor and verify snapshot, inbox severity and re-run idempotence.
- Traverse a representative lot through suppliers, goods-in, stock, recipes and recall evidence.

## External go-live gates

The code cannot itself certify live readiness. Production still requires real Supabase secrets, scheduled job monitoring, alert-provider configuration, recovery testing, a qualified food-safety review of workflows and limits, and documented operational ownership. Regulatory content must remain in draft until a qualified specialist has reviewed its jurisdiction, source and effective date.
