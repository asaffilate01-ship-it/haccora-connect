# Haccora roadmap

## Done

- [x] Migration ledger drift investigated — remote schema contains every object the "missing" local migrations create; drift is cosmetic (Lovable records its own version rows). No replay required.
- [x] `haccora-production-completion-20260830.zip` verified — all 6 files already present and identical.
- [x] Quality gate green (246 tests, lint/typecheck clean).

- [x] Built-in payments wired: catalogue (Food Cart £9.99, Complete £24.99, Group £59.99 GBP/month), embedded checkout, billing portal, and signed webhook at `/api/public/payments/webhook` driving the existing tenant entitlement/grace/credit-control state machine.

## In progress

- [ ] Complete payments go-live (claim account, verification) before real cards can be charged.

## Owner actions (cannot be done from Lovable)

- [ ] GitHub Actions: confirm variables `SUPABASE_URL`, `PRODUCTION_SUPABASE_PROJECT_REF`; secrets `CRON_SECRET` (must match the Supabase secret), `SUPABASE_ACCESS_TOKEN`, `PRODUCTION_SUPABASE_DB_PASSWORD`.
- [ ] Run **Production scheduled dispatch** workflow once.
- [ ] Run **Deploy production Supabase** workflow, entering `dbjbhemmtdkzulsxfvmi`.
- [ ] Add outstanding credentials: Resend, Expo/EAS, VAPID, VirusTotal, Dokuvera storage origin.
- [ ] Test genuine failed-payment/recovery, provider delivery, and authenticated physical-device mobile journeys.
