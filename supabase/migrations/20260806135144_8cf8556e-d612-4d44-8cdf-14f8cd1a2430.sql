-- Reconciled duplicate: Phase 14 is defined by
-- 20260806004000_staff_induction_acknowledgements.sql.
-- Retain only the later service-role grant introduced at this timestamp.
GRANT ALL ON public.staff_induction_assignments TO service_role;
