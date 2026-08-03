# Release candidate V3 — automated launch gates

Base repository commit: `4e49f5cdaa26c0a64a4e623b104dad2f5bab94de`

This phase repairs the three red production-check jobs and adds executable gates for risks that previously had only static source assertions.

## Included

- Synchronized root and Expo dependencies for reproducible CI installs.
- A dedicated Edge Function package manifest matching its lockfile.
- Removal of the tracked runtime `.env` and tracked-file-only secret scanning.
- Safe commercial migration reconciliation that preserves the earlier Lovable migration version.
- A fresh Supabase database workflow with pgTAP tenant-isolation and privilege checks.
- Playwright route, keyboard and automated WCAG A/AA checks.
- A cache-disabled `/health.json` endpoint for external uptime monitoring.

## Release rules

1. Create a branch from the base commit above and use exactly one supplied upload method.
2. Open a normal pull request; do not rewrite Lovable-published history.
3. Require Production checks, Fresh database and RLS checks, and CodeQL before merge.
4. Keep the root `.env` deleted and use provider secret stores for real values.
5. Complete every unchecked external item in `GO_LIVE_CHECKLIST.md`; source automation cannot create accounts, sign apps, approve legal content or certify a live environment.
