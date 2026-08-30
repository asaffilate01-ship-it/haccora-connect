# Haccora roadmap

## Done
- [x] Migration ledger drift investigated — remote schema contains every object the "missing" local migrations create; drift is cosmetic (Lovable records its own version rows). No replay required.
- [x] `haccora-production-completion-20260830.zip` verified — all 6 files already present and identical.
- [x] Quality gate green (246 tests, lint/typecheck clean).

## In progress
- [ ] Add payments via Lovable built-in Stripe (user chose built-in over bring-your-own-key).

## Owner actions (cannot be done from Lovable)
- [ ] GitHub Actions: confirm variables `SUPABASE_URL`, `PRODUCTION_SUPABASE_PROJECT_REF`; secrets `CRON_SECRET` (must match the Supabase secret), `SUPABASE_ACCESS_TOKEN`, `PRODUCTION_SUPABASE_DB_PASSWORD`.
- [ ] Run **Production scheduled dispatch** workflow once.
- [ ] Run **Deploy production Supabase** workflow, entering `dbjbhemmtdkzulsxfvmi`.
- [ ] Add outstanding credentials: Resend, Expo/EAS, VAPID, VirusTotal, Dokuvera storage origin.
- [ ] Test genuine failed-payment/recovery, provider delivery, and authenticated physical-device mobile journeys.
