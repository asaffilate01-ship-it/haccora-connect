# Migration reconciliation — mandatory before deployment

The repository previously contained generated migrations that repeated canonical production, security, operations and commercial declarations. They have been removed from this release because a fresh database would otherwise encounter duplicate tables, constraints, triggers or policies.

## Files removed from the GitHub repository

- `20260802083308_aa031c95-39d7-44b9-9677-f99519895f14.sql`
- `20260802083626_4bf8a58a-1dc9-4b17-a287-68fdfb6129d8.sql`
- `20260802083657_22e0ce1a-4b75-4fbf-9665-aa60827aa6a2.sql`
- `20260802083707_fe91f7e5-12b7-406e-a813-469b58848b74.sql`
- `20260802093624_2011b293-2d93-46fb-a6c7-8c53165e7752.sql`
- `20260802093838_c79dcb7d-1b86-4b56-bed6-e3fd2828416c.sql`
- `20260802110000_v2_commercial_native_integrations.sql`
- `20260802151821_e39eee69-d055-435f-886e-10b3ab3be4aa.sql`

All eight are under `supabase/migrations/`. The two commercial files repeated schema or function definitions already present in the canonical commercial sequence and must not be replayed.

## Canonical production sequence

1. `20260801090000_production_tenancy_security.sql`
2. `20260802090000_v2_security_privacy_launch.sql`
3. `20260802100000_v2_operations_control.sql`
4. `20260802103319_63102a85-216e-4527-ab82-2f9dc19862bb.sql`
5. `20260802120000_v2_commercial_reconciliation.sql`

Earlier dated migrations remain in place and run before this sequence. The reconciliation migration changes only `get_my_entitlements()` so it respects `effective_from`; it does not recreate commercial tables, policies or triggers.

Published platform-generated timestamps that replayed an earlier named phase remain in the ledger as minimal deltas. In particular, `20260807163905_f24a7a5a-889a-4eb2-8fd9-84abb1e67f53.sql` retains only the service-role grant added after the canonical Phase 22 migration `20260807110000_asset_check_schedules_and_rls.sql`; it must not recreate the Phase 22 functions or policies.

The Phase 26 heartbeat schema was published twice: first by Lovable as `20260809112615_bdaf520a-1b59-46e8-9302-8fce9cac64e9.sql`, then by the canonical package as `20260809120000_production_job_heartbeats.sql`. Both files are idempotent and may already exist in linked ledgers. Preserve both timestamps. The lineage checker permits only their exact `record_service_job_heartbeat` replay and continues to reject every other unapproved duplicate.

The Phase 34 platform MFA guard was also applied twice: first by Lovable as `20260809212658_86b75e75-ddd4-4ecc-8273-a1a80d42645d.sql`, then by the named package as `20260809230000_platform_step_up_security.sql`. Both files use idempotent function and trigger replacement and may already exist in linked ledgers. Preserve both timestamps. The lineage checker permits only this exact `require_platform_operator_aal2` replay.

## Clean replay compatibility

Historic Lovable setup migrations reference the platform-owned `sandbox_exec` role before revoking its temporary grants. Haccora preserves those published migrations unchanged. `supabase/roles.sql` creates an equivalent local compatibility role as `NOLOGIN`, `NOINHERIT`, `NOBYPASSRLS` and non-administrative before a clean replay; pgTAP then proves that the completed ledger leaves it without access to `auth.users` or the `auth` schema.

## Safe reconciliation procedure

1. Back up the linked Supabase database and storage before changing migration history.
2. Record the remote ledger with `supabase migration list`; retain the output with the release evidence.
3. Apply this repository to a new, empty staging project. `npm run migrations:check` must pass the complete current ledger before the database is reset.
4. Run `supabase db start` and `supabase test db`, then regenerate Supabase TypeScript types from that fresh schema.
5. Compare the fresh schema with the linked project. Confirm that canonical objects, grants, functions, policies and constraints are equivalent.
6. If the remote ledger contains one of the removed generated versions, including `20260802110000`, do not drop live database objects. Reconcile ledger entries only after reviewing the recorded remote list, the fresh-schema comparison and a rollback plan with the database owner.
7. Apply only migrations that the reconciled remote ledger has not already executed.

Never solve a migration-ledger mismatch by force-pushing history, deleting production tables, or blindly marking every migration as applied. The repository is connected to Lovable, so use a normal branch and pull request and preserve published history.
