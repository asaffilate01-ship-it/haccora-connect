# Phase 32 — deployment resilience and platform timestamp fix

Updated: 9 August 2026

## Live finding

The current Lovable deployment contains the Phase 31 FAQ and responsive UI source, but its browser runtime does not receive `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY`. The root `AuthProvider` attempted to create the Supabase client on every route, so the public marketing and legal pages entered the root error boundary before the twelve FAQs could render.

Phase 32 separates safe connection detection from client creation. Public marketing and legal content now remains available during a provider-configuration incident. Sign-in, sign-up, password reset and contact delivery stay fail-closed, show a clear service message and never fall back to a fabricated backend. Production preflight still requires both browser and server Supabase values.

## Temperature correction

`public.temperature_logs` uses `logged_at` as its canonical evidence time. Phase 28's SaaS-owner dashboard aggregate and the tenant readiness page queried a non-existent `recorded_at` column. Phase 32:

- corrects the readiness query to `logged_at`;
- adds a forward-only replacement for `public.get_platform_dashboard()` using `logged_at`;
- adds an index for the 30-day aggregate; and
- keeps the already-published Phase 28 migration immutable.

The new migration must be applied to the linked Supabase environment before the hosted SaaS-owner dashboard stops returning the column error.

## SaaS-owner route

The intended route is confirmed:

1. Supabase Auth establishes the session.
2. `get_my_platform_context()` returns an active `platform_owner`, `platform_support` or `platform_auditor` assignment.
3. The web login flow redirects platform operators to `/platform`.
4. `/platform` loads audited aggregate RPCs and never grants direct tenant-evidence access.
5. Native platform operators are directed to the governed web control plane.

The demo role-access runner verifies that the seeded SaaS owner receives `platform_owner`, can access audited aggregate metadata and receives zero direct tenant rows under RLS.

## FAQ assessment

The twelve public FAQs are the right launch-sized set. They cover regulator-approval boundaries, paper replacement, the four UK nations, operational workflows, inspections, devices, offline work, QR evidence, permissions, UK GDPR, setup and subscription exit. Adding many more questions to the landing page would make it harder to scan. Detailed material should move into a searchable help centre covering onboarding, subscriptions, integrations, retention/export, incident support, device requirements and implementation guidance.

FAQ and legal wording remains draft product content until qualified UK food-safety and legal reviewers approve it. Haccora must not claim FSA, FSS, local-authority or EHO approval without written evidence.

## Verification

- Root quality gate passed.
- Migration lineage passed: 61 migrations, 266 policy declarations and 116 function definitions.
- 167 source/security regression tests passed.
- Production web/SSR/Cloudflare build passed its raw/gzip budgets and emitted no static chunk cycles.
- Built worker smoke passed for six public routes.
- Native TypeScript and Expo exports passed for web, iOS and Android.
- Root and Edge audits have zero findings; the two exact Expo/Metro build-tool exceptions remain governed until 30 September 2026.
- The local Playwright HTTP tests passed, but browser/Axe execution requires the Chromium binary installed by GitHub CI.

## Remaining external gates

1. Configure the real Supabase URL and publishable key in the Lovable/production browser environment and the server aliases in the runtime.
2. Apply and reconcile the Phase 32 migration in isolated staging, then run hosted RLS, storage, demo-role and restore tests.
3. Complete production Stripe, email, push, malware scanning, schedules, monitoring, support and status configuration.
4. Supply Haccora Ltd statutory details and complete UK counsel, ICO/DPIA/DPA, retention and subprocessor review.
5. Obtain qualified food-safety review for the four-nation workflows, limits, templates and public claims.
6. Complete independent penetration testing and tenant-isolation acceptance.
7. Replace the EAS placeholder, configure Apple/Google signing and run physical-device TestFlight/Play internal testing before store submission.

No source-only change can honestly remove these evidence gates.
