# Phase 48 — launch recovery and credential containment

Date: 16 August 2026
Baseline: `main` at `cb7903b38e8e09aa5f39552cb97c64146aafc447`

## Outcome

This phase contains the fixed-password platform identities added directly to
`main`, repairs the false-positive authentication readiness result observed on
the hosted release, and restores a fail-closed release path before production
authentication is enabled.

## Delivered

- Revokes both embedded demo platform operators, deletes their sessions,
  refresh tokens and identities, bans the accounts and replaces their password
  hashes with independent random values.
- Preserves the published migration ledger instead of rewriting applied SQL.
- Pins the exact historic migration digest and rejects any new production
  migration that provisions a database password.
- Makes the public Supabase client and SSR agree on the browser-embedded
  `VITE_*` configuration, preventing misleading login UI and hydration drift.
- Makes `/readiness.json` report the browser configuration customers actually
  receive rather than falling back to server-only aliases.
- Adds an always-on deployed browser-authentication probe to scheduled uptime
  monitoring and binds it into protected release evidence.
- Restores the formatting gate that Lovable bypassed after Phase 47.

## Mandatory deployment order

1. Apply `20260816170000_revoke_embedded_demo_platform_accounts.sql` to every
   linked environment before enabling browser authentication.
2. Confirm the two fixed UUIDs have revoked operator status and no auth identity
   or active session.
3. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the web
   build environment, then build and deploy this exact commit.
4. Configure GitHub `PRODUCTION_URL`, `PRODUCTION_RELEASE_SHA`, `SUPABASE_URL`
   and `SUPABASE_PUBLISHABLE_KEY`, and keep `PRODUCTION_PUBLIC_LAUNCH` false
   until health, server auth, client auth and full readiness are green.
5. Run hosted role, tenant-isolation and support-note isolation tests using
   separately created accounts. Never recreate production identities through a
   source-controlled migration.

## External launch controls

The company identity, legal/ICO approval, custom domains, independent status
monitoring, provider credentials, backup/restore evidence, penetration test,
support staffing and signed mobile-store releases still require accountable
owners and protected provider accounts. The source continues to fail closed
until those controls are supplied and evidenced.
