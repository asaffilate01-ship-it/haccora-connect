# Haccora Phase 56 — Guided Safe Methods and PPDS assurance

Implemented as stacked PR #59, based on the PR #55 feature branch. **Not production deployed.**

## Delivered

- Site-specific Safe Methods screen retrieves the current UK premises profile and displays six existing versioned control templates.
- Owner/manager must document an answer to each template prompt (at least 12 characters) and explicitly confirm they reviewed procedures against actual operations.
- Saved `site_safe_methods.controls` includes answers, template version, jurisdiction, business type, author and review timestamp; a six-month *internal review reminder* is recorded.
- Previously adopted methods are marked for further management review when version, jurisdiction, prompt coverage or review date is inconsistent.
- Append-only `site_safe_method_review_events` history is recorded by a database trigger after every insertion or update, with actor and before/after snapshots. Users cannot directly insert, update or delete historical events.
- PPDS labels are compared against the complete ingredient IDs, supplier specification versions and dates, ingredient statement, allergens and may-contain information; missing linked ingredients fail closed.
- PPDS ingredient/label reads are limited to the current organisation and, for recipes/labels, the active premises.
- First-week onboarding fixes a non-existent `site_compliance_profiles.id` lookup and restricts site readiness to the active premises; incomplete method attestation no longer counts as completion.
- Runnable TypeScript helper regression tests exercise PPDS freshness and the database evidence contract.

## Security and operational boundaries

- Business owner/manager attestation **is not food-safety specialist sign-off**.
- No automatic AI authorisation of safe methods, revised recipes or printed PPDS labels.
- Recreated or changed labels still require human verification against an actual ingredient list, formulation and physical packaging, including allergen emphasis and suitability of a precautionary statement.
- Existing `site_safe_methods` RLS remains authoritative for who can adopt a method. New review history is read-only for organisation managers, protected by RLS and update/delete trigger.
- Recorded review history can be removed through authorised organisation/premises deletion under retention/privacy policies; “append only” means ordinary record-level editing cannot erase events.
- Never claim official FSA/FSS approval, a guaranteed hygiene rating, or a complete legal compliance audit solely from this software.

## Rollout gates

1. Merge parent PR #55 after green latest-commit quality, security and fresh-database checks and validated Dishbee GBP migration.
2. Review PR #59 independently and ensure its source tests, migrations and CodeQL checks are green against its latest commit.
3. Apply `20261015223000_safe_method_review_evidence.sql` to a fresh isolated staging project **before** using the guided review UI on hosted tenants.
4. As owner and manager, adopt a method, edit it, and verify its event history captures an immutable previous/current snapshot and actor; verify staff cannot mutate adoption or access review history.
5. As two unrelated tenants and two locations, prove no cross-tenant or cross-site leakage via PostgREST, inspectors, data export or cached offline content.
6. Prove stale PPDS status on adding/removing an ingredient, altered allergen, may-contain warning, version, review date and ingredient text; test failed queries and disallowed roles.
7. Obtain UK qualified food-safety review of the templates/thresholds and actual printed labels; obtain GDPR/privacy/security and relevant product approvals.
8. Run physical iOS/Android, offline reconciliation, browser accessibility and live provider tests before any production activation.

## Next unresolved gaps

The system still needs a full specialist-published multi-jurisdiction HACCP wizard, formal batch-to-order recall traceability, physical PPDS print integration, supervisor review inbox, team shift swaps, labour approvals, shared-equipment responsibilities across MealDeck brands, and production Omniqora risk evaluations. Those are not implemented in this PR.
