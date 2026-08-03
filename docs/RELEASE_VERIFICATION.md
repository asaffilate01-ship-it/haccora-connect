# Release verification record

Verified: 2026-08-02

## Source checks completed

| Gate                        | Result                                                         |
| --------------------------- | -------------------------------------------------------------- |
| Reproducible installs       | Root, native and Edge lockfile installs passed                 |
| Production structure        | Passed                                                         |
| Migration lineage           | Passed for 18 canonical migrations and 195 policy declarations |
| Secret-pattern scan         | Passed; tracked runtime `.env` removed                         |
| Web TypeScript              | Passed                                                         |
| Security regression suite   | 39 of 39 tests passed                                          |
| Web lint                    | Passed with zero warnings                                      |
| Repository formatting       | Passed Prettier verification and `git diff --check`            |
| Cloudflare production build | Passed                                                         |
| Root dependency audit       | 0 known runtime vulnerabilities                                |
| Native TypeScript           | Passed                                                         |
| Native dependency audit     | 0 known runtime vulnerabilities                                |
| Edge Function formatting    | Passed with Deno 2.9.4                                         |
| Edge Function lint          | Passed with Deno 2.9.4                                         |
| Edge Function type check    | Passed for all 14 deployable functions                         |
| Edge dependency audit       | 0 known runtime vulnerabilities                                |
| Public route smoke check    | `/`, login, legal routes and `/health.json` returned HTTP 200  |
| Browser accessibility       | Playwright/Axe gate configured; hosted run still required      |
| Fresh database and RLS      | Supabase/pgTAP gate configured; hosted run still required      |
| GitHub security automation  | CodeQL workflow configured; GitHub-hosted run still required   |

## Known source advisory

The web build reports a 625.83 kB minified initial client chunk (184.36 kB gzip) and an ineffective dynamic import of the shared Supabase client. This is a performance follow-up, not a build or security failure, but route/vendor splitting should be measured before a high-traffic launch.

## What this record does not certify

The local workspace has no Docker runtime and its Playwright browser download was blocked by a gateway certificate-date error. The committed fresh-database and browser suites therefore must pass on GitHub before merge. Migrations have not been reconciled with the real Supabase ledger. Native source has been type-checked but has not been signed, installed on the final device matrix or submitted to Apple and Google. This record also does not replace penetration testing, manual accessibility/device testing, restore testing, legal/privacy review or food-safety specialist validation.

Use the acceptance tests in `PRODUCTION_READINESS.md` and the deployment order in `DEPLOYMENT.md` before production traffic.
