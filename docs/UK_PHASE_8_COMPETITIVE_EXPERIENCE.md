# UK Phase 8: competitive daily experience

## Comparison used

Phase 8 reviewed the public Leafe product, feature and pricing journeys and compared the original `food-safety-hub` role dashboards, shift mode, assistant and portals against the current Haccora codebase.

Haccora already contains the source hub's important persistent workflows: opening/closing routines, checks, temperatures, incidents, equipment/assets, policies/safe methods, evidence sharing, inspector access, teams, training and billing. The older hub assistant was not copied because a general generative answer can invent unsafe food-safety advice and depends on an unproved external model configuration.

Leafe's clearest product advantage is presentation: daily records are framed as a simple and motivating staff journey. Haccora's deeper feature set needed the same clarity without creating a vanity “compliance score”.

## Delivered

- Added a role-aware Compliance Coach to the web application.
- Added Compliance Coach as one of five primary native tabs.
- Ranks overdue and critical corrective actions, temperature exceptions, today's open checks, incidents and training expiry.
- Shows seven-day completion momentum from real check timestamps.
- Shows safe-method adoption and evidence coverage without presenting an FHRS/FHIS prediction.
- Adds one-tap routes to checks, temperatures, incidents and the daily diary.
- Uses existing tenant-scoped Supabase records and RLS; there is no mock dataset or browser-only operational state.
- Explicitly states that the coach is not an official hygiene rating, certification or replacement for competent judgement.

## Competitive position

The resulting flow is simpler for shift staff while retaining Haccora's differentiators: four-nation UK authority profiles, PPDS controls, versioned HACCP, controlled evidence sharing, native offline queueing, corrective-action verification, tenant isolation and broader operations coverage.

## Production boundary

Source completeness does not prove live providers or regulatory acceptance. Production still requires migrated staging/production databases, provider configuration, signed store builds, independent security/legal/food-safety review, real-device testing and UK customer pilots.
