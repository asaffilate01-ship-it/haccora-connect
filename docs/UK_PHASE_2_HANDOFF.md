# Haccora UK Phase 2 handoff

Phase 2 repairs the release pipeline regression introduced by the schema installation and wires the UK compliance foundation into customer workflows.

## Delivered

- Declared every deployable Supabase Edge Function in `supabase/config.toml`.
- Re-formatted generated Supabase clients so the mandatory CI lint gate passes.
- Added a site-level UK compliance profile for nation, business type, PPDS and vulnerable-group risks.
- Added ingredient specifications, UK 14-allergen selection, recipe attachment and versioned PPDS label generation with source snapshots.
- Converted public metadata and active operational wording away from Germany-specific positioning.
- Made the legal runtime UK-only and replaced prominent German legal references with UK GDPR, Data Protection Act and PECR framing. Legal counsel approval remains mandatory.
- Added a forward migration changing organization and location defaults from Europe/Berlin to Europe/London.
- Added regression tests for Edge Function declarations, UK routes, London defaults and public metadata.

## Verified

- Root clean quality pipeline, production worker build and 65 automated tests.
- Mobile TypeScript validation.
- Expo export for web, iOS and Android.

## Remaining external gates

- Apply all migrations to fresh staging and run pgTAP/RLS tests in GitHub Actions.
- Configure production credentials, malware scanner, Stripe products/webhooks, Resend, Cloudflare and monitoring.
- Obtain UK food-safety specialist and legal approvals.
- Finish EAS project initialization, signing and store submissions.
- Run representative UK-business pilots and disaster-recovery exercises.
