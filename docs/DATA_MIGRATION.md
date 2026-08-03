# Legacy data cut-over

The production migration chooses safety over guessed relationships: each legacy account receives an isolated organization and its actor-owned records are assigned to that workspace. Records with no actor remain inaccessible until an administrator explicitly assigns them.

Before applying to production:

1. Export and encrypt a full database and storage backup.
2. Build a reviewed mapping of legacy user IDs to organizations, locations and approved roles.
3. Apply the migration to a restored staging copy.
4. Merge memberships and reassign `organization_id`/`location_id` only from the reviewed mapping.
5. Resolve actorless rows and duplicate training records.
6. Copy legacy document objects from `<user-id>/...` to
   `<organization-id>/<user-id>/...`, update `documents.storage_path`, MIME, size and SHA-256 metadata,
   then verify signed URLs before retiring the old objects. Review every external `file_url` separately.
7. Run two-tenant and inspector isolation tests.
8. Compare pre/post database and storage counts and retain the signed reconciliation report.
9. Validate `ck_temperature_evidence_range` after historical outliers are corrected.
10. Regenerate Supabase TypeScript types from the migrated staging schema before merging the release.

Do not preserve a legacy privileged role merely because it came from `raw_user_meta_data`; that field was previously user-controlled.
