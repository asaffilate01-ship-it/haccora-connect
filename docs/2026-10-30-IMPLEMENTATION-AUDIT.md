# Haccora implementation and verification audit — 30 October 2026

## Scope and evidence boundary

Reviewed UK `haccora-connect` and Germany `haccora` default branches, routes, native queue, feature wiring documentation, deployment checks and current build/test gates. This is a source/build audit with a public UK release probe, not acceptance of every authenticated journey or a production database audit. Tests use isolated clients; they do not establish production RLS or provider availability.

## Built, working under checks, and unfinished

| Area                               | Built/wired                                                                     | Verification or limitation                                                                                         | Remaining work                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Web and native foundations         | TanStack web, Expo native, auth and workspace context                           | Local quality gates and native checks; see validation below                                                        | Real account journeys and signed device acceptance                                                           |
| HACCP/checks/temperatures/cleaning | Persistent table/RPC workflows; UK safe methods and daily operations            | Component and repository regression coverage; hosted persistence unverified                                        | Site acceptance, calibrated probe and scheduled-work reconciliation                                          |
| Offline evidence                   | Secure queue, account-scoped metadata, retry, damaged-storage protection        | New exact-replay tests exercise actual queue code                                                                  | Manual resolution of genuinely different records; support-led damaged-storage recovery                       |
| UK suppliers/traceability/Dishbee  | Supplier reviews, batches, recall and order-receipt reconciliation              | Implemented routes/components and integration tests                                                                | Connected producer rehearsal, all ingredient write paths, physical recall/withdrawal                         |
| Inspector/export/security          | Scoped grants, evidence export, tenancy and migration/security checks           | Static/mocked checks are not a fresh production security audit                                                     | Hosted cross-tenant/role tests, export reconciliation, restore rehearsal                                     |
| Kitchen labels                     | Sample catalogue, preset shelf lives, browser print preview, historical records | NOT a live recipe-driven label workflow. Sample preview is now clearly marked and cannot write operational history | Verified recipe/supplier data, approved dates, dedicated label layout, printer acknowledgment and withdrawal |
| Workforce                          | Rota, shift creation and time-clock source routes                               | Not full workforce acceptance                                                                                      | Shift swaps, leave approval, attributable shared-premises handover                                           |
| Billing/notifications/documents    | Provider adapters, queues, storage/export/scanning foundations                  | Provider setup not available in this checkout                                                                      | Real checkout/webhooks, email/push/cron and malware-scanner acceptance                                       |
| AI/Omniqora                        | UK AI assistant invokes omniqora-platform; integration configuration exists     | Not evidence of enabled paid AI or production connections                                                          | Governed runtime and connection acceptance                                                                   |
| Germany                            | Shared core workflows, German/English native account/recording/recovery screens | Independent repository and test suite                                                                              | Remaining native translation and UK workflow parity with German-specific content                             |

## Confirmed issues fixed in this change

1. Lost-response replay: a successful upload followed by a lost response previously left duplicate retries unresolved. A 23505 now triggers a read through the current authenticated client, filtered by idempotency key, organisation and original author. Every submitted field must match. Account identity is checked before and after lookup. Only a confirmed match clears the local entry; errors, inaccessible/missing rows, changed payloads and changed accounts retain it. Existing database RLS remains authoritative. No overwrite, delete, service key, or force-accept control is introduced.
2. PostgreSQL UTC representation: equivalent UTC suffixes and trailing fractional zeros compare correctly without truncating microsecond differences. Other type/value differences remain unresolved conservatively.
3. Sample labels previously wrote illustrative products into `label_prints` and opened print regardless of insert failure. Sample printing now carries a visible NOT FOR FOOD USE watermark, explains example allergens/shelf lives and does not write operational evidence. Permissions still apply. This does not complete operational label printing.

## Live release finding

The public UK `https://haccora.co.uk/health.json` probe returned release `14976f31d484d9ac317d6e6da2d38ea79ba1732b` in both payload and release header. Audited UK main was `9f4fdeab60f56628b265e669e90592ad4b6429a2`. Release identity check FAILED. Investigate the deployed commit and publish the approved candidate, then repeat health/readiness and authenticated acceptance. A reachable website is not proof that current main is deployed.

UK launch-status checks found 42/42 configuration controls unavailable in this local checkout. This is NOT evidence that production lacks all 42 values. Native release preflight similarly lacks local runtime/EAS settings. No provider credentials or production secrets were created or changed.

## Next acceptance order

1. Reconcile hosted release and database migration ledger; stage the candidate before production deployment.
2. Run owner/manager/chef/staff/inspector and two-tenant journeys against configured staging.
3. Test offline termination, lost-response replay, reconnect and account switching on real iOS/Android devices.
4. Replace sample labels with verified operational data and printer lifecycle; do not use the sample catalogue operationally.
5. Complete Germany localisation/parity, workforce gaps and provider/integration acceptance.
6. Signed builds, monitoring, backup restore and recorded site acceptance.

No production migration, live tenant activation, deployment, payment setup or signed store release was performed.

## Validation recorded for this change

- UK `npm run quality`: PASS, 355 tests, zero failures; typecheck, lint, formatting, source integrity, migration lineage, secret/action/OWASP checks, production build/bundle budget and 11-route worker smoke with two host redirects.
- Germany `npm run quality`: PASS, 112 tests, zero failures; typecheck, lint, formatting, migration lineage, secret/structure checks, production build/bundle budget and seven-route worker smoke.
- Both native TypeScript checks: PASS. UK all-platform Expo export: PASS with two workers after an initial concurrent export was killed by the environment.
- New regression coverage: exact duplicate replay, field/type/tenant/author/idempotency mismatch, denied/missing/failed reads, account change during verification, PostgreSQL timestamp precision, and sample-print permission/evidence boundary.
- Local Playwright browser installation: BLOCKED by browser-download failure. No claim of fresh local browser acceptance. Hosted browser/database/security workflows must be checked on the PR head.
- Public UK health release match: FAIL as recorded above. Authenticated hosted role journeys, fresh database/RLS execution, provider acceptance and physical devices were not run locally.

## Fresh CI dependency follow-up

Initial PR CI passed fresh-database/RLS, CodeQL and Edge checks in both editions, but production dependency gates identified existing Seroval advisories GHSA-F86P-H4J2-7QGJ/GHSA-9WX9-5PV9-3349 and decode-uri-component advisory GHSA-QR28-FPJM-WQ7F. Pin Seroval 1.6.11 in both web trees and decode-uri-component 0.5.1 in both native trees. Align Germany query-string to the existing UK 9.5.0 override. Regenerate lockfiles using npm 10.9.4; no security exceptions are added or broadened. The pre-existing low-severity Expo deepmerge exception remains separate.

Both editions completed local all-platform native exports. Re-run quality, native exports and dependency policy checks after these dependency changes, then require fresh hosted checks on the new head. The initial green database/security results do not substitute for final-head verification.

## Recipe-label follow-up

The subsequent recipe-label phase replaces the sample catalogue with live, tenant-scoped recipe drafts, explicit dates and source revalidation. See `2026-10-30-RECIPE-LABEL-DRAFTS.md` for current behaviour and remaining approval/printing gaps. Historical sample findings above describe the audited baseline, not the new draft workflow.

## Recipe register recovery follow-up

Recipe read/save/delete failures now surface explicitly, uncertain saves retain inputs, and retries verify the original submission. See `2026-10-30-RECIPE-SAVE-RECOVERY.md` for implementation, coverage and remaining limits.
