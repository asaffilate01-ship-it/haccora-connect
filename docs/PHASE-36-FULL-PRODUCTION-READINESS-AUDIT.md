# Haccora Phase 36 full production-readiness audit

Audited: 9 August 2026  
Repository baseline: `asaffilate01-ship-it/haccora-connect` at `a9f7f472fc1e25115ee50cd8c202cb091f146dd7`  
Live candidate: `https://hacccora-chums.lovable.app`  
Target identity: Haccora · a trading name of iTechLounge · `haccora.co.uk`

## Executive verdict

Haccora is a strong, unusually complete source candidate, but the current public deployment is **not ready for customer use**. The source after this Phase 36 repair scores approximately **94/100 for implemented build completeness**. The currently deployed candidate scores approximately **39/100 for proven live launch readiness** because the authentication connection is absent, the legal identity page is explicitly in draft, no GitHub checks are recorded for the deployed commit, and provider/native/security evidence has not been supplied.

This is a **no-go for public paid launch** until every P0 gate below is closed. The low deployed score is concentrated in configuration and external evidence, so it can improve quickly once the correct production environment exists; it does not mean 61% of the product must be rewritten.

## Direct live findings

- `/health.json` returned `status: ok` and the exact deployed release SHA `a9f7f472fc1e25115ee50cd8c202cb091f146dd7`.
- The public homepage rendered without horizontal overflow at the audited desktop viewport and exposed no site-origin console errors.
- The 52-second first-party product tour opened in an accessible dialog, had controls, did not autoplay, loaded its MP4, poster and English captions, and exposed a transcript route.
- The homepage contains 12 focused buyer FAQs. Their approval, electronic-record, four-nation UK, inspector, offline, QR/GPS, role/RLS, privacy and subscription wording is appropriately qualified.
- No active German wording or “Imprint/Impressum” text was found on the audited homepage, login or company-details page.
- `/app` and `/platform` ultimately redirect unauthenticated users to `/login`, including the requested redirect path.
- **P0:** the login page says authentication is unavailable because the secure service connection is not configured; the sign-in and reset controls are disabled.
- **P0:** the public company-details page says `Draft — do not publish`, with registered office, town/postcode, company number and phone unconfigured.
- GitHub exposed no status checks or workflow runs for the deployed SHA, even though the repository workflows are configured for pushes to `main`.
- Lovable changed the generated Supabase client after Phase 35 and broke the resilient public configuration test on GitHub `main`. Phase 36 repairs this regression and adds a permanent regression test.

## Phase 36 repairs included

- Restored `getPublicSupabaseConfig()` and deployment-neutral Supabase failure messages after the Lovable overwrite.
- Added a canonical Haccora shield, wordmark and `SAFE · CLEAN · TRACEABLE` identity family.
- Replaced the native Lovable placeholder icon and plain PWA icon with real Haccora app, adaptive, notification, touch and favicon assets.
- Reused the canonical logo on public/authenticated web onboarding, native login, native Today and the native biometric lock; refreshed the product-tour poster.
- Added viewport-clamped native wordmark sizing and a 760px tablet content/navigation measure.
- Enabled native phone/tablet rotation instead of forcing portrait-only layout.
- Kept the established compact operational type scale and added correct web login autofill semantics.
- Expanded the public Help Centre from 27 to 30 answers without increasing the 12-item landing-page FAQ. New answers clarify consultancy/accredited-training boundaries, official-guidance changes and notification fallbacks.
- Added seeded and testable SaaS support and SaaS auditor identities, in addition to the SaaS owner and tenant roles.
- Added Phase 36 regression coverage. The complete source suite passes 182/182 tests.

## Evidence-weighted scorecard

These scores are engineering audit estimates, not legal certification or regulator approval. `Source` measures implemented, locally verified code after Phase 36. `Live` measures evidence observed on the currently deployed Lovable candidate.

| Audit area                                          |   Weight |     Source | Current live | What prevents 100%                                                                                                     |
| --------------------------------------------------- | -------: | ---------: | -----------: | ---------------------------------------------------------------------------------------------------------------------- |
| Core web features and persistence                   |      10% |         97 |           25 | Authentication is unavailable; no authenticated live workflow proof                                                    |
| UK food-safety content and FAQs                     |       9% |         92 |           70 | Qualified four-nation food-safety review and template approval outstanding                                             |
| Roles, permissions, RLS and isolation               |      11% |         96 |           35 | Hosted nine-role rehearsal, cross-tenant denial and inspector/storage evidence outstanding                             |
| Security and UK privacy                             |       9% |         93 |           50 | Pen test, DPIA/ICO decision, support-access acceptance and recovery proof outstanding                                  |
| SaaS owner control plane                            |       7% |         95 |           25 | Live operator sign-in, MFA step-up, financial/provider and tenant-lifecycle proof unavailable                          |
| Tenant administration                               |       7% |         95 |           25 | Live owner/manager invitations, custom-role limits and recovery flows unavailable                                      |
| Equipment QR, GPS and audit history                 |       7% |         97 |           35 | Physical labels, real cameras, consented GPS, device clocks and hosted append-only history untested                    |
| UI/UX, responsive web, PWA, accessibility and brand |      10% |         96 |           78 | Phase 36 brand assets are not deployed; full mobile/tablet browser, Lighthouse and assistive-tech evidence outstanding |
| Native iOS/Android and offline                      |       8% |         90 |           35 | No real EAS project, signed binaries, physical-device matrix, TestFlight/Play or store approval                        |
| Notifications, documents and providers              |       6% |         91 |           20 | Email, APNs/FCM, web push, cron, malware scanner and private-file journeys unproved live                               |
| Billing and commercial controls                     |       5% |         92 |           20 | Stripe live prices, tax, webhook, portal, dunning, refund and reconciliation acceptance outstanding                    |
| CI/CD, observability and recovery                   |       7% |         94 |           30 | No checks recorded for deployed SHA; monitoring/on-call, backup and timed restore evidence outstanding                 |
| Legal, governance, support and launch acceptance    |       4% |         85 |           15 | Public draft identity, counsel/food-safety approvals, DPA/subprocessors, support SLA and signed acceptance outstanding |
| **Weighted result**                                 | **100%** | **94/100** |   **39/100** | **P0 gates remain open**                                                                                               |

## Feature and wiring audit

The web repository contains 72 routed application/public surfaces; the native project contains 31 screens; the Supabase deployment contains 64 ordered migrations, 266 RLS policy declarations, 119 database-function definitions and 18 Edge Function packages.

### Persisted and wired in source

- Start/end-of-day routines, daily diary and quick log.
- Temperature, cooking/cooling/reheating evidence, limits, deviations and corrective actions.
- Cleaning schedules/completions, pest, oil, chemicals and calibration.
- Goods-in, suppliers, purchasing, stock, waste, recalls and traceability.
- Recipes, declared allergens, live lookup, PPDS evidence and controlled labels.
- HACCP/safe-method content, versioning, approval and flow execution.
- Staff invitations, premises assignment, training/certificates, inductions and fitness-to-work privacy boundaries.
- Private documents, metadata/integrity, expiry alerts, scan-gated downloads and retention/archive behaviour.
- Equipment creation, printable protected QR labels, recurring checks, service/calibration/history, linked readings, server/device time and optional foreground GPS evidence.
- Incidents, complaints, corrective actions, alert inbox, notifications and expiry centre.
- Scoped Inspector Mode and evidence exports.
- Owner billing, Stripe checkout/portal/webhooks and entitlement enforcement.
- SaaS MRR/ARR, plan/status mix, tenant/customer volume, lifecycle controls, subscription limits, operator management, provider readiness and Launch Centre.
- PWA manifest/service worker/install shell and authenticated-route cache exclusions.
- Native offline queue, sync state, camera scanning, evidence upload, secure document opening, notifications, app lock and privacy requests.

`Wired` means the client reaches a Supabase table, RPC, private storage path or Edge Function and is backed by tests. It does not prove that an external provider has been configured in the current deployment.

## Role, permission and demo audit

Phase 36 now defines nine seeded test identities plus the isolation tenant:

| Role               | Intended boundary                                                                                   | Source status                                       | Live proof           |
| ------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------- |
| SaaS owner         | Financials, tenants, subscriptions, plans, operators and launch controls; no tenant evidence bypass | Wired; AAL2 required for privileged mutations       | Blocked by live auth |
| SaaS support       | Service/customer metadata only; no financials, mutations or tenant evidence bypass                  | Seeded; financial-redaction and RLS checks added    | Blocked by live auth |
| SaaS auditor       | Read-only audit and financial controls; no tenant mutation or evidence bypass                       | Seeded; read-only financial/RLS checks added        | Blocked by live auth |
| Tenant owner/admin | Billing, premises, team, custom roles, plans and all authorised tenant operations                   | Wired and seeded                                    | Blocked by live auth |
| Manager            | Bounded team and operational management; no owner billing                                           | Wired and seeded                                    | Blocked by live auth |
| Chef               | Kitchen/HACCP/allergen and operational contribution                                                 | Wired and seeded                                    | Blocked by live auth |
| Staff              | Assigned daily records and lookup only                                                              | Wired and seeded                                    | Blocked by live auth |
| Inspector          | Time-, premises- and category-scoped read/export only                                               | Wired and seeded; writes denied in rehearsal script | Blocked by live auth |
| Isolation owner    | Separate tenant used to prove denial of cross-tenant data                                           | Wired and seeded                                    | Blocked by live auth |

Tenant-defined roles are restrictive overlays on manager, chef or staff baselines. Navigation is only a convenience layer: entitlements, guarded RPCs and PostgreSQL RLS remain the enforcement boundary.

### Required hosted RLS acceptance

Run the protected staging workflow on an isolated Supabase project and retain evidence that:

1. all 64 migrations apply from an empty database and match the remote ledger;
2. every identity receives the expected platform or tenant context;
3. SaaS operators see zero rows through ordinary tenant tables;
4. each tenant role sees one permitted organisation and no isolation-tenant records;
5. inspectors cannot write and see only granted premises/categories/periods;
6. private storage, signed downloads, exports, realtime and custom-role restrictions follow the same boundary;
7. frozen/closed tenants fail closed without exposing another account;
8. every privileged action produces a server-timestamped audit event.

## FAQ audit

The 12 homepage FAQs are accurate enough for launch review and should remain concise. In particular, they correctly state that Haccora is not FSA/FSS/local-authority/EHO approved, that electronic records must suit the business, that native store availability is not yet public, and that GPS is optional foreground evidence rather than continuous tracking.

The Help Centre now contains 30 answers and is the better place for detailed questions. No further homepage expansion is recommended before user testing. Counsel and a qualified food-safety reviewer must still approve the final wording.

The electronic-record answer is consistent with FSA MyHACCP guidance, which says documentation and record keeping should suit the nature and size of the operation and explicitly asks whether records are stored in hard-copy or electronic form: `https://myhaccp.food.gov.uk/help/guidance/principle-7-establish-documentation-and-record-keeping`.

The GPS/workforce caveats are consistent with ICO guidance that worker monitoring must be lawful, fair and proportionate and that excessive monitoring can harm workers' rights: `https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/employment/monitoring-workers/data-protection-and-monitoring-workers/`.

## UI/UX, fonts and logo audit

### Web/PWA

- The active design system has explicit phone, tablet and desktop typography. Operational body type is compact; headings use clamped responsive sizes; there is also an optional compact-density preference.
- The live desktop homepage had no horizontal overflow and used the same header/footer logo artwork at appropriate sizes.
- Phase 36 removes the remaining separate onboarding mark and obsolete Lovable asset metadata.
- Phase 36 creates a stable in-repository logo/mark set rather than depending on Lovable-only asset URLs.
- PWA icons, Apple touch icon and favicon now use the Haccora shield.

### Native

- The former text-only marks and Lovable placeholder icon are replaced with responsive canonical wordmarks and shield assets.
- Wordmarks clamp to the phone/tablet viewport without distortion.
- Main screen content and bottom navigation are limited to a readable 760px measure on tablets.
- iOS/Android can rotate for tablet use rather than being portrait-locked.
- Font scaling remains enabled for accessibility; high-frequency type remains compact and tap targets stay practical.

### Remaining UI evidence

- Browser matrix at approximately 390px, 768/820px and 1440px, including 200% zoom.
- Real iPhone, small Android, large Android and iPad/Android-tablet portrait/landscape screenshots.
- Keyboard, screen-reader, contrast, reduced-motion, glove-mode and focus-order acceptance.
- Lighthouse/PWA install/offline testing and a signed accessibility review.
- Remove the Lovable editor badge from the actual production domain.

## Competitor position and gaps

Leafe's current public pricing advertises Basic from £28, Standard from £68 and Pro from £119 per venue per month plus VAT, with the higher plans adding inventory, waste, menu/allergen, rota, clock-in/out, payroll export, training/certificates, bespoke HACCP, hotline and consultancy support: `https://www.leafeapp.com/pricing-lp1125` and `https://www.leafeapp.com/features`.

Haccora's advertised £9.99 Solo and £24.99 Complete prices are materially cheaper, but price alone is not the launch advantage. Haccora's strongest defensible differences are tenant/premises isolation, restrictive custom roles, protected equipment QR history, append-only corrections, private health/document controls, scoped Inspector Mode and explicit four-nation UK context.

The main competitor gaps are:

1. **Human service layer:** accredited training, bespoke HACCP consultancy, hotline and complaint-investigation support. Contract qualified partners and service levels before advertising these.
2. **Automated sensing:** Checkit advertises continuous sensors and predictive fridge/freezer failure intelligence. Haccora has a governed ingestion boundary, not a contracted hardware/prediction service: `https://www.checkit.net/`.
3. **Live commercial proof:** measured pilots, testimonials, onboarding outcomes, support response and retention metrics.
4. **Provider integrations:** live email/push, payments, monitoring, malware scanning and then carefully selected POS/supplier integrations.
5. **Workforce breadth:** Leafe advertises clock-in/out, timesheets and payroll export. These are optional roadmap items, not food-safety P0s; adding them before the compliance launch would increase privacy and payroll scope.

Do not copy competitor claims about guaranteed ratings or quantified savings without Haccora's own measured evidence.

## Remaining P0 launch gates

### 1. Publish Phase 36 through a reviewable PR

- Upload/commit this phase on a branch.
- Run Production checks, CodeQL and Fresh database/RLS checks.
- Require protected review and preserve artifacts for the exact commit.
- Prevent Lovable-generated clients from overwriting the resilient configuration again.

Acceptance: green GitHub checks and no unreviewed direct-main deployment.

### 2. Configure a real non-production and production Supabase connection

- Set matching browser/server Supabase URL and publishable key values.
- Configure allowed origins, Auth redirect URLs, private storage and all Edge Functions.
- Apply migrations through the protected staging workflow before production.
- Seed demo accounts only in an allow-listed staging project using the safety interlock.

Acceptance: login works; nine role journeys and isolation denial pass against hosted staging.

### 3. Complete UK legal identity and approvals

- Supply registered office, postal town/city, Companies House number and business phone.
- Decide and record VAT and ICO registration/exemption status.
- Execute terms, privacy, DPA, subprocessors, retention/deletion, complaints, accessibility and support wording.
- Obtain UK counsel approval and set the release-gated approval reference/date.

Acceptance: no draft banner or placeholder; launch preflight passes; signed counsel evidence retained.

### 4. Qualified food-safety validation

- Review England/Wales SFBB/HACCP, Scotland CookSafe/FHIS and Northern Ireland Safe Catering/FHRS context.
- Validate all limits, corrective-action prompts, PPDS/allergen content, templates, claims, source dates and review ownership.
- Pilot with real premises and an external competent reviewer.

Acceptance: signed review tied to the exact release and retained in launch acceptance.

### 5. Configure and prove external providers

- Stripe live products/prices, VAT/tax decision, webhook, portal, dunning, refunds and reconciliation.
- Resend/email, Expo/APNs/FCM, web push gateway and scheduled dispatchers.
- Malware scanner, monitoring/error capture, uptime/status and verified support channels.
- Sensor secrets/rotation only if a real integration is being launched.

Acceptance: end-to-end evidence for success, retry, failure and dead-letter paths without exposing secrets.

### 6. Security, privacy and recovery

- Independent penetration test focused on tenant isolation, IDOR, storage, RPC/Edge authorization, auth recovery and QR/inspector links.
- DPIA/legitimate-interest assessment for optional workforce GPS and sensitive fitness-to-work data.
- Timed database and private-storage restore drill with measured RPO/RTO.
- On-call escalation and incident exercise.

Acceptance: no unresolved critical/high findings; accepted medium risks recorded; restore and incident evidence tied to the release.

## Remaining P1 native and operational gates

- Replace the EAS placeholder with the real project and configure signing.
- Create internal iOS and Android builds and test offline queue, camera, GPS consent, uploads, notifications, deep links and account freeze on physical devices.
- Prepare App Store/Play privacy declarations, screenshots, support URLs and review credentials.
- Complete TestFlight/Play internal testing and public store review.
- Print durable QR labels and run a premises pilot with scan/read/correct/history/export workflows.
- Train support staff, approve access procedures, publish support hours/SLA and rehearse customer onboarding/offboarding.

## Realistic distance to launch

Assuming the required accounts, company details and decision-makers are immediately available:

- **Reviewable Phase 36 source candidate:** ready now.
- **Working authenticated staging demo:** approximately 2–4 focused working days.
- **Private web/PWA pilot:** approximately 1–2 weeks, including hosted role/RLS, provider and device acceptance.
- **Public paid web/PWA launch:** approximately 2–4 weeks, dominated by legal, qualified food-safety, security/recovery and payment/provider evidence.
- **Public native iOS/Android launch:** approximately 4–8 weeks, dominated by signing, physical-device QA and Apple/Google review timing.

These are planning ranges, not guarantees. External counsel, reviewers, penetration testing, provider approvals and app-store review control the critical path.

## Validation completed for Phase 36

- `npm run quality`: passed.
- 182/182 Node tests: passed.
- Production structure, migration lineage, tracked-secret and pinned-action checks: passed.
- TypeScript, ESLint and Prettier: passed.
- Production Cloudflare build, bundle budget and seven-route worker smoke: passed.
- Native TypeScript: passed.
- Expo iOS, Android and web exports: passed offline.
- Migration inventory: 64 migrations, 266 policy declarations and 119 database-function definitions.
- Live public desktop, product-tour, protected-route and legal/auth inspection: completed.

Browser E2E and hosted RLS/provider journeys still need CI/staging because local source checks cannot substitute for those deployment-specific proofs.
