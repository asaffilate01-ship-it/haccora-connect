# GitHub production workflow configuration

Never commit credentials, passwords, access tokens or provider secrets. Configure the following values in **Settings → Secrets and variables → Actions**. Repository-level values work for every workflow; production-environment values work for jobs that declare `environment: production`.

## Variables

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `PRODUCTION_SUPABASE_PROJECT_REF`
- `ROLE_ACCEPTANCE_PLATFORM_OWNER_EMAIL`
- `ROLE_ACCEPTANCE_OWNER_EMAIL`
- `ROLE_ACCEPTANCE_MANAGER_EMAIL`
- `ROLE_ACCEPTANCE_CHEF_EMAIL`
- `ROLE_ACCEPTANCE_STAFF_EMAIL`
- `ROLE_ACCEPTANCE_INSPECTOR_EMAIL`
- `ROLE_ACCEPTANCE_ISOLATION_OWNER_EMAIL`

## Secrets

- `SUPABASE_ACCESS_TOKEN`
- `PRODUCTION_SUPABASE_DB_PASSWORD`
- `CRON_SECRET`
- `ROLE_ACCEPTANCE_PASSWORD`

`SUPABASE_URL` and `CRON_SECRET` must remain available at repository level because **Production scheduled dispatch** runs automatically without attaching the protected environment. Dokuvera, Resend and web-push private credentials remain Supabase/Lovable runtime secrets and must not be copied into source control.

## Run order

1. Run **Production workflow configuration preflight**. It checks presence, project identity and designated test-account safety without printing secret values.
2. Run **Deploy production Supabase**, entering `dbjbhemmtdkzulsxfvmi`.
3. Run **Production scheduled dispatch** once and confirm every dispatcher returns a successful HTTP status.
4. Run **Production test-account persistence** with `designated-test-accounts` selected.
5. Run **Production authenticated dashboards** against `https://app.haccora.co.uk` with `designated-test-accounts` selected.
6. Run **Lovable Stripe lifecycle acceptance** only after the controlled tenant has genuinely reached the selected provider-derived payment state.

The acceptance workflows use the publishable Supabase key and authenticated test-user sessions. They do not receive a service-role key.
