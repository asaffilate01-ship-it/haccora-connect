# Phase 23 — demo roles and platform operations

Phase 23 makes the current security model testable through real Supabase Auth sessions in a dedicated non-production project.

## Delivered

- Seven repeatable demo identities: SaaS owner, tenant admin/owner, manager, chef, staff, inspector and a second-tenant owner.
- Two UK demo businesses in Camden and Bristol so cross-tenant denial is observable rather than assumed.
- A publishable-key smoke runner that signs in as every identity and verifies context, organization, membership, subscription, temperature-evidence and platform-RPC boundaries.
- A separate `platform_operators` model that cannot be granted by sign-up metadata or tenant administrators.
- An audited `/platform` console with aggregate service totals, customer-account/subscription metadata and recent platform-access events.
- No implicit support impersonation and no platform bypass of tenant operational RLS.
- Owner-only tenant billing in navigation, subscription RLS and the Stripe Edge Function.
- A database repair aligning the Phase 22 `equipment` inspector scope with grant/invitation constraints.
- A fresh-database pgTAP contract for platform access, tenant billing and non-bypass behaviour.
- Reconciliation of the duplicated generated Phase 22 migration into its service-role-only delta.

## Create and test the identities

Apply all migrations to a dedicated staging Supabase project, populate `.env.demo` outside Git, then run:

```bash
npm run demo:seed
npm run demo:verify
npm run demo:access
```

The exact login names and role journeys are in `DEMO-CLIENT-TEST-PLAYBOOK.md`. Every identity uses the private `DEMO_PASSWORD` selected by the staging operator. No password or service-role key is committed or printed.

## Security boundary

Platform operators can see service totals and customer account/subscription metadata required to operate a SaaS. They cannot query customer food-safety records, documents, staff health data or other tenant evidence through normal tables. Customer-support access remains a future explicit workflow requiring approval, purpose, expiry and audit; hidden impersonation is deliberately absent.

## Still required before public launch

1. Apply this branch to a fresh and production-like staging project and pass both pgTAP files.
2. Run the three demo commands with the staging service/publishable keys and retain the output.
3. Deploy the exact commit to a protected demo URL and manually complete every role journey on web, iOS and Android.
4. Configure production Auth, storage, providers, scheduled dispatchers, monitoring, backup/PITR and restore evidence.
5. Complete legal/privacy, qualified UK food-safety, accessibility/device and independent penetration-test approvals.
6. Produce signed TestFlight and Play internal-test builds, then complete store declarations and review.

Haccora remains a compliance-recording tool; this phase does not create or imply FSA, FSS or local-authority approval.
