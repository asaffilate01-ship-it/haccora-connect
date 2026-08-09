# Production readiness and launch gate

Updated: 2026-08-09

## Implemented in this release

| Area                 | Production change                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorization        | Public sign-up cannot choose a role. New workspaces bootstrap the first authenticated user as owner; team roles are invitation-only.                                                                                                                                                                                                                           |
| Multi-tenancy        | Organizations, locations and memberships scope operational records. Legacy users are isolated into separate workspaces for safe migration.                                                                                                                                                                                                                     |
| Inspector mode       | Access is explicit, time-limited, scope-limited and location-limited. Health/profile PII is excluded.                                                                                                                                                                                                                                                          |
| Data integrity       | Core evidence is append-oriented; corrections are recorded. Audit events are immutable and SHA-256 hash chained per organization.                                                                                                                                                                                                                              |
| Storage              | The private `documents` bucket enforces organization/user prefixes, MIME allowlists and 10 MB limits. Signed links last five minutes and are not persisted.                                                                                                                                                                                                    |
| Compliance workflows | Corrective actions, versioned HACCP approvals, verified training records, allergen/ingredient links, PO lines, stock movements and sensor records are persisted.                                                                                                                                                                                               |
| Server functions     | Contact capture, audited inspector PDF export, Resend/Expo notification dispatch, team/inspector invitations, sensor provisioning and idempotent ingestion are implemented.                                                                                                                                                                                    |
| Web                  | Hook-order crash, temperature trigger, expiry query, HACCP photo path, status codes, inert contact/PDF actions, password reset and the production SSR `HTTPError` are repaired; unsafe manual vendor splitting is removed, a 650 KiB raw / 200 KiB gzip budget plus static-cycle gate is enforced and the generated worker is smoke-tested during every build. |
| Clients              | Installable PWA plus Expo/React Native iOS and Android source with offline idempotent writes, a fail-closed store-configuration preflight, privacy data map and signed-release checklist.                                                                                                                                                                      |
| Operations           | CI, fresh-database pgTAP, desktop/mobile browser accessibility checks, critical-route HTTPS smoke monitoring, SHA-256 release manifests, retained browser reports, security headers, incident/restore runbooks and a non-sensitive health endpoint are included.                                                                                               |
| Platform governance  | The SaaS-owner Launch Centre combines audited scheduler/dead-letter health, non-secret provider-presence checks, public/legal readiness and in-place TOTP step-up. Platform mutations fail closed below AAL2 in the browser, Edge function and database trigger boundary.                                                                                      |
| Commercial           | Stripe billing, server-owned entitlements, provider-event idempotency and out-of-order protection are implemented.                                                                                                                                                                                                                                             |
| Integrations         | Encrypted endpoint secrets, signed HTTPS webhooks, retry/backoff and dead-letter handling are implemented.                                                                                                                                                                                                                                                     |
| Accessibility        | Persistent Glove Mode, high contrast, reduced motion and explicit offline state are implemented.                                                                                                                                                                                                                                                               |

## Blocking items owned by the launch team

These cannot be safely invented or completed from source code alone:

- Real legal entity, UK address, Companies House details where applicable, VAT details and counsel-approved UK English legal copy
- Production Supabase project, SMTP, redirect URLs, MFA policy, Auth rate limits and point-in-time recovery/backups
- Real domain, DNS, TLS, status page, support address and transactional email/push providers
- Sentry or equivalent DSN, tested alert routing, named on-call owner and private provider/incident contacts; the repository now supplies the uptime workflow and response procedure
- Stripe account/prices/tax configuration if self-service billing is enabled
- Apple/Google developer organizations, signing keys, privacy nutrition labels/data-safety declarations, screenshots and store review
- Vendor contracts and credentials for Testo/other sensors, OCR, wholesale catalogs or any future AI providers
- Product-owner approval of public pricing, package names, marketing claims and final UK English content
- Independent penetration test, GDPR/DPA review and specialist validation of HACCP/regulatory templates
- Reconciled Supabase migration ledger and successful linked-staging migration run; the repository exercises the complete migration set on fresh Postgres in CI and rejects repeated policy or identical function definitions

## Release acceptance tests

1. Create Owner A and Owner B; verify every table, realtime channel, storage object and PDF export is invisible across organizations.
2. Invite staff; verify staff cannot change roles, memberships, subscriptions, inspector grants or another user's health declaration.
3. Grant an inspector only `temperature` for one location and one hour; verify all other evidence and all PII is denied before, during and after expiry.
4. Submit out-of-range temperatures from web, native and sensor function; verify alert, corrective action workflow and audit events.
5. Upload allowed and disallowed files; verify size/type/prefix enforcement and five-minute URL expiry.
6. Complete and verify training; confirm an internal quiz is never presented as an official Food-handler health certificate.
7. Export evidence and reconcile counts against tenant-scoped source records.
8. Restore staging from backup and document recovery time and recovery point.
9. Run web quality checks, committed Playwright accessibility tests, native typecheck, manual screen-reader/zoom checks, two-device offline sync and browser/device matrix tests.
10. Obtain product owner, security, privacy/legal and food-safety specialist sign-off.
11. Run Stripe staging scenarios for checkout, renewal, failed payment, cancellation, duplicates, mode mismatch and out-of-order events.
12. Test outbound endpoint signatures, private-network rejection, redirects, retry, automatic disable and dead-letter recovery.
13. Test native camera/document denial, biometric fallback, offline termination/reconnect and sync-conflict review on real devices.
14. Run `npm run launch:preflight` against the production secret set without printing or committing secrets, then run the manual release workflow against the deployed HTTPS candidate and retain its SHA-256 manifest.
15. Complete every item in `GO_LIVE_CHECKLIST.md` with an owner, date and evidence link.

Go-live remains blocked until every external item above has an accountable owner and the acceptance tests pass in the actual production configuration.
