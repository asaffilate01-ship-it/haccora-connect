# Shared core and tenant onboarding contract

Status: Haccora reference implementation, 27 September 2026. Portfolio adoption is tracked below; this document does not assert that every SaaS has been converted or that production acceptance has passed.

## Operating model

Maintain one product core per SaaS. Tenants are configuration and isolated data within that product, not repositories or copied applications. Every implemented function belongs to the maintained core; the tenant's role, plan, entitlement and provider readiness determine whether it can be used. A plan selection or cross-sell request is never proof of payment or an active provider connection.

The normal path is **save setup → verify owner → approve tenant → complete selected provider connections → pass launch acceptance**. Starting an approved trial and declaring production ready are separate decisions. New Haccora tenants receive the existing trial catalogue, 60 days from approval; a recorded future paid plan does not unlock that plan. Paid conversion continues through the existing billing flow and authorised commercial administration.

## Haccora implementation

The Customers section of `/platform` contains the shared-core setup panel. A platform owner must complete MFA before reading or changing drafts. Save the business name, stable workspace slug, owner email, premises address, intended future plan and service interests. Edits use a revision number so two operators cannot silently overwrite one another.

The optional owner invitation only creates authentication access. An existing verified owner can be used directly. Approval rechecks the current saved revision, verified and non-banned owner account, active trial catalogue and approval reason in PostgreSQL. Organization, subscription, premises, membership, default profile selection and audit event commit in one transaction. The setup ID provides idempotency; a repeated approval returns the same organization. Failures leave no partially provisioned tenant. Existing tenants are not re-provisioned or modified by this migration.

`platform_tenant_setups` has RLS, no direct authenticated writes, and an owner-only policy for that owner's launched configuration. Platform management uses audited, MFA-protected RPCs. Tenants cannot enumerate drafts, choose another tenant's context or grant themselves services. Existing operational tables retain their current RLS and membership rules. The new pgTAP suite tests permissions, tenant separation, stale revisions, retries, unverified owner prerequisites and transactional rollback.

Core code, plan catalogue and tenant setup are distinct:

| Concern                       | Authority                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| Shared functions and fixes    | Reviewed product repository and shared application deployment                           |
| Tenant identity and premises  | Organizations, locations and memberships                                                |
| Plan and seat/location limits | Subscription and platform plan catalogue                                                |
| Paid add-ons                  | Existing subscription entitlement and provider checks                                   |
| Cross-sell interests          | Setup interests and owner-consented business service requests                           |
| Provider secrets              | Server-side secret management; never setup JSON, browser fields or Git                  |
| Production readiness          | Existing release, database, provider, payment and role-persistence acceptance workflows |

Service interests cover Veyumo, Omniqora Intelligence/Communications, accountants, recruitment, suppliers, Dishbee, events, repairs, Insure360, rewards and training. Interest does not share customer data, send a provider lead, create a subscription or enable an integration. The tenant owner uses the existing consented business-service flow when requesting an introduction. Secrets and provider onboarding continue in their existing secured integration flows.

## Core updates reach every tenant

Haccora uses one shared web deployment and database migration stream. The running commit is displayed in the setup panel from the build's embedded release SHA. Deploying a reviewed core change updates every tenant served by that deployment. Configuration and tenant records are not copied or replaced during deployment. Native applications still need their normal signed store release; a web deployment does not update installed native binaries.

Use forward migrations and compatible API changes. Run fresh database/RLS tests and all release gates, apply migrations and Edge Functions before a web build that calls new RPCs, then verify the deployed commit and real provider flows. Roll back application code only when the forward schema remains compatible. Do not delete or rewrite applied migrations.

The current shared deployment does not provide independent per-tenant code-version pinning. A future canary must use real routed deployments or server-enforced feature rollout rules; a `version` field by itself cannot isolate an old runtime. Emergency core security fixes should reach the complete eligible product fleet through the same pipeline.

## Portfolio adapter standard

Each SaaS maps the same lifecycle to its own domain model, database and billing system. Do not combine unrelated products into a single ungoverned schema or import tenant evidence between products.

| Product                                                 | Reviewed source                                                                 | Adoption state / required mapping                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Haccora                                                 | `haccora-connect`                                                               | Reference implementation in this change; production migration, Edge deployment and acceptance still required                                                                                                                                                         |
| Dishbee                                                 | `dishbee-helper`, main `86f7d3a`                                                | Existing landlord bootstrap, encrypted connection secrets, onboarding and publish gate; align with this contract and prove fresh RLS/acceptance before import. Cafe1 Luton and St Albans remain separate franchise tenants. Cafe repositories are migration sources. |
| Omniqora                                                | `seamless-comms-suite`, main `efbafc2`                                          | Existing authenticated tenant creation; needs platform provisioning adapter and acceptance evidence. Preserve SaaS → tenant → location number/account routing, individual WhatsApp numbers, AI/RAG boundaries and scoped signed webhooks.                            |
| Zivvo / SparesGrid / Care Academy / driving instructors | Cross-thread requirements recovered; implementations not audited in this change | Adopt the lifecycle with their own domain configuration, plan limits and isolation tests; do not claim conversion complete.                                                                                                                                          |

An adapter must supply: immutable tenant identity; validated product-specific configuration; an authenticated provisioning transaction; verified owner binding; plan and capacity authority; per-provider credential references; a server-computed readiness result; an auditable activation operation; idempotent retries; and an observable product deployment identity. Branding, domains and layout options must be validated against capabilities actually implemented in that product. Custom domains require verified ownership and server-side tenant binding; a hostname or client tenant ID never authorises access.

Isolation acceptance must exercise two real tenants across database reads/writes, object storage, exports, jobs, signed provider webhooks, caches, billing identifiers, AI/RAG stores and restore procedures. Cross-product services use scoped APIs and explicit customer consent. Brand-owned tenants obey the same controls as external tenants.

## Deployment and launch checklist

1. Apply `20260927090000_shared_core_tenant_setup.sql` through the existing Supabase release workflow, preserving migration history.
2. Deploy `platform-admin` and the web build together. The old `create_tenant` payload is intentionally rejected; an outdated browser must refresh. Existing tenants and billing APIs retain their contracts.
3. Confirm fresh database/pgTAP, web quality, Edge checks, native typecheck/export and browser gates on the exact release commit.
4. In staging, save two setups, verify owners, approve one twice and verify one tenant per setup; attempt cross-tenant data access and confirm denial. No production invitations are sent by source validation.
5. Complete the existing production configuration, scheduled-job, payment lifecycle, role persistence, legal and accountable launch acceptance checks. An HTTP 200, configuration flag or approved trial does not prove those checks passed.

Tenant logos, custom-domain provisioning, per-tenant canary routing, automated cross-product purchases and a portfolio-wide control plane are not implemented by this change. These need product adapters and actual provider evidence before they can be advertised as available.
