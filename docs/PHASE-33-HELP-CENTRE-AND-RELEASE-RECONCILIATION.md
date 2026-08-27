# Phase 33 — Help Centre and release reconciliation

Updated: 9 August 2026

## Live deployment review

The Lovable deployment now renders the complete public Haccora page instead of the root error boundary. The English `SAFE · CLEAN · TRACEABLE` brand line is present, all twelve public FAQs render, the page has no desktop horizontal overflow and the visible footer uses UK company/legal labels rather than German `Impressum` language.

The login page also sees a configured public Supabase connection: its submit action is enabled and the Phase 32 configuration warning is absent. This confirms only that browser configuration is present. Seeded-role sign-in, platform-owner redirection, database migration state and hosted RLS still require the protected staging rehearsal.

## FAQ and Help Centre

The twelve landing-page FAQs remain the correct scan-friendly public set. They cover endorsement boundaries, digital records, the four UK nations, daily workflows, inspections, device support, offline records, QR evidence, permissions, UK GDPR, setup and subscription exit.

Phase 33 adds a searchable public `/help` route with twenty-one answers grouped into:

1. getting started;
2. daily records and alerts;
3. people, training and permissions;
4. equipment QR labels;
5. inspection and evidence;
6. subscription and data; and
7. devices, security and integrations.

The content keeps the product boundary explicit: Haccora structures evidence but does not replace official guidance, competent advice or the food business's legal responsibility. The footer falls back to the in-app Help Centre until a verified `VITE_SUPPORT_URL` is configured. The Status link stays hidden until a verified `VITE_STATUS_URL` is configured; guessed subdomains are no longer published.

## Migration reconciliation

Lovable published the Phase 32 `get_platform_dashboard()` replacement under `20260809193720` after the packaged `20260809213000` migration had already been added to the repository. Both entries may exist in a hosted migration ledger, so deleting or rewriting either file would be unsafe.

The lineage checker now permits only that exact idempotent function replay and continues to reject every ungoverned identical function definition. The protected staging workflow must compare the repository's 62 timestamps with `supabase migration list` before any production migration action.

## Release controls and verification

The core production-check and CodeQL workflows now support manual dispatch after a Lovable release as well as their push and pull-request triggers.

Verified locally:

- production structure, secret scan, action pins, TypeScript, lint and formatting;
- 62 migrations, 266 policy declarations and 117 function definitions;
- 170 source and security regression tests;
- production web, SSR and Cloudflare builds within the enforced raw/gzip budgets;
- no static chunk cycles; and
- seven built-worker public route smoke checks, including `/help`.

## Remaining launch evidence

Source is not the remaining constraint. Production still requires:

1. an isolated hosted staging migration-ledger and fresh-database rehearsal;
2. seeded sign-in for SaaS owner, tenant owner, manager, chef, staff and inspector, including cross-tenant denial evidence;
3. live Stripe, email, push, malware scanning, scheduler, monitoring, support and status providers;
4. iTechLounge's applicable legal details plus UK legal, privacy, retention, DPA/DPIA and subprocessor approval;
5. qualified food-safety review of the four-nation templates, limits and public claims;
6. independent penetration, tenant-isolation and restore testing;
7. a real EAS project, Apple/Google signing, physical-device and offline testing, TestFlight/Play internal approval; and
8. a representative UK pilot with measured task success, reliability and support outcomes.

No source-only change can honestly mark those external evidence gates complete.
