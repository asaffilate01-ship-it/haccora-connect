# Native sync recovery — 28 October 2026

## Delivered

The dashboard now opens an authenticated sync recovery screen. It lists only the current account's queued record type, reference, queued time, failed-attempt count and safe pending/failed/conflict state. Evidence payloads and raw provider errors are not exposed by the summary API. Germany follows its persisted German/English language preference.

Users can refresh the local snapshot and retry uploads while connected. Concurrent retry taps are suppressed. Inspectors can review metadata but cannot trigger upload retry from this screen. Empty state only appears after a successful read and explicitly does not certify server persistence. Read/retry failures show recovery guidance and preserve evidence.

Queue reads validate the index, duplicate IDs, supported tables, author, organization, timestamps, attempts and matching idempotency references before an upload or rewrite. Invalid, missing or mismatched stored data fails closed; the original index and secure records remain unchanged for recovery. No delete or force-acknowledge control is introduced.

## Validation

Behavioural tests cover current-account-only summaries, safe conflict states, malformed indexes, damaged secure records, recovery after failed reads, duplicate retries and offline/inspector controls. Full web quality, native TypeScript/export and fresh GitHub browser/security/database checks are merge gates.

## Remaining gaps

1. Exact replay verification was added on 30 October: see `2026-10-30-IMPLEMENTATION-AUDIT.md`. An audited manual resolution workflow for genuinely different or unverifiable records remains outstanding; a uniqueness error alone is never confirmation.
2. Implement a support-reviewed recovery process for damaged local storage, with physical-device termination/restart tests. Do not clear app data or re-enter evidence merely because a recovery error appears.
3. Complete German actions/incidents/documents/settings translation and device keyboard, large-text and screen-reader review.
4. Rehearse connected staging integrations and scheduled-work totals; produce signed native releases after physical-device acceptance.

No production deployment, database migration, provider change or signed mobile release is included.
