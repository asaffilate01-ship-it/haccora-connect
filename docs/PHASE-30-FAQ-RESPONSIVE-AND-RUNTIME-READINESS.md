# Phase 30 — FAQ, responsive UI and runtime readiness

Updated: 9 August 2026

## Live review findings

The reviewed Lovable page had five FAQs. They were cautious but focused on internal deployment, did not explain the important FSA-approval boundary and omitted the questions most buyers need answered. Phase 30 replaces them with twelve UK-facing answers covering regulatory status, digital records, the four nations, workflows, inspections, devices, offline use, QR evidence, roles, UK GDPR, setup and subscription exit.

The live page rendered server HTML but logged `TypeError: re is not a function` in a generated `vendor-tanstack` chunk. Client navigation did not run. The production output showed framework libraries split across circular static browser chunks. Phase 30 removes forced vendor grouping, lets Rolldown preserve the natural route graph and makes the build fail if a static JavaScript chunk cycle is emitted. The budget is 650 KiB raw and 200 KiB gzip per chunk; the corrected main entry is below both limits.

The GitHub Phase 29 upload also left the native package manifest ahead of its lockfile, duplicated `platform-admin` in the Supabase manifest and introduced formatting failures in generated authentication integration files. Phase 30 repairs those source-integrity regressions.

## Responsive and accessibility decisions

- Marketing display sizes now have explicit phone, tablet and desktop ranges.
- The operational shell remains compact while preserving readable body copy and touch targets.
- FAQ headings and answers use a denser responsive scale, visible keyboard focus and native disclosure controls.
- Native screens continue to respect the device text-size setting; Haccora does not disable font scaling to make layouts appear smaller.
- Browser acceptance covers phone, tablet and desktop overflow, FAQ disclosure and client-side navigation.

## Compliance boundary

Haccora helps a food business maintain and retrieve evidence. It is not described as FSA, FSS, local-authority or EHO approved. The business remains responsible for suitable HACCP-based controls, local requirements, lawful staff-data processing and making records available during an inspection.

## Sources

- https://myhaccp.food.gov.uk/
- https://myhaccp.food.gov.uk/help/guidance/principle-7-establish-documentation-and-record-keeping
- https://www.food.gov.uk/business-guidance/safer-food-better-business-sfbb
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/employment/information-about-workers-health/data-protection-and-workers-health-information/
- https://www.leafeapp.com/features
- https://trailapp.com/
