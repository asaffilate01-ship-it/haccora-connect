# Go-live status — 2026-08-07

## Position

The repository is suitable for a protected staging rehearsal after Phase 25. Core web/PWA/native workflows, persistence, QR equipment history, tenant RLS, scoped inspector access, notifications/billing foundations and release controls are implemented. The product is not yet approved for public production use because deployment, provider, legal, security and store evidence cannot be completed in source code.

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

| Priority | Gate                                | Completion evidence                                                                                                                       |
| -------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Fresh and linked-staging migrations | Run `Protected staging rehearsal` in `apply-and-test` mode and retain its reconciled ledger                                               |
| P0       | Hosted demo identities              | Retain the workflow's successful `demo:seed`, `demo:verify` and expanded `demo:access` output                                             |
| P0       | Production configuration            | Passing `npm run launch:preflight` with managed Supabase, domain, Auth, storage, scanner, Stripe, Resend/push and scheduler configuration |
| P0       | Security and recovery               | Independent penetration test, cross-tenant acceptance, monitored alerts and a timed backup/storage restore drill                          |
| P0       | UK legal/privacy                    | Real legal identity, UK counsel approval, ICO position, DPIA, DPA/subprocessor and retention evidence                                     |
| P0       | Food-safety validation              | Qualified reviewer approval of UK-nation templates, limits, claims and source/review dates                                                |
| P0       | Release governance                  | Protected PR, green CI/CodeQL/database/E2E checks and immutable deployment evidence for the exact commit                                  |
| P1       | Native release                      | Real EAS project, signing, physical-device/offline/push QA, TestFlight/Play internal testing and store review                             |
| P1       | SaaS operations                     | Approved time-limited support-access workflow, customer lifecycle controls and operational runbooks                                       |

## Demo login pattern

The default domain creates `saas-owner`, `tenant-admin`, `manager`, `chef`, `staff`, `inspector` and `isolation-owner` accounts at `demo.haccora.co.uk`. The shared test password is the private value in `.env.demo`; it is never stored in Git.

No repository can honestly be labelled 100% live-ready until the real deployed environment and accountable specialists have supplied the evidence above.
