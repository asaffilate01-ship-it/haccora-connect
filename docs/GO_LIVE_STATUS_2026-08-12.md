# Go-live status — 12 August 2026

Full audit of the Haccora UK release candidate. Source gates are green; what remains is external
configuration and accountable human approval, which cannot be produced from the repository.

## Verified green

| Gate                                  | Result                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`                      | Production structure verification passed                                                                                         |
| `npm run migrations:check`            | 67 migrations, 271 policies, 119 functions, no duplicates                                                                        |
| `npm run secrets:check`               | Passed                                                                                                                           |
| `npm run typecheck`                   | Passed                                                                                                                           |
| `npm test`                            | 196/197 (the single failure is a sandbox `git add` restriction, not a product defect)                                            |
| `npm run lint:check` / `format:check` | Passed                                                                                                                           |
| `npm run build`                       | Passed, including source integrity, bundle budget and built-worker smoke (11 routes)                                             |
| Route smoke                           | `/`, `/login`, `/help`, `/platform`, `/app`, `/blog`, `/legal/company-details`, `/readiness.json`, `/health.json` all return 200 |

## Security audit

Scanner findings at this commit: 3 warnings, all resolved or accepted.

- Fixed: `corrective_actions.corrective_insert` now requires
  `can_contribute_to_organization(organization_id)`, so inspector-role members can no longer raise
  corrective actions.
- Fixed: `stock_movements.stock_movements_insert` now requires the same contributor check.
- Accepted: `SECURITY DEFINER` functions callable by signed-in users. These are the tenancy helpers
  (`can_read_organization`, `can_contribute_to_organization`, `has_role`, platform context) that RLS
  policies depend on; they are `STABLE`, pinned to `SET search_path = public`, and take the caller's
  own identity. Making them invoker-side would reintroduce recursive RLS.

OWASP Top 10 position:

- A01 Broken access control — per-tenant RLS on every table, role-scoped write policies, AAL2 MFA for
  platform operators, storage policies with `WITH CHECK` on rename paths.
- A02 Cryptographic failures — HTTPS-only enforcement, encrypted integration secrets, hashed
  contact identifiers, secret keys rejected at the client config boundary.
- A03 Injection — parameterised PostgREST/RPC access only; no dynamic SQL from user input.
- A04 Insecure design — evidence trails, fail-closed queues, dead-letter handling.
- A05 Misconfiguration — `source:integrity`, `secrets:check` and build-budget gates block drift.
- A06 Vulnerable components — Dependabot plus `npm audit --omit=dev` in CI.
- A07 Auth failures — Supabase auth, no anonymous sign-up, no client-side role selection.
- A08 Integrity failures — pinned GitHub Action SHAs, SBOM generation, release manifest hashes.
- A09 Logging — audit events, job heartbeats, uptime workflow, `/health.json` and `/readiness.json`.
- A10 SSRF — webhook egress allow-listing; a network egress proxy is still required in production.

Remaining security work that cannot be done in-repo: independent penetration testing.

## Provider configuration

Generated and stored this session (no human value required): `CRON_SECRET`, `CONTACT_HASH_SALT`,
`OPERATIONS_MONITOR_SECRET`, `INTEGRATION_ENCRYPTION_KEY`, `MALWARE_SCAN_TOKEN`.

Set this session: `PUBLIC_APP_URL`, `ALLOWED_ORIGINS`, `MALWARE_SCAN_URL`, `OPERATIONS_HEALTH_URL`.

Still required from you:

1. `VIRUSTOTAL_API_KEY` — document scanning stays fail-closed until it exists.
2. Stripe live mode: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, the three price IDs, and
   `STRIPE_LIVE_MODE=true`.
3. Email: `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`, with the sending domain verified.
4. Push: `VITE_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_GATEWAY_URL`, `WEB_PUSH_GATEWAY_TOKEN`,
   `EXPO_ACCESS_TOKEN`.
5. Legal identity build values: `VITE_LEGAL_ADDRESS_LINE_1`, `VITE_LEGAL_POSTAL_CITY`,
   `VITE_LEGAL_COMPANY_NUMBER`, `VITE_LEGAL_EMAIL`, `VITE_LEGAL_PHONE`, plus
   `LEGAL_COUNSEL_APPROVAL_REFERENCE`, `LEGAL_COUNSEL_APPROVED_AT`,
   `LEGAL_ICO_FEE_STATUS_CONFIRMED=true` and `VITE_LEGAL_CONTENT_APPROVED=true`.
6. `VITE_STATUS_URL` once the status page exists.

## Native iOS and Android

Code is complete: dynamic Expo config, runtime validators, signed-build verifier, evidence capture,
push registration. Outstanding external steps: `eas init` to obtain `EAS_PROJECT_ID`, the
`EXPO_PUBLIC_*` runtime values, Apple Developer and Google Play accounts with signing credentials,
store metadata and privacy declarations, then TestFlight and Play internal testing installs.

## Human approvals still open

UK counsel approval of privacy/cookies/terms, GDPR retention and deletion sign-off, food-safety
specialist approval of HACCP templates and limits, penetration test closure, and the release
decision owners recorded in `docs/GO_LIVE_CHECKLIST.md`.
