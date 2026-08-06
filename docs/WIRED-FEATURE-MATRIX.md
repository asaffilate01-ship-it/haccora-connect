# Wired feature and launch-validation matrix

“Wired” means the current client calls a persistent Supabase table, RPC, storage path or Edge Function. It does not mean a third-party service has been configured in a particular deployment.

| Area                            | Current implementation                                                   | Demo proof                                  | Still required before live                         |
| ------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- | -------------------------------------------------- |
| Authentication and tenant roles | Supabase Auth, organisation memberships, owner/manager/staff policies    | Three seeded role accounts                  | MFA/recovery and invitation tests in staging       |
| UK premises context             | GB/Europe-London defaults, UK nations and local-authority profile fields | Camden demonstration premises               | Business review of all four-nation wording         |
| Daily routines                  | Persistent checks and UK routine templates                               | Opening and closing checks                  | Operational template sign-off                      |
| Temperature safety              | Persistent readings, limits, alerts and corrective-action trigger        | Normal fridge plus freezer exception        | Calibrated-probe/device field test                 |
| Goods in                        | Persistent delivery acceptance/rejection evidence                        | Accepted delivery; tester creates rejection | Camera/storage test on devices                     |
| Cleaning                        | Manager-configured schedules and immutable completions                   | Two tasks plus completion                   | Real-site chemical/contact-time sign-off           |
| Allergens and recipes           | Persistent recipe/allergen register and live native lookup               | Two allergen-flagged dishes                 | Ingredient/supplier change workflow drill          |
| Expiry controls                 | Persistent food/doc/training dates and reminder generation               | Near-expiry food, certificate and insurance | Scheduled dispatcher delivery evidence             |
| Staff and training              | Memberships, induction/fitness reporting, certificate metadata/files     | Staff certificate near expiry               | UK GDPR retention/DPIA and access review           |
| Documents                       | Private storage workflow, metadata, expiry and evidence export           | Seeded metadata (no fake file)              | Upload/download/delete and malware-control test    |
| Inspector access                | Scoped, time-limited grant and export functions                          | Owner test journey                          | External-recipient security test                   |
| Offline/native                  | Persistent mobile queue, sync diagnostics and conflict-safe idempotency  | Flight-mode script                          | Real iOS/Android build and sync test               |
| Notifications                   | In-app/push/email/SMS outbox and dispatcher routes                       | Seeded due/exception records                | APNs, FCM, email/SMS credentials and cron evidence |
| Billing                         | Stripe checkout, portal, webhooks and entitlements                       | Stripe test-mode journey                    | Products/prices, tax, webhook and dunning sign-off |
| PWA                             | Manifest, service worker/offline route and installable shell             | Installed-browser test                      | Lighthouse/device acceptance                       |
| Audit/security                  | RLS, audit trails, privacy workflows, secret and migration checks        | Automated suite plus role tests             | Independent penetration test and restore drill     |

## Honest production boundary

The core SaaS workflows are implemented and persist data. “100% production ready” can only be claimed after deployment-specific checks pass: migrations, secrets, storage, scheduled functions, payment webhooks, notification providers, native signing/store review, monitoring, backups/restores, penetration testing, accessibility/device testing and legal/compliance sign-off. The software helps a business keep evidence; no app is automatically “FSA approved,” and the food business remains responsible for suitable controls.
