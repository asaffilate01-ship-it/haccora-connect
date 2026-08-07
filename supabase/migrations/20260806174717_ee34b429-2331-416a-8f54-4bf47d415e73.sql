-- Reconciled duplicate: Phase 20 is defined by
-- 20260806008000_qr_asset_history.sql.
-- Retain only the later service-role grant introduced at this timestamp.
GRANT ALL ON public.asset_events TO service_role;
