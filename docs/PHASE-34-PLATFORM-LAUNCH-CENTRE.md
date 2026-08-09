# Phase 34 — platform launch centre and step-up security

Phase 34 turns the SaaS-owner control plane into an operational launch surface. It does not claim
that Haccora is approved, certified or production-ready merely because configuration values exist.

## Built in this phase

- A protected `platform-readiness` Edge Function for SaaS owners and platform auditors.
- Aggregate liveness for the four scheduled jobs and dead-letter totals for notifications, file
  scanning and outbound webhooks. No tenant records, provider credentials or secret values are
  returned.
- Presence checks for application/CORS, email, push, malware scanning, live Stripe billing,
  schedulers, monitoring, encrypted integrations and the private UK legal approval record.
- A responsive Launch Centre in `/platform` combining server signals with public statutory,
  support, status, browser-push and legal-publication state.
- In-place TOTP enrolment and step-up for the SaaS owner. Tenant lifecycle, subscription and SaaS
  staff changes are disabled in the interface below AAL2.
- Database triggers that independently reject authenticated platform-operator changes to tenants,
  subscriptions and platform operators below AAL2. Service-role billing, provisioning and recovery
  remain distinct governed paths; the `platform-admin` function also requires AAL2 before using its
  service client.
- Immutable `platform_launch_readiness_viewed` audit events containing only aggregate status.
- Production release wiring for the current Solo, Complete and Group Stripe prices. The retired
  `STRIPE_PRICE_PRO` workflow variable has been removed.

## Deployment order

1. Apply `20260809230000_platform_step_up_security.sql` to an isolated staging project.
2. Deploy `platform-readiness` and the updated `platform-admin` function.
3. Add the already documented provider and legal approval values to the Supabase Edge Function
   secret store. Never add secret values to Git.
4. Sign in as the seeded SaaS owner, enrol TOTP, sign in or step up to AAL2, and exercise every
   governed platform mutation.
5. Confirm a platform-support user cannot load launch telemetry or mutate tenants, an auditor can
   read it but cannot mutate, and an owner at AAL1 is rejected by both RPC and Edge paths.
6. Trigger all four dispatchers, then confirm the Launch Centre reflects fresh heartbeats and zero
   dead letters.

## What still requires people and deployed systems

`Configured` means only that required values are present. A production decision still requires the
protected release workflow and evidence for live billing/email/push/scanning, a clean hosted
migration rehearsal, cross-tenant isolation, restore and incident drills, independent security and
accessibility testing, Haccora Ltd statutory details, UK legal/privacy and qualified food-safety
review, signed TestFlight/Play candidates, representative device tests and a controlled UK pilot.
