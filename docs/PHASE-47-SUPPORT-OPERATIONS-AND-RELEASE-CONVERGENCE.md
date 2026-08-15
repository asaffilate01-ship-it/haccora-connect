# Phase 47 — support operations and release convergence

Date: 16 August 2026
Baseline: `main` at `0c9ec3fd673208747e42d25abdbfd70e8bd8d676`

## Outcome

Haccora now has a tenant-isolated, authenticated product-support workflow instead of relying on a
generic public enquiry for existing customers. Platform owners and support operators can triage,
reply and record internal notes through an AAL2-protected queue. The phase also restores the web,
Edge Function and browser release gates omitted when Phase 46 was copied into `main`.

## Delivered

- Secure customer support cases with human-readable case numbers, categories, impact and status.
- Customer-visible message threads stored with the organisation and protected by row-level security.
- Platform-only internal notes that tenant policies cannot read.
- Platform owner/support triage with MFA step-up, assignment, response timing and immutable audit metadata.
- A support centre available to every authenticated tenant role and an operator queue linked from the control plane.
- Food-safety and privacy guardrails explaining that support is not an emergency or regulatory channel.
- Current TanStack validator API, generated-route convergence and formatting recovery for hosted CI.

## Security boundary

- Anonymous users have no support-table privileges.
- Authenticated users receive read-only table grants; creation and replies use bounded
  `SECURITY DEFINER` functions that derive identity and organisation from the JWT.
- Tenant users can read only their current organisation's cases and non-internal messages.
- Platform mutations require an active owner/support operator and an `aal2` JWT.
- Audit metadata records identifiers and state changes, never the customer message body.

## Deployment order

1. Apply `20260816030000_support_case_operations.sql` after the Phase 46 enquiry migration.
2. Deploy the updated `platform-admin` Edge Function.
3. Deploy the web bundle from the same release commit.
4. Configure the verified production support URL to the deployed support centre.
5. Test tenant creation, reply, internal-note isolation and platform AAL2 enforcement with separate accounts.

## Still external

This phase does not supply Haccora's statutory company details, accountable legal approval,
independent status monitoring, browser-push public key, live provider credentials, support staffing
or signed mobile-store releases. Those remain fail-closed launch controls until configured and evidenced.
