# UK diary database protection candidate

The candidate in `supabase/tests/database/diary_guard_candidate.test.sql` is
test-only. It installs the replacement trigger and privileges in a transaction
and rolls them back at the end. It must not be copied into a live SQL console.

## Protection proposed

- Preserve existing RLS and run the write trigger with caller privileges.
- Require the authenticated actor's active organisation and selected premises.
- Record creation identity and update timestamps at the database boundary.
- Prevent changes to diary identity, including the original creator.
- Require meaningful corrective-action text when a problem is recorded.
- Require a manager or owner, both completed-check booleans and the actual
  authenticated signatory before a complete sign-off.
- Block subsequent direct API edits to signed or partially signed entries.
- Revoke direct client deletion of diary records.

## Promotion gates

First pass the fresh-database pgTAP suite. Merge and deploy the compatible web
and native diary clients before applying the database change. Older clients
that use unconditional upserts and overwrite the creator will require updating.

Inspect the target database's current trigger, grants, RLS and historic
signatures. Run authenticated role and premises acceptance, including two
concurrent writers, a stale draft save and a stale sign-off. Review custom-role
permissions, existing partially signed records, integration writers and
historical import requirements.

Create the production migration through the established Supabase migration
workflow only after these checks. Confirm backup, retention and authorised
correction procedures. Direct deletion is not a substitute for a reviewed
retention process; privileged maintenance remains a separate concern. The
candidate is not a tamper-proof external audit ledger.

Do not claim live enforcement until the migration and authenticated production
acceptance are verified.
