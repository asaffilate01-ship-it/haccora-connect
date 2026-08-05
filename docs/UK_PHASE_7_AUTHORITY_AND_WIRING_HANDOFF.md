# UK Phase 7: authority model, wiring and typography

## Delivered

- Replaced Germany-derived Berlin, NRW, IfSG and LMHV marketing concepts with a four-nation UK model.
- Added authoritative context for England, Wales, Scotland and Northern Ireland, including FSA/FSS, FHRS/FHIS and the correct council or district-council relationship.
- Extended each site's persistent compliance profile with its named local authority, optional registration reference and registration-evidence confirmation date.
- Added direct links to official registration, food-business guidance and rating-scheme information for the selected nation.
- Rebuilt editorial data as UK-English-only content and removed the dormant German article payload from the production bundle.
- Reduced app and marketing typography centrally for denser, calmer tablet and desktop layouts.
- Added a regression test which requires every visible operational route to connect to Supabase persistence or the authenticated application shell.

## Persistence boundary

Operational modules write to tenant-scoped Supabase tables and remain subject to RLS. Native offline-capable records use the encrypted queue and reconcile to Supabase. Navigation disclosure is a device preference and remains in local storage. External delivery still requires configured provider credentials; source wiring is not evidence that Stripe, email, push, sensor or app-store accounts are live.

## UK compliance boundary

Haccora records a business's evidence and supports its food-safety management processes. It is not approved or certified by the FSA, FSS or a local authority, does not issue an FHRS/FHIS rating and cannot guarantee acceptance of incomplete or unsuitable records. Official sources and specialist review remain authoritative.

## Remaining production gates

1. Apply and test all migrations against clean staging and production projects, including RLS isolation tests and restore evidence.
2. Configure and prove Stripe, transactional email, push notifications, object storage, observability and any sensor/scanner providers.
3. Complete independent UK food-safety content review, legal/privacy review and penetration testing.
4. Produce signed iOS and Android builds, pass real-device/offline tests and obtain store approvals.
5. Run pilots in each launch jurisdiction and record local-authority/EHO feedback without claiming endorsement.
