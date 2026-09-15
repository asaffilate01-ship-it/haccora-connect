-- Add-on enquiries are tenant support cases, not purchases or data-sharing grants.
ALTER TABLE public.support_cases ADD COLUMN business_service text;
ALTER TABLE public.support_cases ADD CONSTRAINT support_cases_business_service_check
  CHECK (business_service IN ('veyumo','omni-intelligence','taxnuvia','xpertjobs','suppliers','dishbee','eventplanr','craftvaro','insure360','omni-comms','zoryn-rewards','training'));
CREATE UNIQUE INDEX support_cases_one_open_business_service
  ON public.support_cases (organization_id, business_service)
  WHERE business_service IS NOT NULL AND status IN ('open','in_progress','pending_customer');

CREATE OR REPLACE FUNCTION public.request_business_service(
  p_service text, p_message text, p_contact_consent boolean, p_bundle_quote boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid := public.current_organization_id();
  v_id uuid;
  v_name text;
BEGIN
  IF auth.uid() IS NULL OR v_org IS NULL OR NOT public.has_org_role(v_org, ARRAY['owner']::public.app_role[]) THEN
    RAISE EXCEPTION 'business_owner_required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_org AND service_status = 'active' AND access_approved_at IS NOT NULL) THEN
    RAISE EXCEPTION 'active_organization_required' USING ERRCODE = '42501';
  END IF;
  IF p_contact_consent IS DISTINCT FROM true THEN RAISE EXCEPTION 'contact_consent_required'; END IF;
  IF char_length(btrim(COALESCE(p_message, ''))) NOT BETWEEN 10 AND 3000 THEN RAISE EXCEPTION 'invalid_service_message'; END IF;
  v_name := CASE p_service
    WHEN 'veyumo' THEN 'Veyumo'
    WHEN 'omni-intelligence' THEN 'Omniqora Intelligence'
    WHEN 'taxnuvia' THEN 'TaxNuvia'
    WHEN 'xpertjobs' THEN 'XpertJobs'
    WHEN 'suppliers' THEN 'Suppliers & Zarvane Foods'
    WHEN 'dishbee' THEN 'Dishbee'
    WHEN 'eventplanr' THEN 'EventPlanr'
    WHEN 'craftvaro' THEN 'Craftvaro'
    WHEN 'insure360' THEN 'Insure360'
    WHEN 'omni-comms' THEN 'Omniqora Communications'
    WHEN 'zoryn-rewards' THEN 'Zoryn Rewards'
    WHEN 'training' THEN 'Staff training'
  END;
  IF v_name IS NULL THEN RAISE EXCEPTION 'unknown_business_service'; END IF;
  -- Serialise retries and concurrent clicks for the same workspace and service.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_org::text || ':' || p_service, 0));
  SELECT id INTO v_id FROM public.support_cases
    WHERE organization_id = v_org AND business_service = p_service
      AND status IN ('open','in_progress','pending_customer');
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  v_id := public.create_support_case('account', 'Business service: ' || v_name,
    btrim(p_message) || E'\n\nContact consent: Haccora may review and respond to this service enquiry (v1).'
    || E'\nIntroduction and external data connection require separate agreement.'
    || E'\nInclude available multi-service offers: ' || CASE WHEN p_bundle_quote THEN 'yes' ELSE 'no' END,
    'normal');
  UPDATE public.support_cases SET business_service = p_service WHERE id = v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_business_service_requests()
RETURNS TABLE (id uuid, case_number bigint, business_service text, status text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid := public.current_organization_id();
BEGIN
  IF auth.uid() IS NULL OR v_org IS NULL OR NOT public.has_org_role(v_org, ARRAY['owner']::public.app_role[]) THEN
    RAISE EXCEPTION 'business_owner_required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT c.id, c.case_number, c.business_service, c.status, c.created_at
    FROM public.support_cases c WHERE c.organization_id = v_org AND c.business_service IS NOT NULL
    ORDER BY c.created_at DESC LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.request_business_service(text,text,boolean,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_business_service_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_business_service(text,text,boolean,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_business_service_requests() TO authenticated;
