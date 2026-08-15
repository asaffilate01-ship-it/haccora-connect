# Haccora go-live runbook

A step-by-step guide for everything that remains outside the codebase. Work top to bottom; each step ends with a check you can run.

At any point run `npm run launch:preflight` (or `node scripts/report-launch-readiness.mjs`) to see which of the 44 controls still fail.

---

## Step 1 — Company and legal identity (blocks legal pages)

Collect from Companies House and your ICO registration, then set as protected environment values (hosting + GitHub `vars`):

| Variable                                              | Where it comes from                  |
| ----------------------------------------------------- | ------------------------------------ |
| `VITE_LEGAL_COMPANY_NAME`                             | Haccora Ltd                          |
| `VITE_LEGAL_COMPANY_NUMBER`                           | Companies House record               |
| `VITE_LEGAL_ADDRESS_LINE_1`, `VITE_LEGAL_POSTAL_CITY` | Registered office                    |
| `VITE_LEGAL_REGISTERED_IN`                            | England and Wales                    |
| `VITE_LEGAL_EMAIL`, `VITE_LEGAL_PHONE`                | Public contact details               |
| `VITE_LEGAL_VAT_ID`                                   | HMRC (leave blank if not registered) |
| `VITE_LEGAL_ICO_REGISTRATION`                         | ICO data-protection register entry   |
| `LEGAL_ICO_FEE_STATUS_CONFIRMED`                      | `true` once the fee is paid          |

Then have UK counsel review `/legal/privacy`, `/legal/cookies`, `/legal/terms` and `/company-details`. Record their reference and date in `LEGAL_COUNSEL_APPROVAL_REFERENCE` and `LEGAL_COUNSEL_APPROVED_AT`, and only then set `VITE_LEGAL_CONTENT_APPROVED=true`.

**Check:** `/company-details` shows no draft warning; `/readiness.json` reports `legalIdentity` and `legalApproval` as true.

---

## Step 2 — Domains and origins

1. Point `haccora.co.uk` (marketing) and `app.haccora.co.uk` (application) at the hosting provider with valid HTTPS.
2. Set `PUBLIC_MARKETING_URL=https://haccora.co.uk` and `PUBLIC_APP_URL=https://app.haccora.co.uk`.
3. Set `ALLOWED_ORIGINS=https://haccora.co.uk,https://app.haccora.co.uk` (both are required).
4. Add both origins to the backend auth redirect allow-list.

**Check:** `/readiness.json` returns `marketingOrigin` and `applicationOrigin` true.

---

## Step 3 — Payments (Stripe live mode)

1. Complete Stripe account activation for Haccora Ltd.
2. Create live prices for Solo, Complete and Group; copy the IDs into `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_COMPLETE`, `STRIPE_PRICE_GROUP`.
3. Set `STRIPE_SECRET_KEY` (live), create the webhook endpoint pointing at the billing function and store `STRIPE_WEBHOOK_SECRET`.
4. Set `STRIPE_LIVE_MODE=true` only once live credentials are in place.

**Check:** run one real checkout, one renewal, one failed payment, one cancellation, plus a replayed/out-of-order webhook — all should be idempotent.

---

## Step 4 — Email and push

- `RESEND_API_KEY` + verified sending domain; `NOTIFICATION_FROM_EMAIL=Haccora Alerts <alerts@haccora.co.uk>`. Add SPF, DKIM and DMARC records.
- Browser push: `VITE_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_GATEWAY_URL`, `WEB_PUSH_GATEWAY_TOKEN`.
- Support and status services: `VITE_SUPPORT_URL`, `VITE_STATUS_URL`.

**Check:** send a test invite and a test alert; confirm delivery and that bounce/suppression logging works.

---

## Step 5 — File malware scanning

1. Get a VirusTotal API key → `VIRUSTOTAL_API_KEY`.
2. Set `MALWARE_SCAN_URL=https://app.haccora.co.uk/api/public/malware-scan` and generate `MALWARE_SCAN_TOKEN` (32+ chars, shared with the file-scan job).

**Check:** upload a clean file (passes), the EICAR test file (blocked), and confirm a failed scan lands in the dead-letter queue rather than allowing the upload.

---

## Step 6 — Operational secrets

Generate 32+ character random values, each unique: `CONTACT_HASH_SALT`, `CRON_SECRET`, `OPERATIONS_MONITOR_SECRET`, `INTEGRATION_ENCRYPTION_KEY`. Set `OPERATIONS_HEALTH_URL` to the operations-health endpoint.

**Check:** `npm run operations:health` passes and all four dispatch schedules report heartbeats.

---

## Step 7 — Native (iOS / Android)

1. `cd mobile && eas init` → store the UUID as `EAS_PROJECT_ID`; create an Expo access token as `EXPO_ACCESS_TOKEN`.
2. Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_WEB_APP_URL`.
3. Configure Apple Developer team + App Store Connect app, and Google Play app with signing.
4. Complete App Store privacy / export compliance and Play Data safety using `mobile/store/PRIVACY_DATA_MAP.md`.
5. Build signed production candidates, ship to TestFlight and Play internal testing, and run the device checklist in `mobile/store/STORE_RELEASE_CHECKLIST.md`.

**Check:** `cd mobile && npm run release:preflight` passes.

---

## Step 8 — Database and tenant proof

1. Apply all migrations to a fresh staging project; run the protected staging workflow in `apply-and-test` mode.
2. Run `supabase test db` (tenant isolation + privilege tests).
3. Prove Owner A cannot reach Owner B via API, RPC, realtime, storage or signed URLs.
4. Perform a backup restore drill (`docs/RESTORE_DRILL.md`) and record RPO/RTO evidence off-platform.

---

## Step 9 — External assurance

- Independent penetration test; close all high/critical findings.
- Food-safety specialist sign-off on HACCP templates, critical limits and public claims.
- Accessibility pass: keyboard, screen reader, 200% zoom, reduced motion, high contrast, Glove Mode.

---

## Step 10 — Repository and release controls

1. In GitHub settings enable secret scanning, push protection, private vulnerability reporting, and branch protection on `main` (review + passing checks).
2. Merge the release commit with CI and CodeQL green.
3. Deploy to production.
4. Run the **Production release evidence** workflow against the deployed HTTPS URL. It runs audits, quality, native export, Edge checks, health/readiness/smoke, hosted accessibility, operations health, launch acceptance, SBOM and provenance, then stores the immutable artifact.
5. Provide `LAUNCH_ACCEPTANCE_JSON` (see `docs/launch-acceptance.example.json`) with the exact release SHA and URL and named human approvals.

---

## Step 11 — Go live

1. Confirm every P0 box in `docs/GO_LIVE_CHECKLIST.md`.
2. Record product owner, security, privacy/legal, food-safety and operations approvals plus rollback owner and release window.
3. Enable external uptime monitoring of `/health.json` and the public smoke routes, routed to on-call.
4. Announce, then monitor errors, webhook queues and dispatch heartbeats through the agreed post-release window.

---

## Marketing switch-on (after live)

Google Search Console + Bing Webmaster (submit `/sitemap.xml`), Google Business Profile, Capterra/G2/GetApp listings, LinkedIn company page, and promote the HACCP template lead magnet at `/free-tools/haccp-plan-template`.
