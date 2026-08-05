-- Persist the competent local authority and registration context for each UK site.
-- This is user-provided operational metadata; Haccora does not claim authority verification.

ALTER TABLE public.site_compliance_profiles
  ADD COLUMN IF NOT EXISTS local_authority_name text,
  ADD COLUMN IF NOT EXISTS registration_reference text,
  ADD COLUMN IF NOT EXISTS registration_confirmed_at date;

COMMENT ON COLUMN public.site_compliance_profiles.local_authority_name IS
  'Council, local authority or Northern Ireland district council responsible for the site.';
COMMENT ON COLUMN public.site_compliance_profiles.registration_reference IS
  'Optional customer reference for its food-business registration evidence.';

ALTER TABLE public.site_compliance_profiles
  DROP CONSTRAINT IF EXISTS site_compliance_profiles_local_authority_length;
ALTER TABLE public.site_compliance_profiles
  ADD CONSTRAINT site_compliance_profiles_local_authority_length
  CHECK (local_authority_name IS NULL OR char_length(local_authority_name) BETWEEN 2 AND 160);

-- Replace the original Germany-specific briefing code while preserving existing records.
ALTER TABLE public.health_register DROP CONSTRAINT IF EXISTS health_register_kind_check;
UPDATE public.health_register SET kind = 'fitness_briefing' WHERE kind = 'ifsg43';
ALTER TABLE public.health_register ALTER COLUMN kind SET DEFAULT 'fitness_briefing';
ALTER TABLE public.health_register
  ADD CONSTRAINT health_register_kind_check
  CHECK (kind IN ('fitness_briefing','refresher','sick_leave','fit_note','exclusion'));
