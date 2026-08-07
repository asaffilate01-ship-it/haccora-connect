# Phase 22 — QR checks, site RLS and operational UX

Status: implemented and locally verified on 7 August 2026.

## Outcome

Phase 22 turns the existing QR asset register into a recurring equipment-control workflow across
the web app, PWA and native iOS/Android app:

1. A manager creates an equipment item and prints its QR label.
2. A manager attaches recurring inspection, calibration, cleaning, maintenance or service checks.
3. An operator scans the label and sees the exact item, location, due work and full history.
4. The operator records the result, optional/required reading and action taken.
5. The server derives the tenant and site from the asset, attributes the authenticated actor and
   assigns the evidence timestamp.
6. Failed, open or automatically out-of-range results require corrective-action evidence.
7. Saved events remain append-only and schedule/master changes enter the platform audit log.

## Security and RLS correction

The earlier generic tenancy policy allowed chef-level users to update asset master data and gave
ordinary members organization-wide asset reads. The Phase 22 migration replaces that behaviour:

- owner/manager: create, update, retire and schedule equipment across the current organization;
- chef/staff: read equipment at their selected site and append evidence only;
- inspector: read only locations covered by a valid, unrevoked, unexpired `equipment` grant;
- anonymous user: no access;
- QR token: identifies an item but never grants access;
- asset events: tenant and location are overwritten from the protected asset before RLS evaluates
  the insert;
- evidence: update/delete remains revoked and rejected by the immutable-history trigger.

The permissions screen now exposes separate `Manage equipment & schedules` and
`Record equipment checks` capabilities, matching the database policy rather than relying only on
hidden buttons.

## UX decisions

The implementation uses the strongest useful patterns visible in current UK competitor marketing
without copying their design:

- Leafe: direct routine language, due work first and a low-friction mobile record flow;
- Seito and Loggo: location/equipment QR entry points;
- TempTake and Lemon: fast readings, visible safe ranges and corrective-action capture;
- Telsen: recurring monitoring and exception-led status;
- MiseOS and SafeKitchen: inspection-ready attributable evidence.

Source claims are competitor marketing, not independent product verification:

- <https://www.leafeapp.com/>
- <https://apps.apple.com/gb/app/leafe/id1562506324>
- <https://seito.app/>
- <https://loggo.uk/>
- <https://temptake.com/>
- <https://www.getlemon.app/>
- <https://www.telsen.com/>
- <https://mise-os.app/>
- <https://ukfoodsafety.app/>

Operational text on the native equipment screens is now generally 12–16 px, primary headings are
25 px, inputs/actions are at least 46–48 px high and the PWA camera action is 44 px high. Tiny
display text is retained only where it is non-critical label metadata.

## Files and deployment order

- Apply `supabase/migrations/20260807110000_asset_check_schedules_and_rls.sql` first.
- Deploy the web build, including `/app/assets/scan` and the generated route tree.
- Publish a new native build after applying the migration.
- Print labels again if the manual UUID fallback is required on existing equipment; newly rendered
  labels include the QR token below the normal item/location details.

## Verification completed

- root TypeScript check;
- 114 Node tests;
- migration lineage check;
- development web/SSR/worker build;
- native TypeScript check;
- Expo export for web, iOS and Android.

`npm run quality` remains the final aggregate release gate after the documentation and formatting
changes are complete.

## Still required outside source code

This phase does not make a legal or regulatory acceptance guarantee. Before public launch Haccora
still needs a clean staging database migration/RLS integration run, cross-tenant penetration test,
UK food-safety/legal review, live billing/email/push/storage configuration, backup/restore evidence,
real-device QR testing and signed App Store/Play Store release builds.
