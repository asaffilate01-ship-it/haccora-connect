-- Phase 9: persistent reminder preferences and staff-linked compliance documents.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS start_of_day_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS issue_alerts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS expiry_alerts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS start_of_day_local_time time NOT NULL DEFAULT '08:00';

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS subject_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_kind text,
  ADD COLUMN IF NOT EXISTS issued_on date;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_kind_length;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_kind_length
  CHECK (document_kind IS NULL OR char_length(document_kind) BETWEEN 2 AND 80);

CREATE INDEX IF NOT EXISTS documents_expiry_active_idx
  ON public.documents (organization_id, expires_at)
  WHERE archived_at IS NULL AND expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS training_certificate_expiry_idx
  ON public.training_records (organization_id, certificate_valid_to)
  WHERE certificate_valid_to IS NOT NULL;

ALTER TABLE public.device_push_tokens
  DROP CONSTRAINT IF EXISTS device_push_tokens_token_check;
ALTER TABLE public.device_push_tokens
  ADD CONSTRAINT device_push_tokens_token_check
  CHECK (char_length(token) BETWEEN 20 AND 4096);

CREATE OR REPLACE FUNCTION public.set_my_notification_schedule(
  p_start_of_day_enabled boolean DEFAULT NULL,
  p_issue_alerts_enabled boolean DEFAULT NULL,
  p_expiry_alerts_enabled boolean DEFAULT NULL,
  p_start_of_day_local_time time DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org_id uuid := public.current_organization_id();
BEGIN
  IF auth.uid() IS NULL OR v_org_id IS NULL OR NOT public.can_read_organization(v_org_id) THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  INSERT INTO public.notification_preferences (
    user_id, organization_id, start_of_day_enabled, issue_alerts_enabled,
    expiry_alerts_enabled, start_of_day_local_time
  ) VALUES (
    auth.uid(), v_org_id, COALESCE(p_start_of_day_enabled, true),
    COALESCE(p_issue_alerts_enabled, true), COALESCE(p_expiry_alerts_enabled, true),
    COALESCE(p_start_of_day_local_time, '08:00'::time)
  )
  ON CONFLICT (user_id, organization_id) DO UPDATE SET
    start_of_day_enabled = COALESCE(p_start_of_day_enabled, notification_preferences.start_of_day_enabled),
    issue_alerts_enabled = COALESCE(p_issue_alerts_enabled, notification_preferences.issue_alerts_enabled),
    expiry_alerts_enabled = COALESCE(p_expiry_alerts_enabled, notification_preferences.expiry_alerts_enabled),
    start_of_day_local_time = COALESCE(p_start_of_day_local_time, notification_preferences.start_of_day_local_time),
    updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.set_my_notification_schedule(boolean,boolean,boolean,time) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_notification_schedule(boolean,boolean,boolean,time) TO authenticated;

COMMENT ON COLUMN public.documents.subject_user_id IS
  'Optional staff member whose training or compliance evidence this document represents.';
