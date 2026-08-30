# Haccora roadmap

## Done

- [x] Migration ledger drift investigated — remote schema contains every object the "missing" local migrations create; drift is cosmetic (Lovable records its own version rows). No replay required.
- [x] `haccora-production-completion-20260830.zip` verified — all 6 files already present and identical.
- [x] Production CI repaired: web verification, 251 automated tests, lint, typecheck, formatting, Edge checks, native checks, fresh-database RLS and CodeQL are enforced.
- [x] Built-in payments wired: catalogue (Food Cart £9.99, Complete £24.99, Group £59.99 GBP/month), embedded checkout, billing portal, and signed webhook at `/api/public/payments/webhook` driving the existing tenant entitlement/grace/credit-control state machine.
- [x] Lovable-hosted Stripe boundary hardened: payment mode is server-owned, webhook modes must match, return URLs stay on `app.haccora.co.uk`, and private Lovable/Stripe values are verified at runtime without copying them to Supabase or GitHub.

## In progress

- [ ] Complete payments go-live in Lovable: activate the account, publish the three live lookup-key prices, register the canonical webhook and run real failed-payment/recovery acceptance.

## Owner actions

- [ ] GitHub Actions: confirm variables `SUPABASE_URL`, `PRODUCTION_SUPABASE_PROJECT_REF`, `VITE_PAYMENTS_CLIENT_TOKEN`, `PAYMENTS_ENVIRONMENT=live`, `PAYMENTS_RUNTIME_PROVIDER=lovable`, `PAYMENTS_WEBHOOK_URL`; secrets `CRON_SECRET`, `SUPABASE_ACCESS_TOKEN`, `PRODUCTION_SUPABASE_DB_PASSWORD`.
- [ ] Lovable production: keep `STRIPE_LIVE_API_KEY`, `LOVABLE_API_KEY` and `PAYMENTS_LIVE_WEBHOOK_SECRET` there only.
- [ ] Run **Production scheduled dispatch** workflow once.
- [ ] Run **Deploy production Supabase** workflow, entering `dbjbhemmtdkzulsxfvmi`.
- [ ] Add outstanding credentials: Resend, Expo/EAS, VAPID, VirusTotal and Dokuvera storage origin.
- [ ] Test genuine failed-payment/recovery, provider delivery, and authenticated physical-device mobile journeys.
