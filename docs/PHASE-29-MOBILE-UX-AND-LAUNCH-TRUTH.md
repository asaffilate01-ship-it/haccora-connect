# Phase 29 — mobile operations, identity and launch truth

Updated: 9 August 2026

## Repository and deployment audit

The GitHub `main` branch already contains the Phase 28 SaaS control plane, tenant role/RLS work and QR scan evidence. Four later Lovable migrations add column-level secret protection and stronger client grants. Phase 29 preserves those changes.

The reviewed Lovable deployment presents Haccora, `Safe. Clean. Traceable.` and UK-only public copy. It must still be treated as staging because:

- the company-details page says the legal identity is incomplete;
- the registered office, company number and phone are not configured;
- the deployment uses a Lovable preview hostname and displays the Lovable editor badge;
- the browser console reported a TanStack runtime error on public route transitions;
- no GitHub status checks or pull-request workflow runs were attached to the reviewed `main` SHA.

Production must use `haccora.co.uk` for the public site, `app.haccora.co.uk` for authenticated web access and the statement “Haccora is a trading name of iTechLounge.” The source includes these non-secret identity defaults but intentionally does not invent statutory details.

## Delivered in Phase 29

- Restored the missing `platform-admin` entry in `supabase/config.toml`; the repository quality gate previously stopped before tests because this function was no longer deployable.
- Added a persistent PWA Quick Log route for temperature, daily checks, deliveries, cleaning, diary, incidents and equipment QR scans.
- Filtered PWA Quick Log mutations through both page-level role access and the effective custom-role action list.
- Rebuilt the native Today screen around the current premises, shift progress, next required action, offline queue state, attention counts and compact high-frequency logging.
- Replaced text-symbol native navigation with consistent Lucide icons and a prominent central Log action.
- Cached organisation, premises, display name, custom role name, effective action permissions and tenant service status for safe offline context.
- Made native frozen/closed tenants fail closed and provided a support/sign-out status screen.
- Applied effective action permissions to native delivery, incident and QR/equipment mutation flows. RLS remains the authoritative backend boundary.
- Standardised Haccora/iTechLounge identity, the `haccora` native scheme, `haccora.co.uk` canonical marketing URL and the accessible brand red.
- Expanded the privacy draft to explain optional foreground equipment-scan GPS, accuracy, lack of background tracking, worker transparency and DPIA expectations.

## Competitor-informed decisions

Leafe's strongest public UX pattern is a chef-focused mobile home with opening/closing routines, very short temperature and delivery capture, visible reminders, live allergens and a broad operational toolkit. Trail similarly leads with the right task for the right person at the right time, followed by review and multi-site performance insight.

Haccora now adopts that high-frequency task model without copying competitor branding. Its intended differentiation is stronger tenant isolation, subscription-bounded custom roles, four-nation UK context, scoped inspector evidence and QR equipment history that binds asset, premises, actor, server/device time and optional GPS.

Public competitor pages are marketing claims and are not assurance evidence. Do not repeat competitor claims such as guaranteed hygiene ratings, hours saved or faster operations without Haccora's own measured pilot data.

## External gates that source code cannot complete

1. Supply and verify iTechLounge's applicable legal identity, business address, phone, ICO status and any VAT number, then obtain UK counsel approval.
2. Point and verify production DNS/TLS for `haccora.co.uk`, `app.haccora.co.uk`, support and status services; remove Lovable preview/editor presentation.
3. Apply every migration to isolated staging, run pgTAP/RLS/storage/realtime/export tests, regenerate schema types and complete a measured restore drill.
4. Configure live Stripe, email, push, malware scanning, schedules, monitoring and on-call routes; test duplicate, delayed and failed-provider paths.
5. Replace the EAS placeholder, configure Apple/Google signing, run signed TestFlight/Play internal builds and complete camera/GPS/offline/push/accessibility tests on real devices.
6. Complete independent penetration testing, UK GDPR/DPA review and qualified food-safety specialist approval of workflows, limits and public claims.
7. Run a real-premises pilot and collect measured completion, exception, support and inspection-evidence outcomes before claiming parity or superiority.

Haccora supports due diligence and inspection preparation. It must not claim that the FSA, Food Standards Scotland, a local authority or an EHO has approved the product unless written approval exists.

## Sources reviewed

- https://www.leafeapp.com/features
- https://www.leafeapp.com/
- https://trailapp.com/
- https://myhaccp.food.gov.uk/
- https://myhaccp.food.gov.uk/help/guidance/principle-7-establish-documentation-and-record-keeping
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/employment/monitoring-workers/data-protection-and-monitoring-workers/
