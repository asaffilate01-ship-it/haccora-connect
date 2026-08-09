# Release verification record

Verified: 2026-08-09

## Source checks completed

| Gate                        | Result                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| Reproducible installs       | Root, native and Edge lockfile installs passed                      |
| Production structure        | Passed                                                              |
| Migration lineage           | Passed for 56 migrations, 265 policies and 114 function definitions |
| Secret-pattern scan         | Passed across every tracked source file                             |
| Web TypeScript              | Passed                                                              |
| Security regression suite   | 150 of 150 tests passed                                             |
| Web lint                    | Passed with zero warnings                                           |
| Repository formatting       | Passed Prettier verification and `git diff --check`                 |
| Cloudflare production build | Passed                                                              |
| Root dependency audit       | 0 known runtime vulnerabilities                                     |
| Native TypeScript           | Passed                                                              |
| Native dependency audit     | Only two exact, expiring Expo/Metro build-tool exceptions           |
| Edge Function formatting    | Passed with Deno 2.9.4                                              |
| Edge Function lint          | Passed with Deno 2.9.4                                              |
| Edge Function type check    | Passed for all 16 deployable functions with Deno 2.9.4              |
| Edge dependency audit       | 0 known runtime vulnerabilities                                     |
| Public route smoke check    | `/`, login, legal routes and `/health.json` returned HTTP 200       |
| Browser accessibility       | Playwright/Axe gate configured; hosted run still required           |
| Fresh database and RLS      | Supabase/pgTAP gate configured; hosted run still required           |
| GitHub security automation  | CodeQL workflow configured; GitHub-hosted run still required        |

## Known source advisory

Root and Edge production dependency audits report zero findings. Expo/Metro currently resolves two `image-size` build-tool advisories for which npm offers no non-breaking Expo 57 fix. The exact exceptions expire on 30 September 2026, and Phase 27 requires security risk-acceptance evidence before production while either remains active. The production web build passes the 500 KiB per-chunk budget.

## What this record does not certify

The local workspace has no Docker runtime or installed Playwright Chromium binary. The committed fresh-database and browser suites therefore must pass on GitHub before merge. Migrations have not been reconciled with the real Supabase ledger. Native source has been type-checked and exported for web, iOS and Android but has not been signed, installed on the final device matrix or submitted to Apple and Google. The real EAS project UUID is still required. This record also does not replace penetration testing, manual accessibility/device testing, restore testing, legal/privacy review or qualified food-safety validation. Phase 27 makes all of those private results mandatory inputs to the protected production release workflow.

Use the acceptance tests in `PRODUCTION_READINESS.md` and the deployment order in `DEPLOYMENT.md` before production traffic.
