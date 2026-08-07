-- Reconciled duplicate: Phase 22 is defined by
-- 20260807110000_asset_check_schedules_and_rls.sql.
-- Retain only the later service-role grant introduced at this timestamp.
grant all on public.asset_check_schedules to service_role;
