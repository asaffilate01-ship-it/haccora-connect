# Production release and rollback runbook

This runbook controls a release; it does not replace provider-specific backup, legal or store approvals.

## Before the release window

1. Name the release owner, database owner, rollback owner and on-call contact in `RELEASE_EVIDENCE.md`.
2. Reconcile the linked Supabase ledger using `MIGRATION_RECONCILIATION.md`. Back up database and storage, record the backup identifier, and test the release against a fresh staging project.
3. Require green Production checks, CodeQL, Fresh database/RLS and Production release evidence workflows on the exact release commit.
4. Run `npm run launch:preflight` with production values supplied by the deployment environment. Never create or commit a production `.env`.
5. Verify provider dashboards, dispatch schedules, alert routing, status page ownership and the rollback decision maker.

## Release

1. Freeze unrelated schema and provider configuration changes.
2. Deploy the exact build artifact produced by the release-evidence workflow.
3. Apply only migrations absent from the reconciled remote ledger. Stop on any unexpected schema diff or destructive statement.
4. Check `/health.json`, public legal routes, sign-in, one tenant-scoped read and one reversible tenant-scoped write.
5. Record timestamps, artifact identity, migration output and smoke-test evidence.

## Rollback

1. Stop the rollout and announce degraded service internally.
2. Roll application code back to the last known-good immutable artifact. Do not reverse a database migration blindly.
3. If a migration is implicated, disable the affected write path and follow the reviewed migration-specific recovery plan. Restore only after the database owner validates scope and backup integrity.
4. Re-run health and tenant-isolation smoke tests, then monitor through the recorded post-release window.
5. Preserve logs and decisions for the incident review.
