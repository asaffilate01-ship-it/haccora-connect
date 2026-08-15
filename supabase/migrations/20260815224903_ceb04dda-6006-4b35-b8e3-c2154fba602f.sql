-- Authenticated customer support operations with tenant isolation and governed
-- platform responses. Public website enquiries remain in contact_requests.

BEGIN;

CREATE TABLE public.support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  organization_name text NOT NULL CHECK (char_length(organization_name) BETWEEN 2 AND 160),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reporter_email text NOT NULL CHECK (char_length(reporter_email) BETWEEN 3 AND 254),
  category text NOT NULL CHECK (
    category IN ('technical','billing','account','data_privacy','food_safety_workflow','feedback')
  ),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 5 AND 160),
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open','in_progress','pending_customer','resolved','closed')
  ),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','high','urgent')),
  assigned_operator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_responded_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_case_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.support_cases(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  author_kind text NOT NULL CHECK (author_kind IN ('customer','operator')),
  author_label text NOT NULL CHECK (char_length(author_label) BETWEEN 2 AND 160),
  body text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 4000),
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_cases_org_updated_idx
  ON public.support_cases (organization_id, updated_at DESC);
CREATE INDEX support_cases_status_priority_idx
  ON public.support_cases (status, priority, updated_at DESC);
CREATE INDEX support_case_messages_case_created_idx
  ON public.support_case_messages (case_id, created_at);

CREATE TRIGGER support_cases_touch_updated_at
BEFORE UPDATE ON public.support_cases
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_case_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.support_cases, public.support_case_messages FROM anon, authenticated;
GRANT SELECT ON public.support_cases, public.support_case_messages TO authenticated;
GRANT ALL ON public.support_cases, public.support_case_messages TO service_role;
REVOKE ALL ON SEQUENCE public.support_cases_case_number_seq FROM anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.support_cases_case_number_seq TO service_role;

CREATE POLICY support_cases_tenant_read
ON public.support_cases FOR SELECT TO authenticated
USING (organization_id = public.current_organization_id());

CREATE POLICY support_cases_platform_read
ON public.support_cases FOR SELECT TO authenticated
USING (public.is_platform_operator(auth.uid(), NULL));

CREATE POLICY support_case_messages_tenant_read
ON public.support_case_messages FOR SELECT TO authenticated
USING (
  NOT is_internal
  AND EXISTS (
    SELECT 1 FROM public.support_cases support_case
    WHERE support_case.id = case_id
      AND support_case.organization_id = public.current_organization_id()
  )
);

CREATE POLICY support_case_messages_platform_read
ON public.support_case_messages FOR SELECT TO authenticated
USING (public.is_platform_operator(auth.uid(), NULL));

CREATE OR REPLACE FUNCTION public.create_support_case(
  p_category text,
  p_subject text,
  p_message text,
  p_priority text DEFAULT 'normal'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_organization_id uuid := public.current_organization_id();
  v_organization_name text;
  v_reporter_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
  v_case_id uuid;
BEGIN
  IF v_actor IS NULL OR v_organization_id IS NULL THEN
    RAISE EXCEPTION 'active_organization_required';
  END IF;
  IF p_category NOT IN (
    'technical','billing','account','data_privacy','food_safety_workflow','feedback'
  ) THEN
    RAISE EXCEPTION 'invalid_support_category';
  END IF;
  IF p_priority NOT IN ('normal','high','urgent') THEN
    RAISE EXCEPTION 'invalid_support_priority';
  END IF;
  IF char_length(btrim(COALESCE(p_subject, ''))) NOT BETWEEN 5 AND 160 THEN
    RAISE EXCEPTION 'invalid_support_subject';
  END IF;
  IF char_length(btrim(COALESCE(p_message, ''))) NOT BETWEEN 10 AND 4000 THEN
    RAISE EXCEPTION 'invalid_support_message';
  END IF;
  IF char_length(v_reporter_email) NOT BETWEEN 3 AND 254 THEN
    RAISE EXCEPTION 'verified_email_required';
  END IF;
  IF (
    SELECT count(*)
      FROM public.support_cases support_case
     WHERE support_case.organization_id = v_organization_id
       AND support_case.status IN ('open','in_progress','pending_customer')
  ) >= 20 THEN
    RAISE EXCEPTION 'support_case_limit_reached';
  END IF;

  SELECT organization.name
    INTO v_organization_name
    FROM public.organizations organization
   WHERE organization.id = v_organization_id;
  IF v_organization_name IS NULL THEN
    RAISE EXCEPTION 'organization_not_found';
  END IF;

  INSERT INTO public.support_cases (
    organization_id,
    organization_name,
    created_by,
    reporter_email,
    category,
    subject,
    priority
  ) VALUES (
    v_organization_id,
    v_organization_name,
    v_actor,
    v_reporter_email,
    p_category,
    btrim(p_subject),
    p_priority
  ) RETURNING id INTO v_case_id;

  INSERT INTO public.support_case_messages (
    case_id,
    author_id,
    author_kind,
    author_label,
    body
  ) VALUES (
    v_case_id,
    v_actor,
    'customer',
    v_reporter_email,
    btrim(p_message)
  );

  RETURN v_case_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.support_add_case_message(
  p_case_id uuid,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_case public.support_cases%ROWTYPE;
  v_message_id uuid;
  v_reporter_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;
  IF char_length(btrim(COALESCE(p_message, ''))) NOT BETWEEN 2 AND 4000 THEN
    RAISE EXCEPTION 'invalid_support_message';
  END IF;
  IF char_length(v_reporter_email) NOT BETWEEN 3 AND 254 THEN
    RAISE EXCEPTION 'verified_email_required';
  END IF;

  SELECT * INTO v_case FROM public.support_cases support_case WHERE support_case.id = p_case_id;
  IF NOT FOUND OR v_case.organization_id <> public.current_organization_id() THEN
    RAISE EXCEPTION 'support_case_not_found';
  END IF;
  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'support_case_closed';
  END IF;

  INSERT INTO public.support_case_messages (
    case_id,
    author_id,
    author_kind,
    author_label,
    body
  ) VALUES (
    p_case_id,
    v_actor,
    'customer',
    v_reporter_email,
    btrim(p_message)
  ) RETURNING id INTO v_message_id;

  UPDATE public.support_cases
     SET status = CASE WHEN status = 'resolved' THEN 'open' ELSE status END
   WHERE id = p_case_id;

  RETURN v_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_manage_support_case(
  p_case_id uuid,
  p_status text,
  p_priority text,
  p_message text DEFAULT NULL,
  p_internal boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_operator_name text;
BEGIN
  SELECT operator.display_name
    INTO v_operator_name
    FROM public.platform_operators operator
   WHERE operator.user_id = v_actor
     AND operator.status = 'active'
     AND operator.role IN ('platform_owner','platform_support');
  IF v_operator_name IS NULL THEN
    RAISE EXCEPTION 'active_platform_support_required';
  END IF;
  IF COALESCE(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'mfa_step_up_required';
  END IF;
  IF p_status NOT IN ('open','in_progress','pending_customer','resolved','closed') THEN
    RAISE EXCEPTION 'invalid_support_status';
  END IF;
  IF p_priority NOT IN ('normal','high','urgent') THEN
    RAISE EXCEPTION 'invalid_support_priority';
  END IF;
  IF p_message IS NOT NULL
     AND char_length(btrim(p_message)) NOT BETWEEN 2 AND 4000 THEN
    RAISE EXCEPTION 'invalid_support_message';
  END IF;

  UPDATE public.support_cases
     SET status = p_status,
         priority = p_priority,
         assigned_operator_id = v_actor,
         first_responded_at = CASE
           WHEN first_responded_at IS NULL AND p_message IS NOT NULL AND NOT p_internal THEN now()
           ELSE first_responded_at
         END,
         resolved_at = CASE
           WHEN p_status IN ('resolved','closed') THEN COALESCE(resolved_at, now())
           ELSE NULL
         END
   WHERE id = p_case_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'support_case_not_found';
  END IF;

  IF p_message IS NOT NULL THEN
    INSERT INTO public.support_case_messages (
      case_id,
      author_id,
      author_kind,
      author_label,
      body,
      is_internal
    ) VALUES (
      p_case_id,
      v_actor,
      'operator',
      v_operator_name,
      btrim(p_message),
      p_internal
    );
  END IF;

  INSERT INTO public.platform_audit_events (actor_id, event_type, metadata)
  VALUES (
    v_actor,
    'platform_support_case_updated',
    jsonb_build_object(
      'case_id', p_case_id,
      'status', p_status,
      'priority', p_priority,
      'message_added', p_message IS NOT NULL,
      'internal_note', p_message IS NOT NULL AND p_internal
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_support_case(text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.support_add_case_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.platform_manage_support_case(uuid, text, text, text, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_support_case(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_add_case_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_manage_support_case(uuid, text, text, text, boolean)
  TO authenticated;

COMMENT ON TABLE public.support_cases IS
  'Tenant-isolated Haccora product support cases, separate from food-business complaint records.';
COMMENT ON TABLE public.support_case_messages IS
  'Customer-visible support thread messages plus platform-only internal notes protected by RLS.';

COMMIT;