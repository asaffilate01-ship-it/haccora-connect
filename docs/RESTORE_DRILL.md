# Backup restore drill

Run this drill in an isolated non-production project. Never overwrite production to prove that a backup works.

## Record before starting

- Drill owner, observer, date and approved test project
- Backup identifier, backup time and documented retention policy
- Target RPO and RTO approved by the business owner
- Expected tenant, row, storage-object and audit-event counts

## Procedure

1. Create a clean isolated target and restrict access to the drill team.
2. Restore the selected database backup and the matching storage backup using the provider-approved process.
3. Apply only migrations newer than the backup after reconciling the restored migration ledger.
4. Compare expected and restored counts, constraints, RLS policies, functions, storage objects and representative hashes.
5. Run `supabase test db` plus cross-tenant, inspector-expiry, signed-URL and export checks.
6. Measure recovery point and elapsed recovery time. Record gaps, screenshots/log locations and the final pass/fail decision.
7. Destroy the isolated copy under the approved retention process after evidence review.

A successful restore is launch evidence only when the database owner signs it and the measured RPO/RTO meet the approved targets.
