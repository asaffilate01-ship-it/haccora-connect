# UK Phase 5 handoff

## Delivered

- Added a focused **Today's shift** page joining opening checks, service monitoring, temperature exceptions, corrective actions, incidents and closing routines.
- Added native read-only views for adopted safe methods, controlled PPDS label versions and inspection evidence readiness.
- Fixed the launch language type and provider to UK English only and removed remaining German-language selection behaviour from the core runtime.
- Added regression tests for the shift workflow, native compliance parity and launch-language boundary.

The shift and readiness summaries are operational indicators. They are not an official Food Hygiene Rating, certification or guarantee of compliance.

## Remaining source cleanup

Some older route components still pass dormant German strings as the unused first argument to legacy translation helpers. They do not render because the runtime language is fixed to English. A later mechanical cleanup may simplify those components, but it should not distract from staging isolation, release evidence and real-device testing.

Historical migrations that convert `Europe/Berlin` values to `Europe/London` must remain so existing installations can be upgraded safely.

## External go-live gates

1. Enable and pass GitHub Actions, CodeQL, browser accessibility and clean-database workflows on the release commit.
2. Reconcile and apply migrations to a real staging Supabase project, run tenant-isolation tests and complete a restore drill.
3. Configure production domain, legal identity, Stripe, email, push, malware scanning, monitoring and incident routing.
4. Obtain UK legal/privacy, qualified food-safety and independent penetration-test sign-off.
5. Configure EAS/Apple/Google signing, install signed candidates on representative devices and complete store review.
6. Run controlled pilots with UK restaurants, takeaways, cafés and institutional caterers.

Haccora supports a food business operator's records and food-safety management system. It does not replace official FSA/FSS guidance, competent management or local-authority inspection.
