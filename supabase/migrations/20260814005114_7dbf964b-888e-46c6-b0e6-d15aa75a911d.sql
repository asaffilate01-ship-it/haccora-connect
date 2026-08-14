CREATE TABLE public.fsa_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fhrs_id text NOT NULL UNIQUE,
  business_name text NOT NULL,
  business_type text,
  business_type_id integer,
  address_line_1 text,
  address_line_2 text,
  address_line_3 text,
  address_line_4 text,
  postcode text,
  local_authority text,
  latitude numeric,
  longitude numeric,
  rating_value text,
  rating_date date,
  new_rating_pending boolean NOT NULL DEFAULT false,
  awaiting_inspection boolean NOT NULL DEFAULT false,
  score_hygiene integer,
  score_structural integer,
  score_confidence integer,
  outreach_status text NOT NULL DEFAULT 'new',
  legal_entity_type text NOT NULL DEFAULT 'unknown',
  email_marketing_permitted boolean NOT NULL DEFAULT false,
  tps_checked_at timestamptz,
  website text,
  phone text,
  contact_email text,
  contact_name text,
  notes text,
  assigned_to uuid,
  last_contacted_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fsa_prospects_outreach_status_check CHECK (outreach_status IN ('new','queued','contacted','replied','qualified','won','lost','suppressed')),
  CONSTRAINT fsa_prospects_legal_entity_type_check CHECK (legal_entity_type IN ('unknown','limited_company','llp','sole_trader','partnership','public_body'))
);

CREATE INDEX fsa_prospects_authority_idx ON public.fsa_prospects (local_authority);
CREATE INDEX fsa_prospects_status_idx ON public.fsa_prospects (outreach_status);
CREATE INDEX fsa_prospects_rating_idx ON public.fsa_prospects (rating_value);

CREATE TABLE public.fsa_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_authority text,
  business_type_id integer,
  fetched_count integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'succeeded',
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  started_by uuid,
  CONSTRAINT fsa_sync_runs_status_check CHECK (status IN ('running','succeeded','failed'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fsa_prospects TO authenticated;
GRANT ALL ON public.fsa_prospects TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.fsa_sync_runs TO authenticated;
GRANT ALL ON public.fsa_sync_runs TO service_role;

ALTER TABLE public.fsa_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fsa_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY fsa_prospects_operator_read ON public.fsa_prospects
  FOR SELECT TO authenticated
  USING (public.is_platform_operator(auth.uid(), NULL));

CREATE POLICY fsa_prospects_operator_insert ON public.fsa_prospects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_operator(auth.uid(), array['platform_owner'::public.platform_operator_role,'platform_support'::public.platform_operator_role]));

CREATE POLICY fsa_prospects_operator_update ON public.fsa_prospects
  FOR UPDATE TO authenticated
  USING (public.is_platform_operator(auth.uid(), array['platform_owner'::public.platform_operator_role,'platform_support'::public.platform_operator_role]))
  WITH CHECK (public.is_platform_operator(auth.uid(), array['platform_owner'::public.platform_operator_role,'platform_support'::public.platform_operator_role]));

CREATE POLICY fsa_prospects_operator_delete ON public.fsa_prospects
  FOR DELETE TO authenticated
  USING (public.is_platform_operator(auth.uid(), array['platform_owner'::public.platform_operator_role]));

CREATE POLICY fsa_sync_runs_operator_read ON public.fsa_sync_runs
  FOR SELECT TO authenticated
  USING (public.is_platform_operator(auth.uid(), NULL));

CREATE POLICY fsa_sync_runs_operator_insert ON public.fsa_sync_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_operator(auth.uid(), array['platform_owner'::public.platform_operator_role,'platform_support'::public.platform_operator_role]));

CREATE POLICY fsa_sync_runs_operator_update ON public.fsa_sync_runs
  FOR UPDATE TO authenticated
  USING (public.is_platform_operator(auth.uid(), array['platform_owner'::public.platform_operator_role,'platform_support'::public.platform_operator_role]))
  WITH CHECK (public.is_platform_operator(auth.uid(), array['platform_owner'::public.platform_operator_role,'platform_support'::public.platform_operator_role]));

CREATE TRIGGER fsa_prospects_touch_updated_at
  BEFORE UPDATE ON public.fsa_prospects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();