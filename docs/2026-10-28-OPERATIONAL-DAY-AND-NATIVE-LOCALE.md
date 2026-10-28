# Operational days and native usability — 28 October 2026

## Delivered

- Web dashboard check samples and temperature totals use Europe/London calendar days, with an exclusive next-midnight boundary. Viewing from another device timezone no longer moves today's records between days.
- Live metrics count checks completed within the same country calendar day. Existing rolling temperature windows retain their labels and meaning.
- Dashboard check samples disclose the returned count, the exact server total (or unknown), and a link to all checks. Completion remains explicitly scoped to the displayed sample, capped at 20 rows.
- Open dashboards reload when the country calendar date changes (within the next minute while active).
- Expiry horizons use seven calendar days rather than seven fixed 24-hour periods.

UK native progress now compares completed and open checks from the same population: records created today in Europe/London. Previously the numerator used completion time while the denominator used creation time. Native refreshes on day rollover and shares the web helper byte-for-byte.

## Validation

Regression coverage exercises actual dashboard components with an isolated data client, including a 20-row sample with 35 matching records. Calendar tests cover London/Berlin spring and autumn clock changes (23/25-hour days), midnight, month/year boundaries, leap years and invalid dates. Web quality, native TypeScript and iOS/Android export gates are required before merge; GitHub runs the browser, database and security checks against the review commit.

## Remaining gaps and next acceptance work

1. Rehearse authenticated role journeys against connected staging: owner, manager, chef, staff and inspector, including cross-tenant/site denial and supplier/recall/Dishbee workflows. Existing automated checks do not substitute for a deployed integration rehearsal.
2. Validate native language selection and queue/reconnect behaviour on physical devices, then produce signed iOS/Android builds. Expo export is not a signed release.
3. Translate the remaining German native forms, errors, accessibility labels and onboarding. Shared workflows need country-specific review before Germany parity is claimed.
4. Replace the dashboard sample with server-aggregated scheduled-work totals where required. Checks created today are not a complete inventory of scheduled, carried-over or overdue work. All-checks remains the full record entry point.
5. Add premises-configurable operational zones if multi-country premises are supported. This phase explicitly uses the edition's country zone; it does not infer a timezone from language or device settings.
6. Close supplier-write and physical-label withdrawal gaps, then record provider configuration, monitoring and restore rehearsal evidence before production acceptance.

No migrations, provider secrets, live production deployment or store release are included in this phase. See the previous dashboard recovery report for the broader release gaps and dependency exception expiry.
