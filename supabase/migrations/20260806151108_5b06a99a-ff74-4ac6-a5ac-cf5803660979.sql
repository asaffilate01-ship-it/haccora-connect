-- Reconciled duplicate: Phase 15 is defined by
-- 20260806005000_uk_fitness_to_work_reporting.sql.
-- Retain only the later service-role grant introduced at this timestamp.
GRANT ALL ON public.health_register TO service_role;
