# Go-live status — 2026-08-07

## Position

The repository is suitable for a protected staging rehearsal after Phase 27. Core web/PWA/native workflows, persistence, QR equipment history, tenant RLS, scoped inspector access, notifications/billing foundations and release controls are implemented. Production schedulers, queues and accountable launch approvals now have fail-closed release gates. The product is not yet approved for public production use because the deployment, provider, legal, security and store evidence must still be completed by the launch team.

## Closed in Phase 27

- Reconciled the duplicate heartbeat migration published during the Phase 26 Lovable upload without deleting either ledger timestamp.
- Added a protected launch-acceptance record bound to the exact release SHA and `haccora.co.uk` candidate URL.
- Made product, security, privacy/legal, qualified food-safety and operations approvals mandatory for the production workflow.
- Made restore RPO/RTO, penetration-test, tenant, provider, accessibility, offline and signed native evidence machine-enforced.
- Added explicit risk acceptance for every active dependency exception.
- Pinned all third-party GitHub Actions to immutable commit SHAs and added an enforcement gate.

## Closed in Phase 26

- Added service-role-only success/failure heartbeats for every scheduled dispatcher.
- Added a protected aggregate operations-health function that fails on missed schedules or dead letters without exposing tenant data.
- Added scheduled operational monitoring and made production release evidence depend on it.
- Corrected cron authentication for the notification dispatcher.
- Repaired the native dependency lock and inherited Edge formatting regression.
- Replaced an impossible blanket mobile audit gate with an exact, expiring policy for the two current Expo/Metro build-tool advisories.

## Closed in Phase 25

- Added a fail-closed staging workflow that separates migration preview from explicitly approved remote changes.
- Added remote migration-ledger reconciliation, full Edge Function deployment/inventory and hosted demo-role verification.
- Extended live RLS proof across sensitive operational tables and an inspector write-denial probe.
- Added redacted staging evidence with gate status and artifact hashes.
- Added a pinned, internal-only EAS candidate workflow for physical iOS/Android testing.
- Made the production preflight require the Expo enhanced-push access token.

## Closed in Phase 24

- Native evidence uploads now include canonical file metadata and SHA-256 integrity evidence.
- Native document opening is malware-scan gated and uses short-lived signed links.
- Archived evidence no longer appears in the active native library and is retained for audit.
- Push registration respects explicit permission and the saved tenant preference.
- Reused device tokens move to the current authenticated tenant rather than remaining attached to an earlier account.
- Expo ticket receipts are reconciled and provider-rejected tokens are disabled.

## Closed in Phase 23

- All current application/RLS roles now have seeded sign-in identities.
- A separate audited SaaS-owner identity and platform console now exist.
- A second tenant plus a publishable-key access runner prove cross-tenant filtering in staging.
- Manager billing access was removed; billing is tenant-owner-only end to end.
- The inspector equipment scope now passes database constraints.
- A duplicated Phase 22 migration was reduced to its ledger-preserving service-role delta.
- The source quality gate again passes from a fresh checkout.

## Remaining launch gates

| Priority | Gate                                | Completion evidence                                                                                                                          |
| -------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Fresh and linked-staging migrations | Run `Protected staging rehearsal` in `apply-and-test` mode and retain its reconciled ledger                                                  |
| P0       | Hosted demo identities              | Retain the workflow's successful `demo:seed`, `demo:verify` and expanded `demo:access` output                                                |
| P0       | Production configuration            | Passing `npm run launch:preflight` with managed Supabase, domain, Auth, storage, scanner, Stripe, Resend/push and scheduler configuration    |
| P0       | Security and recovery               | Independent penetration test, cross-tenant acceptance, on-call routing proof and a timed backup/storage restore drill                        |
| P0       | UK legal/privacy                    | Real legal identity, UK counsel approval, ICO position, DPIA, DPA/subprocessor and retention evidence                                        |
| P0       | Food-safety validation              | Qualified reviewer approval of UK-nation templates, limits, claims and source/review dates                                                   |
| P0       | Release governance                  | Protected PR, green CI/CodeQL/database/E2E checks, completed `LAUNCH_ACCEPTANCE_JSON` and immutable deployment evidence for the exact commit |
| P1       | Native release                      | Real EAS project, signing, physical-device/offline/push QA, TestFlight/Play internal testing and store review                                |
| P1       | SaaS operations                     | Approved time-limited support-access workflow, customer lifecycle controls and operational runbooks                                          |

## Demo login pattern

The default domain creates `saas-owner`, `tenant-admin`, `manager`, `chef`, `staff`, `inspector` and `isolation-owner` accounts at `demo.haccora.co.uk`. The shared test password is the private value in `.env.demo`; it is never stored in Git.

No repository can honestly be labelled 100% live-ready until the real deployed environment and accountable specialists have supplied the evidence above.
