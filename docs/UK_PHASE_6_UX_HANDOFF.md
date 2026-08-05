# UK Phase 6: competitive UX handoff

## Delivered

- Replaced the 44-link always-expanded desktop navigation with role-specific **Quick access** links and collapsible **More tools** sections.
- Persisted each user's expanded navigation sections locally on the device; operational records remain persisted in tenant-scoped Supabase tables.
- Added direct-route role guards for Today, readiness, guided setup, safe methods and PPDS.
- Promoted one live **Next required action** on the web and native Today experiences.
- Added a five-destination native bottom bar: Today, Log, Actions, Evidence and More.
- Simplified public pricing from six packages to Starter, Complete, Multi-site and Enterprise, with a seven-day trial route for self-service plans.

## Competitive position

This phase responds to the strongest usability pattern in Leafe's public positioning: daily work and trial conversion are easier to discover than a long module list. Haccora retains deeper controls for versioned HACCP, PPDS, corrective actions, scoped inspector access, privacy and audit evidence while presenting common work first.

Haccora must not describe engagement indicators as an official hygiene score, FHRS prediction or evidence of EHO approval. It must not claim specialist support, certification or a food-safety hotline until qualified people and contracted service levels exist.

## Persistence boundary

- Checks, temperatures, incidents, corrective actions, safe methods, labels and inspection evidence use Supabase and are governed by tenant RLS.
- Offline native writes continue through the idempotent queue and sync to Supabase.
- Navigation disclosure is a non-sensitive device preference and therefore uses local storage.
- No production feature should silently fall back to invented or demo records.

## Remaining external gates

Source completion does not establish production acceptance. Go-live still requires green GitHub workflows, clean staging migrations and isolation evidence, live provider configuration, restore testing, legal/privacy and food-safety specialist approval, penetration testing, signed app candidates, store review and UK customer pilots.
