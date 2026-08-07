# Go-live status — 2026-08-02

Baseline: GitHub `main` at `c68c615`, plus Phase 21 UK legal and commercial polish in this change set.

## Decision

The source is deployable to a controlled staging environment, but the product is not yet approved for a public production launch. Repository/code readiness is approximately **98/100**. End-to-end launch readiness is approximately **77/100** because production provider configuration, legal approval, data recovery evidence, monitoring/on-call proof and signed mobile-store releases are still external blockers.

Scores are evidence-based release gates, not a claim that all product behavior has been independently certified.

| Gate                                |      Score | Evidence and remaining gap                                                                                                                                                                       |
| ----------------------------------- | ---------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web runtime and performance         |      14/15 | Production Cloudflare worker returns 200 for six critical routes; CSP/security headers are present; largest browser chunk is below 500 KiB. A real-domain post-deploy check remains.             |
| Code quality and automated testing  |      15/15 | The full quality gate, 56 unit/security/runtime tests, mobile typecheck/export and three production dependency audits pass. GitHub Actions must run green on the uploaded commit.                |
| Security and privacy implementation |      17/20 | Tenant/RLS, private storage, immutable audit, secret scanning, CycloneDX SBOMs, signed build provenance and zero production dependency findings are present. Penetration testing remains.        |
| Database and backend                |      12/15 | 18 migrations, 195 policy declarations, 56 function definitions and the fresh-database/pgTAP workflow pass. Linked-project ledger reconciliation, staging migration and restore evidence remain. |
| Operations and monitoring           |       8/10 | Release identity, external smoke checks, immutable manifests, GitHub deployment recording, rollback and incident runbooks exist. Alert routing, named on-call and exercised rollback remain.     |
| Legal and public content            |       6/10 | UK-only legal routes and fail-closed identity/counsel/ICO gates exist. Real entity values and qualified UK legal/privacy approval remain.                                                        |
| Native iOS and Android              |       6/10 | Typecheck/export pass; fail-closed store config, privacy map and release checklist exist. EAS UUID, signing, device QA, declarations and TestFlight/Play evidence remain.                        |
| Providers and commercial flows      |        2/5 | Billing, notification, malware and integration paths exist. Live provider credentials and end-to-end production-mode verification remain.                                                        |
| **Total**                           | **77/100** | Public go-live remains blocked by launch-team configuration, evidence and approvals.                                                                                                             |

## HTTP 500 incident and repair

The exact production response was reproduced from `.output/server/index.mjs`:

```json
{ "status": 500, "unhandled": true, "message": "HTTPError" }
```

Manual Rolldown vendor splitting created a circular SSR chunk dependency. `legal-content.tsx` evaluated configured legal fields at module-import time before the chunk exporting `PUBLIC_CONFIG` had initialized. Nitro then masked the resulting `TypeError` as the generic response above.

The repair defers configured legal-value reads until React renders the legal content. The production build now also executes `scripts/check-built-worker.mjs`, which imports the generated Cloudflare worker and verifies `/`, `/login`, `/blog`, `/legal/privacy`, `/health.json` and `/app`. It rejects non-200 responses, the generic `HTTPError` payload, wrong content types, or missing CSP/nosniff headers. `npm run preview` now starts Nitro's generated worker instead of looking for the nonexistent TanStack `dist/server/server.js` output.

## Automated evidence after this phase

- Root quality gate: passed
- Unit/security/release tests: 56 passed, 0 failed
- Production worker smoke routes: 6 passed, 0 failed
- Browser bundle gate: passed, maximum 500 KiB per chunk
- Migration lineage: 18 migrations, 195 policy declarations, 56 function definitions
- Root, native and Edge production dependency audits: 0 vulnerabilities reported
- Native TypeScript check: passed
- Expo export: web, iOS and Android passed
- Tracked-file secret scan: passed
- Deployed-candidate smoke gate: implemented for five HTTPS routes; real-domain execution still required
- Release evidence: aggregate and per-file SHA-256 manifest generated by the protected workflow
- Release identity: the worker embeds its full Git commit; health and route probes reject a candidate serving a different commit
- Supply chain: web, native, Edge and aggregate CycloneDX SBOMs plus GitHub build/SBOM attestations are generated for an approved release
- Deployment evidence: a GitHub production deployment record is created only after the exact deployed candidate passes every release gate
- Native store configuration: fail-closed preflight implemented; correctly blocked by the placeholder EAS project ID

## Current launch-preflight blockers

The documented launch checklist contains 27 unresolved configuration and approval items:

1. `PUBLIC_APP_URL`
2. `MALWARE_SCAN_URL`
3. `VITE_SUPPORT_URL`
4. `VITE_STATUS_URL`
5. `ALLOWED_ORIGINS`
6. `RESEND_API_KEY`
7. `NOTIFICATION_FROM_EMAIL`
8. `STRIPE_SECRET_KEY`
9. `STRIPE_WEBHOOK_SECRET`
10. `STRIPE_PRICE_PRO`
11. `MALWARE_SCAN_TOKEN`
12. `CONTACT_HASH_SALT`
13. `CRON_SECRET`
14. `INTEGRATION_ENCRYPTION_KEY`
15. `VITE_LEGAL_COMPANY_NAME`
16. `VITE_LEGAL_ADDRESS_LINE_1`
17. `VITE_LEGAL_POSTAL_CITY`
18. `VITE_LEGAL_EMAIL`
19. `VITE_LEGAL_PHONE`
20. `VITE_LEGAL_REGISTERED_IN`
21. `VITE_LEGAL_COMPANY_NUMBER`
22. `LEGAL_COUNSEL_APPROVAL_REFERENCE`
23. `LEGAL_COUNSEL_APPROVED_AT`
24. `LEGAL_ICO_FEE_STATUS_CONFIRMED=true` after documenting ICO registration or exemption
25. `VITE_LEGAL_CONTENT_APPROVED=true` after documented counsel approval
26. `STRIPE_LIVE_MODE=true` after live-mode provider verification
27. Replace the EAS project placeholder in `mobile/app.json`

These values belong in managed production secrets/configuration, not in GitHub.

## Ordered path to 100/100

1. Upload this phase, require a green GitHub Actions run, deploy the exact commit to staging and run the manual release workflow against its real HTTPS URL; retain the web artifact and SHA-256 manifest.
2. Configure every preflight item in the hosting/Supabase/EAS environments and obtain a passing `npm run launch:preflight` without exposing values.
3. Reconcile the production Supabase migration ledger, apply to staging, run the fresh-database/RLS suite, back up database and storage, and complete a timed restore drill.
4. Exercise real Resend/push, malware scanning, Stripe live-mode test products/webhooks, cron dispatch and outbound integrations; capture provider evidence and alert delivery.
5. Configure production monitoring, status page, on-call ownership and escalation; deliberately trigger and resolve a staging alert and rollback drill.
6. Complete cross-tenant, role, inspector-scope, offline conflict, upload, export, billing and real-device acceptance tests from `docs/PRODUCTION_READINESS.md`.
7. Create signed iOS/Android builds, test on physical devices, complete privacy/data-safety declarations, screenshots and store review through TestFlight and Play internal testing.
8. Obtain written product, security, privacy/legal and food-safety specialist approvals, then complete `docs/RELEASE_EVIDENCE.md` for the exact release commit and immutable artifact.

Production launch is approved only when the preflight is green, the exact deployment commit has green workflows, post-deploy health checks pass, recovery/alert evidence exists, mobile store candidates are signed and tested, and every named approver has signed the release record.
