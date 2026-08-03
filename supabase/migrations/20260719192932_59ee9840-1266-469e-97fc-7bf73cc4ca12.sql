ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_alerts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_alerts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS weekly_digest boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vertical text,
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS location_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS business_state text,
  ADD COLUMN IF NOT EXISTS vat_id text,
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;