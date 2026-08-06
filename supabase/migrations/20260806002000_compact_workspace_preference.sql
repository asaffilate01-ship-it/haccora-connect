-- Phase 11: persist a compact operational workspace density per user.
ALTER TABLE public.user_experience_preferences
  ADD COLUMN IF NOT EXISTS compact_mode boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_experience_preferences.compact_mode IS
  'Reduces operational typography and spacing without reducing touch targets.';
