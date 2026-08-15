ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS enquiry_type text NOT NULL DEFAULT 'general'
    CHECK (enquiry_type IN ('demo', 'migration', 'sales', 'partnership', 'support', 'general')),
  ADD COLUMN IF NOT EXISTS site_count integer
    CHECK (site_count IS NULL OR site_count BETWEEN 1 AND 10000),
  ADD COLUMN IF NOT EXISTS message text
    CHECK (message IS NULL OR char_length(message) BETWEEN 10 AND 2000),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS contact_requests_status_created_idx
  ON public.contact_requests (status, created_at DESC);

DROP TRIGGER IF EXISTS contact_requests_touch_updated_at ON public.contact_requests;
CREATE TRIGGER contact_requests_touch_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

REVOKE ALL ON public.contact_requests FROM anon, authenticated;
GRANT ALL ON public.contact_requests TO service_role;
GRANT SELECT ON public.contact_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.platform_update_contact_request(
  p_request_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_role text;
BEGIN
  SELECT po.role
    INTO actor_role
  FROM public.platform_operators po
  WHERE po.user_id = auth.uid()
    AND po.status = 'active';

  IF actor_role IS DISTINCT FROM 'platform_owner' THEN
    RAISE EXCEPTION 'platform owner role required' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'platform mutation requires MFA step-up' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('new', 'contacted', 'closed', 'spam') THEN
    RAISE EXCEPTION 'invalid contact request status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.contact_requests
  SET status = p_status
  WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'contact request not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.platform_audit_events (actor_id, event_type, metadata)
  VALUES (
    auth.uid(),
    'contact_request_status_changed',
    jsonb_build_object('request_id', p_request_id, 'status', p_status)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_update_contact_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_update_contact_request(uuid, text) TO authenticated;