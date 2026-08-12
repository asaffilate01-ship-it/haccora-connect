# Production launch configuration

Haccora's launch gate intentionally fails closed. It has 42 unique configuration controls. The repository can validate them and can safely generate five Haccora-owned secrets, but it cannot invent a company identity, legal approval or provider credential.

## One local setup flow

Run these commands from the repository root:

```bash
npm run launch:bootstrap
npm run launch:status
```

`launch:bootstrap` creates `.env.launch.local`, which is ignored by Git and restricted to the current operating-system user. It generates five independent random values:

- `CONTACT_HASH_SALT`
- `CRON_SECRET`
- `OPERATIONS_MONITOR_SECRET`
- `INTEGRATION_ENCRYPTION_KEY`
- `WEB_PUSH_GATEWAY_TOKEN`

It never overwrites a non-placeholder value and is safe to run again. It does not configure GitHub, Supabase, Expo, Stripe, Resend or any hosting provider. Copy each value into its documented protected provider environment using the provider dashboard; do not send the file by email or commit it.

Complete the remaining blanks with genuine production values, then run:

```bash
npm run launch:status
npm run launch:report
npm run launch:preflight
```

`launch:status` is a non-blocking, redacted readiness view. `launch:report` writes redacted JSON and Markdown into the ignored `release-evidence/` directory. `launch:preflight` is the fail-closed release gate. None of these commands prints configured values.

## Ownership and storage

| Group                       | Controls | Accountable owner                         | Production source                                                                                             |
| --------------------------- | -------: | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Application and Supabase    |        7 | Engineering / Supabase owner              | GitHub production variables, hosting values and Supabase project                                              |
| Haccora legal identity      |        7 | Haccora Ltd director                      | Verified Companies House and public contact details in GitHub variables                                       |
| Legal and ICO approval      |        4 | Haccora Ltd director / UK counsel         | Approval record, review date and ICO evidence; GitHub production variables contain only the references/status |
| Stripe live billing         |        6 | Finance / Stripe administrator            | Stripe live dashboard; secret values in GitHub and Supabase secrets, price IDs in variables                   |
| Transactional email         |        2 | Operations / Resend administrator         | Resend production account plus verified haccora.co.uk DNS                                                     |
| Document malware scanning   |        2 | Security / scanner administrator          | Scanner provider; endpoint variable and protected token                                                       |
| Browser push gateway        |        3 | Engineering / push administrator          | VAPID public value plus protected gateway URL/token                                                           |
| Haccora operational secrets |        4 | Security / platform operations            | Independently generated GitHub and Supabase secrets                                                           |
| Support and service status  |        2 | Customer operations                       | Published HTTPS support and status services                                                                   |
| Native iOS and Android      |        5 | Mobile release owner / Expo administrator | EAS project, protected Expo token and production runtime values                                               |

The VAT ID and ICO registration number remain optional public fields because Haccora may be outside VAT registration or may document an ICO exemption. The launch gate still requires `LEGAL_ICO_FEE_STATUS_CONFIRMED=true` only after the director has recorded either the registration/fee evidence or a valid exemption. This is an evidence flag, not legal advice.

## Where values go

- Values whose disclosure is safe, such as app URLs, price IDs and Supabase publishable keys, are GitHub production **variables** and deployment environment values.
- Provider credentials, operational secrets and encryption material are GitHub production **secrets** and, where consumed by Edge Functions, Supabase **secrets**.
- Native runtime values are injected by protected EAS/GitHub workflows. Never put a Supabase service-role key or an `sb_secret_` key in an `EXPO_PUBLIC_*` or `VITE_*` value.
- `.env.launch.local` is a local checklist only. Delete it securely from a shared device after configuration is transferred and verified.

The gate rejects Stripe sandbox keys even when `STRIPE_LIVE_MODE=true`; it requires an `sk_live_` or `rk_live_` credential, a `whsec_` webhook signing secret and three `price_` IDs. See Stripe's official [API key](https://docs.stripe.com/keys) and [webhook](https://docs.stripe.com/webhooks) documentation.

## Final verification

The protected `Production release evidence` workflow supplies the same controls from the GitHub production Environment and runs `npm run launch:preflight`. A passing local file is not evidence that provider dashboards or hosted services were configured. The release is eligible only when the protected workflow passes on the exact deployed commit and the separate human launch-acceptance record is complete.
