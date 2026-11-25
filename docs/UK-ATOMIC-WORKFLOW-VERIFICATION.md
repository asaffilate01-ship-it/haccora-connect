# UK atomic workflow verification candidate

The workflow studio is already guarded at the client level. This branch adds transactional SQL candidates inside `supabase/tests/database/workflow_atomic_candidate.test.sql`, which execute only within the isolated pgTAP test transaction and are rolled back. It also improves recovery when an already persisted manual schedule is retried.

## Release boundary

- The candidate uses SECURITY INVOKER and existing RLS, validates the active organisation and location, and explicitly restricts function execution to authenticated callers.
- The draft RPC inserts the template, version and required steps in one database transaction.
- The publication RPC checks an exact reviewed step snapshot and version, locks the template/version/steps, and updates approval and activation together.
- Tests cover invalid drafts, simulated late failures, stale snapshots, staff and unrelated tenant access, and duplicate publication retries.
- These RPCs are **not installed in production**. The existing browser publication path is not yet transactional. Do not switch it to the new RPCs before migration and runtime acceptance.

## Promotion checklist

1. Run the fresh database workflow and pgTAP suite on the candidate; inspect failures without bypassing gates.
2. With an isolated Haccora UK development database and the pinned CLI, create the migration using `supabase migration new atomic_workflow_commands`. Promote the marked SQL candidate and verify grants, RLS, advisor findings and schema history.
3. Exercise concurrent publications, concurrent step edits and stale version retries with two authenticated clients; audit all direct table write paths before describing the invariant as universal.
4. Wire the studio to the RPCs with the exact reviewed step snapshot and generated database types; do not fall back to a sequence of independent writes after a failed RPC.
5. Verify authorised owner/manager, denied staff and unrelated tenant, migration rollback, audit evidence and actual selected-premises persistence.
6. Deploy to production only after the correct project is linked and its release and database configuration checks pass.

No new migrations, database credentials, or live database changes are part of this PR.
