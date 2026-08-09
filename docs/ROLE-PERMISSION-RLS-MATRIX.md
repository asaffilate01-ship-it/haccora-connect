# Haccora role, permission and RLS matrix

Updated: 9 August 2026

## Platform roles

| Role             | Intended access                                                                   | Explicit exclusions                                                       |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Platform owner   | SaaS financials, plans, tenant provisioning/lifecycle and operator administration | No implicit tenant food-safety evidence access                            |
| Platform support | Tenant/service metadata needed for support and provisioning                       | No platform financials, operator administration or tenant evidence bypass |
| Platform auditor | Read-only platform metrics, financial controls and platform audit history         | No tenant lifecycle mutation or tenant evidence bypass                    |

Platform roles live in `platform_operators`, outside tenant memberships. Every privileged platform RPC checks the authenticated operator role and writes a platform audit event. A platform role never makes `current_organization_id()` return a customer tenant.

## Tenant and inspector roles

| Capability                       |       Owner        |      Manager       |        Chef        |         Staff          |   Inspector   |
| -------------------------------- | :----------------: | :----------------: | :----------------: | :--------------------: | :-----------: |
| Subscription and billing         |       Manage       |         —          |         —          |           —            |       —       |
| Premises, staff and custom roles |       Manage       |   Bounded manage   |         —          |           —            |       —       |
| HACCP plan                       |   Approve/manage   |        Edit        |        Edit        |           —            |  Scoped read  |
| Daily checks and temperatures    |   Record/manage    |   Record/manage    |       Record       |         Record         |  Scoped read  |
| Cleaning schedules               | Configure/complete | Configure/complete | Configure/complete |        Complete        |  Scoped read  |
| Recipes and allergens            |       Manage       |       Manage       |       Manage       |      Lookup only       |  Scoped read  |
| Purchasing and delivery          |  Approve/receive   |  Approve/receive   |      Receive       | Receive where assigned |  Scoped read  |
| Incidents and corrective actions |    Report/close    |    Report/close    |       Report       |         Report         |  Scoped read  |
| Equipment and QR records         |   Manage/record    |   Manage/record    |       Record       |         Record         |  Scoped read  |
| Training, documents and expiry   |       Manage       |       Manage       | Operational access |  Own/assigned access   |  Scoped read  |
| Audit/inspection exports         |        Yes         |        Yes         |     Restricted     |           —            | Scoped export |

Tenant-defined roles are based on manager, chef or staff. Their action list can only remove permissions from the selected built-in role; `save_tenant_role` rejects any attempted escalation. Owners cannot be converted into a custom role, and an organisation cannot lose its last active owner.

## Enforcement layers

1. Navigation permissions remove pages the role cannot use.
2. Action permissions remove sensitive buttons and mutations.
3. Subscription entitlements remove unavailable modules and cap premises, seats and custom roles.
4. PostgreSQL RLS enforces tenant, premises, role and inspector scope independently of the client.
5. Security-definer RPCs re-derive the actor, organisation and protected resource rather than trusting client-supplied tenant identifiers.

Client visibility is never the security boundary. Custom-role policies are restrictive additions to the built-in RLS maximum. Frozen and closed organisations lose operational context, while the status RPC returns only enough information to show the account-status screen.

## Production proof still required

The repository contains pgTAP/RLS fixtures and seeded role journeys, but launch approval requires the protected staging workflow to apply all migrations to an isolated project and sign in as every role. Retain the cross-tenant denial, inspector write-denial, private-storage, realtime, export and restore evidence for the exact release commit.
