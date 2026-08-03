-- Production security and data-integrity baseline.
--
-- This migration deliberately treats every pre-existing account as an isolated
-- workspace. That closes the legacy cross-customer RLS gap without guessing
-- which historical users belonged to the same company. Merge memberships and
-- reassign records explicitly during a production cut-over if needed.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Tenant, location and membership model
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  country_code text NOT NULL DEFAULT 'DE' CHECK (char_length(country_code) = 2),
  timezone text NOT NULL DEFAULT 'Europe/Berlin',
  enabled_modules text[] NOT NULL DEFAULT ARRAY[
    'haccp','temperature','cleaning','menu','purchasing','rota','training','audits'
  ],
  created_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  business_state text,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  timezone text NOT NULL DEFAULT 'Europe/Berlin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  role public.app_role NOT NULL CHECK (role <> 'inspector'),
  default_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','suspended','revoked')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.inspector_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  inspector_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  location_ids uuid[] NOT NULL,
  evidence_scopes text[] NOT NULL DEFAULT ARRAY[
    'haccp','temperature','cleaning','pest','allergens','training',
    'traceability','audits','documents','incidents'
  ],
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  granted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  revoked_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until > valid_from),
  CHECK (cardinality(location_ids) BETWEEN 1 AND 20),
  CHECK (evidence_scopes <@ ARRAY[
    'haccp','temperature','cleaning','pest','allergens','training',
    'traceability','audits','documents','incidents'
  ]::text[]),
  UNIQUE (organization_id, inspector_user_id, valid_until)
);

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  email text NOT NULL CHECK (email = lower(email)),
  role public.app_role NOT NULL CHECK (role IN ('manager','chef','staff')),
  token_hash text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS public.inspector_access_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  email text NOT NULL CHECK (email = lower(email)),
  location_ids uuid[] NOT NULL DEFAULT '{}',
  evidence_scopes text[] NOT NULL,
  access_valid_until timestamptz NOT NULL,
  token_hash text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason text,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cardinality(location_ids) BETWEEN 1 AND 20),
  CHECK (cardinality(evidence_scopes) BETWEEN 1 AND 10),
  CHECK (evidence_scopes <@ ARRAY[
    'haccp','temperature','cleaning','pest','allergens','training',
    'traceability','audits','documents','incidents'
  ]::text[]),
  CHECK (access_valid_until > created_at),
  CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  business_name text,
  locale text NOT NULL DEFAULT 'de' CHECK (locale IN ('de','en')),
  consent_at timestamptz NOT NULL,
  source_ip_hash text NOT NULL,
  user_agent text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed','spam')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contact_requests FROM anon, authenticated;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.organization_id
    FROM public.organization_memberships m
    LEFT JOIN public.profiles p ON p.id = m.user_id
   WHERE m.user_id = auth.uid() AND m.status = 'active'
   ORDER BY (m.organization_id = p.current_organization_id) DESC NULLS LAST, m.created_at
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_location_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN selected_location.id IS NOT NULL
              THEN p.current_location_id ELSE m.default_location_id END
    FROM public.organization_memberships m
    LEFT JOIN public.profiles p ON p.id = m.user_id
    LEFT JOIN public.locations selected_location
      ON selected_location.id = p.current_location_id
     AND selected_location.organization_id = m.organization_id
   WHERE m.user_id = auth.uid()
     AND m.organization_id = public.current_organization_id()
     AND m.status = 'active'
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(
  p_organization_id uuid,
  p_roles public.app_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.organization_memberships m
     WHERE m.organization_id = p_organization_id
       AND m.user_id = auth.uid()
       AND m.status = 'active'
       AND m.role = ANY(p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_valid_inspector_grant(
  p_organization_id uuid,
  p_scope text DEFAULT NULL,
  p_location_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.inspector_access_grants g
     WHERE g.organization_id = p_organization_id
       AND g.inspector_user_id = auth.uid()
       AND g.revoked_at IS NULL
       AND now() BETWEEN g.valid_from AND g.valid_until
       AND (p_scope IS NULL OR p_scope = ANY(g.evidence_scopes))
       AND (
         p_location_id IS NULL
         OR cardinality(g.location_ids) = 0
         OR p_location_id = ANY(g.location_ids)
       )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_organization(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_memberships m
     WHERE m.organization_id = p_organization_id
       AND m.user_id = auth.uid()
       AND m.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_contribute_to_organization(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_memberships m
     WHERE m.organization_id = p_organization_id
       AND m.user_id = auth.uid()
       AND m.status = 'active'
       AND m.role IN ('owner','manager','chef','staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_organization(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_org_role(p_organization_id, ARRAY['owner','manager']::public.app_role[]);
$$;

-- Keep legacy helper calls tenant-aware while the client is migrated.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.organization_memberships m
     WHERE m.user_id = _user_id AND m.status = 'active' AND m.role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.can_operate_record(
  p_organization_id uuid,
  p_actor_id uuid,
  p_location_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_org_role(
           p_organization_id,
           ARRAY['owner','manager','chef']::public.app_role[]
         )
      OR (
        p_actor_id = auth.uid()
        AND public.has_org_role(p_organization_id, ARRAY['staff']::public.app_role[])
        AND (p_location_id IS NULL OR p_location_id = public.current_location_id())
      );
$$;

CREATE OR REPLACE FUNCTION public.is_valid_profile_context(
  p_organization_id uuid,
  p_location_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    p_organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.organization_memberships m
       WHERE m.organization_id = p_organization_id
         AND m.user_id = auth.uid()
         AND m.status = 'active'
    )
  ) AND (
    p_location_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.locations l
       WHERE l.id = p_location_id
         AND l.organization_id = p_organization_id
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.try_uuid(p_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = public
AS $$
BEGIN
  RETURN p_value::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT m.role
       FROM public.organization_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id = public.current_organization_id()
        AND m.status = 'active'
      LIMIT 1),
    'staff'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid()
     AND public.can_manage_organization(public.current_organization_id());
$$;

CREATE OR REPLACE FUNCTION public.is_inspector(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.inspector_access_grants g
     WHERE g.inspector_user_id = _user_id
       AND g.revoked_at IS NULL
       AND now() BETWEEN g.valid_from AND g.valid_until
  );
$$;

-- Public sign-up metadata can never assign an application role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, restaurant_name, language)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(NEW.email,'@',1)),
    NULLIF(NEW.raw_user_meta_data->>'restaurant_name',''),
    CASE WHEN NEW.raw_user_meta_data->>'language' = 'en' THEN 'en' ELSE 'de' END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_my_organization(
  p_name text,
  p_location_name text DEFAULT 'Main location',
  p_business_state text DEFAULT NULL,
  p_modules text[] DEFAULT ARRAY[
    'haccp','temperature','cleaning','menu','purchasing','rota','training','audits'
  ]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org public.organizations;
  v_location public.locations;
  v_slug text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF char_length(trim(p_name)) < 2 THEN RAISE EXCEPTION 'organization name is required'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.organization_memberships
     WHERE user_id = v_user_id AND status IN ('active','invited')
  ) THEN
    RAISE EXCEPTION 'workspace already exists';
  END IF;

  v_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  IF v_slug = '' THEN v_slug := 'workspace'; END IF;
  v_slug := left(v_slug, 48) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  INSERT INTO public.organizations (name, slug, created_by, enabled_modules)
  VALUES (trim(p_name), v_slug, v_user_id, p_modules)
  RETURNING * INTO v_org;

  INSERT INTO public.locations (organization_id, name, business_state)
  VALUES (v_org.id, COALESCE(NULLIF(trim(p_location_name),''), 'Main location'), p_business_state)
  RETURNING * INTO v_location;

  INSERT INTO public.organization_memberships (
    organization_id, user_id, role, default_location_id, status, accepted_at
  ) VALUES (v_org.id, v_user_id, 'owner', v_location.id, 'active', now());

  UPDATE public.profiles
     SET current_organization_id = v_org.id,
         current_location_id = v_location.id,
         restaurant_name = v_org.name,
         location = v_location.name
   WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'organization_id', v_org.id,
    'location_id', v_location.id,
    'role', 'owner'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_my_organization(text,text,text,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_my_organization(text,text,text,text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object(
      'organization_id', m.organization_id,
      'organization_name', o.name,
      'location_id', COALESCE(l.id, m.default_location_id),
      'location_name', l.name,
      'role', m.role,
      'membership_status', m.status
    )
      FROM public.organization_memberships m
      JOIN public.organizations o ON o.id = m.organization_id
      LEFT JOIN public.profiles p ON p.id = m.user_id
      LEFT JOIN public.locations l
        ON l.id = p.current_location_id
       AND l.organization_id = m.organization_id
     WHERE m.user_id = auth.uid()
       AND m.status = 'active'
       AND (p.current_organization_id IS NULL OR p.current_organization_id = m.organization_id)
     ORDER BY m.created_at
     LIMIT 1
  ), (
    SELECT jsonb_build_object(
      'organization_id', g.organization_id,
      'organization_name', o.name,
      'location_id', CASE WHEN cardinality(g.location_ids) = 1 THEN g.location_ids[1] ELSE NULL END,
      'location_name', CASE WHEN cardinality(g.location_ids) = 1 THEN l.name ELSE 'Granted locations' END,
      'role', 'inspector',
      'evidence_scopes', g.evidence_scopes,
      'membership_status', 'active'
    )
      FROM public.inspector_access_grants g
      JOIN public.organizations o ON o.id = g.organization_id
      LEFT JOIN public.locations l
        ON l.id = CASE WHEN cardinality(g.location_ids) = 1 THEN g.location_ids[1] ELSE NULL END
       AND l.organization_id = g.organization_id
     WHERE g.inspector_user_id = auth.uid()
       AND g.revoked_at IS NULL
       AND now() BETWEEN g.valid_from AND g.valid_until
     ORDER BY g.valid_until
     LIMIT 1
  ), '{}'::jsonb);
$$;
REVOKE ALL ON FUNCTION public.get_my_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_context() TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(COALESCE(auth.jwt()->>'email',''));
  v_invite public.organization_invitations;
  v_location_id uuid;
BEGIN
  IF v_user_id IS NULL OR char_length(p_token) < 32 THEN RAISE EXCEPTION 'invalid invitation'; END IF;
  SELECT * INTO v_invite
    FROM public.organization_invitations
   WHERE token_hash = encode(digest(p_token, 'sha256'), 'hex')
     AND accepted_at IS NULL
     AND revoked_at IS NULL
     AND expires_at > now()
   FOR UPDATE;
  IF v_invite.id IS NULL OR v_email <> v_invite.email THEN RAISE EXCEPTION 'invalid invitation'; END IF;

  SELECT id INTO v_location_id FROM public.locations
   WHERE organization_id = v_invite.organization_id AND is_active
   ORDER BY created_at LIMIT 1;

  INSERT INTO public.organization_memberships (
    organization_id, user_id, role, default_location_id, status, invited_by, accepted_at
  ) VALUES (
    v_invite.organization_id, v_user_id, v_invite.role, v_location_id, 'active', v_invite.invited_by, now()
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = CASE
      WHEN organization_memberships.role = 'owner' THEN 'owner'::public.app_role
      ELSE EXCLUDED.role
    END,
    default_location_id = EXCLUDED.default_location_id,
    status = 'active', accepted_at = now();

  UPDATE public.organization_invitations SET accepted_at = now() WHERE id = v_invite.id;
  UPDATE public.profiles
     SET current_organization_id = v_invite.organization_id,
         current_location_id = v_location_id
   WHERE id = v_user_id;
  RETURN jsonb_build_object('organization_id', v_invite.organization_id, 'location_id', v_location_id, 'role', v_invite.role);
END;
$$;
REVOKE ALL ON FUNCTION public.accept_organization_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_inspector_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(COALESCE(auth.jwt()->>'email',''));
  v_invite public.inspector_access_invitations;
BEGIN
  IF v_user_id IS NULL OR char_length(p_token) < 32 THEN
    RAISE EXCEPTION 'invalid invitation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.organization_memberships
     WHERE user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'use a separate inspector account';
  END IF;

  SELECT * INTO v_invite
    FROM public.inspector_access_invitations
   WHERE token_hash = encode(digest(p_token, 'sha256'), 'hex')
     AND accepted_at IS NULL
     AND revoked_at IS NULL
     AND expires_at > now()
     AND access_valid_until > now()
   FOR UPDATE;
  IF v_invite.id IS NULL OR v_email <> v_invite.email THEN
    RAISE EXCEPTION 'invalid invitation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_invite.location_ids) invited_location
     WHERE NOT EXISTS (
       SELECT 1 FROM public.locations l
        WHERE l.id = invited_location
          AND l.organization_id = v_invite.organization_id
          AND l.is_active
     )
  ) THEN
    RAISE EXCEPTION 'invalid location scope';
  END IF;

  INSERT INTO public.inspector_access_grants (
    organization_id, inspector_user_id, location_ids, evidence_scopes,
    valid_from, valid_until, granted_by, reason
  ) VALUES (
    v_invite.organization_id, v_user_id, v_invite.location_ids,
    v_invite.evidence_scopes, now(), v_invite.access_valid_until,
    v_invite.invited_by, v_invite.reason
  );
  UPDATE public.inspector_access_invitations
     SET accepted_at = now()
   WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'organization_id', v_invite.organization_id,
    'role', 'inspector',
    'valid_until', v_invite.access_valid_until
  );
END;
$$;
REVOKE ALL ON FUNCTION public.accept_inspector_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_inspector_invitation(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Isolate historical accounts, then scope operational records.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  u record;
  v_org_id uuid;
  v_location_id uuid;
  v_slug text;
BEGIN
  FOR u IN
    SELECT au.id,
           COALESCE(NULLIF(p.restaurant_name,''), NULLIF(p.full_name,''), split_part(au.email,'@',1), 'Workspace') AS name,
           COALESCE(NULLIF(p.location,''), 'Main location') AS location_name
      FROM auth.users au
      LEFT JOIN public.profiles p ON p.id = au.id
     WHERE NOT EXISTS (
       SELECT 1 FROM public.organization_memberships m WHERE m.user_id = au.id
     )
  LOOP
    v_slug := left(trim(both '-' from regexp_replace(lower(u.name), '[^a-z0-9]+', '-', 'g')), 48);
    IF v_slug = '' THEN v_slug := 'workspace'; END IF;
    v_slug := v_slug || '-' || substr(replace(u.id::text, '-', ''), 1, 8);

    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (u.name, v_slug, u.id)
    RETURNING id INTO v_org_id;

    INSERT INTO public.locations (organization_id, name)
    VALUES (v_org_id, u.location_name)
    RETURNING id INTO v_location_id;

    INSERT INTO public.organization_memberships (
      organization_id, user_id, role, default_location_id, status, accepted_at
    ) VALUES (v_org_id, u.id, 'owner', v_location_id, 'active', now());

    UPDATE public.profiles
       SET current_organization_id = v_org_id,
           current_location_id = v_location_id
     WHERE id = u.id;
  END LOOP;
END;
$$;

ALTER TABLE public.training_records
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS verification_note text;
DELETE FROM public.training_records a
USING public.training_records b
WHERE a.user_id = b.user_id
  AND a.course_id IS NOT DISTINCT FROM b.course_id
  AND (a.created_at, a.id) < (b.created_at, b.id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_training_record_user_course
  ON public.training_records(user_id, course_id) WHERE course_id IS NOT NULL;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS file_size bigint CHECK (file_size IS NULL OR file_size BETWEEN 1 AND 10485760),
  ADD COLUMN IF NOT EXISTS sha256 text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'ck_temperature_evidence_range'
       AND conrelid = 'public.temperature_logs'::regclass
  ) THEN
    ALTER TABLE public.temperature_logs
      ADD CONSTRAINT ck_temperature_evidence_range CHECK (
        reading BETWEEN -100 AND 300
        AND (target_min IS NULL OR target_min BETWEEN -100 AND 300)
        AND (target_max IS NULL OR target_max BETWEEN -100 AND 300)
        AND (target_min IS NULL OR target_max IS NULL OR target_min < target_max)
      ) NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.training_courses
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'temperature_logs','checks','incidents','alerts','documents','activity_logs',
    'expiry_items','waste_entries','suppliers','haccp_hazards','audits','recalls',
    'assets','recipes','purchase_orders','stock_items','shifts','time_clock',
    'training_records','label_prints','goods_in_logs','calibration_logs',
    'health_register','pest_sightings','oil_tests','complaints','chemicals',
    'haccp_flow_runs'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT DEFAULT public.current_organization_id()',
      t
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL DEFAULT public.current_location_id()',
      t
    );
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS idempotency_key text', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (organization_id, created_at DESC)', 'idx_' || t || '_org_created', t);
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL',
      'uq_' || t || '_org_idempotency', t
    );
  END LOOP;
END;
$$;

-- Backfill organization and location from each record's actor.
DO $$
DECLARE
  pair text[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY ARRAY[
    ['temperature_logs','user_id'],['checks','user_id'],['incidents','user_id'],
    ['alerts','user_id'],['documents','user_id'],['activity_logs','user_id'],
    ['expiry_items','user_id'],['waste_entries','user_id'],['time_clock','user_id'],
    ['training_records','user_id'],['goods_in_logs','user_id'],['calibration_logs','user_id'],
    ['health_register','user_id'],['pest_sightings','user_id'],['oil_tests','user_id'],
    ['complaints','user_id'],['chemicals','user_id'],['haccp_flow_runs','performed_by'],
    ['suppliers','created_by'],['haccp_hazards','created_by'],['assets','created_by'],
    ['recipes','created_by'],['purchase_orders','created_by'],['stock_items','created_by'],
    ['shifts','created_by'],['audits','performed_by'],['recalls','initiated_by'],
    ['label_prints','printed_by']
  ]
  LOOP
    EXECUTE format(
      'UPDATE public.%I r SET organization_id = m.organization_id, location_id = m.default_location_id FROM public.organization_memberships m WHERE r.organization_id IS NULL AND m.user_id = r.%I AND m.status = ''active''',
      pair[1], pair[2]
    );
  END LOOP;
END;
$$;

-- A location reference must always belong to the same organization as its row.
CREATE UNIQUE INDEX IF NOT EXISTS uq_locations_id_organization
  ON public.locations(id, organization_id);

DO $$
DECLARE
  t text;
  v_constraint_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'fk_membership_location_organization'
       AND conrelid = 'public.organization_memberships'::regclass
  ) THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT fk_membership_location_organization
      FOREIGN KEY (default_location_id, organization_id)
      REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'fk_profile_location_organization'
       AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profile_location_organization
      FOREIGN KEY (current_location_id, current_organization_id)
      REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT;
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'temperature_logs','checks','incidents','alerts','documents','activity_logs',
    'expiry_items','waste_entries','suppliers','haccp_hazards','audits','recalls',
    'assets','recipes','purchase_orders','stock_items','shifts','time_clock',
    'training_records','label_prints','goods_in_logs','calibration_logs',
    'health_register','pest_sightings','oil_tests','complaints','chemicals',
    'haccp_flow_runs'
  ]
  LOOP
    v_constraint_name := 'fk_' || t || '_location_organization';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = v_constraint_name
         AND conrelid = format('public.%I', t)::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT',
        t, v_constraint_name
      );
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Replace legacy global policies with tenant-scoped policies.
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspector_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspector_access_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_read ON public.organizations FOR SELECT TO authenticated
  USING (public.can_read_organization(id) OR public.has_valid_inspector_grant(id));
CREATE POLICY organizations_update ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_org_role(id, ARRAY['owner']::public.app_role[]))
  WITH CHECK (public.has_org_role(id, ARRAY['owner']::public.app_role[]));

CREATE POLICY locations_read ON public.locations FOR SELECT TO authenticated
  USING (
    public.can_read_organization(organization_id)
    OR public.has_valid_inspector_grant(organization_id, NULL, id)
  );
CREATE POLICY locations_manage ON public.locations FOR ALL TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (public.can_manage_organization(organization_id));

CREATE POLICY memberships_read ON public.organization_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_organization(organization_id));
CREATE POLICY memberships_manage ON public.organization_memberships FOR ALL TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['owner']::public.app_role[]))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner']::public.app_role[]));

CREATE OR REPLACE FUNCTION public.tg_preserve_active_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removes_owner boolean := TG_OP = 'DELETE';
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_removes_owner := NEW.role <> 'owner' OR NEW.status <> 'active';
  END IF;
  IF OLD.role = 'owner' AND OLD.status = 'active' AND v_removes_owner
     AND NOT EXISTS (
       SELECT 1 FROM public.organization_memberships m
        WHERE m.organization_id = OLD.organization_id
          AND m.id <> OLD.id
          AND m.role = 'owner'
          AND m.status = 'active'
     ) THEN
    RAISE EXCEPTION 'organization must retain an active owner';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_preserve_active_owner ON public.organization_memberships;
CREATE TRIGGER trg_preserve_active_owner
  BEFORE UPDATE OF role, status OR DELETE ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION public.tg_preserve_active_owner();

CREATE POLICY inspector_grants_read ON public.inspector_access_grants FOR SELECT TO authenticated
  USING (inspector_user_id = auth.uid() OR public.can_manage_organization(organization_id));
CREATE POLICY inspector_grants_revoke ON public.inspector_access_grants FOR UPDATE TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (public.can_manage_organization(organization_id));

CREATE POLICY invitations_read ON public.organization_invitations FOR SELECT TO authenticated
  USING (public.can_manage_organization(organization_id));
CREATE POLICY invitations_manage ON public.organization_invitations FOR ALL TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (public.can_manage_organization(organization_id) AND invited_by = auth.uid());
CREATE POLICY inspector_invitations_read ON public.inspector_access_invitations FOR SELECT TO authenticated
  USING (public.can_manage_organization(organization_id));
CREATE POLICY inspector_invitations_manage ON public.inspector_access_invitations FOR ALL TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (public.can_manage_organization(organization_id) AND invited_by = auth.uid());

-- Profiles are visible only to the subject, colleagues in the same active
-- workspace, and managers. External inspector grants never expose staff PII.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', p.policyname); END LOOP;
END;
$$;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='activity_logs'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.activity_logs', p.policyname); END LOOP;
END;
$$;
CREATE POLICY activity_logs_tenant_read ON public.activity_logs FOR SELECT TO authenticated
  USING (public.can_read_organization(organization_id));
REVOKE INSERT, UPDATE, DELETE ON public.activity_logs FROM authenticated;
CREATE POLICY profiles_read_tenant ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM public.organization_memberships mine
        JOIN public.organization_memberships theirs
          ON theirs.organization_id = mine.organization_id
       WHERE mine.user_id = auth.uid() AND mine.status = 'active'
         AND theirs.user_id = profiles.id AND theirs.status = 'active'
    )
  );
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND public.is_valid_profile_context(current_organization_id, current_location_id)
  );
CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND public.is_valid_profile_context(current_organization_id, current_location_id)
  );

-- user_roles is now a read-only compatibility projection; assignments happen
-- through organization_memberships and server-side invitation flows.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_roles'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', p.policyname); END LOOP;
END;
$$;
CREATE POLICY legacy_roles_read_self ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'temperature_logs','checks','incidents','alerts','documents','expiry_items',
    'waste_entries','suppliers','haccp_hazards','audits','recalls','assets',
    'recipes','purchase_orders','stock_items','shifts','time_clock',
    'training_records','label_prints','goods_in_logs','calibration_logs',
    'pest_sightings','oil_tests','complaints','chemicals','haccp_flow_runs'
  ]
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t); END LOOP;

    EXECUTE format(
      'CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING (public.can_read_organization(organization_id))',
      t
    );
  END LOOP;
END;
$$;

-- Staff may create and correct only records attributed to themselves. Owners,
-- managers and chefs can operate across the tenant. Health data is overridden
-- below with stricter private policies.
DO $$
DECLARE pair text[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY ARRAY[
    ['temperature_logs','user_id'],['checks','user_id'],['incidents','user_id'],
    ['alerts','user_id'],['documents','user_id'],['expiry_items','user_id'],
    ['waste_entries','user_id'],['time_clock','user_id'],
    ['training_records','user_id'],['goods_in_logs','user_id'],
    ['calibration_logs','user_id'],['pest_sightings','user_id'],
    ['oil_tests','user_id'],['complaints','user_id'],['chemicals','user_id'],
    ['haccp_flow_runs','performed_by'],['suppliers','created_by'],
    ['haccp_hazards','created_by'],['assets','created_by'],['recipes','created_by'],
    ['purchase_orders','created_by'],['stock_items','created_by'],
    ['shifts','created_by'],['audits','performed_by'],['recalls','initiated_by'],
    ['label_prints','printed_by']
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY tenant_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_organization_id() AND public.can_operate_record(organization_id, %I, location_id))',
      pair[1], pair[2]
    );
    EXECUTE format(
      'CREATE POLICY tenant_update ON public.%I FOR UPDATE TO authenticated USING (public.can_operate_record(organization_id, %I, location_id)) WITH CHECK (organization_id = public.current_organization_id() AND public.can_operate_record(organization_id, %I, location_id))',
      pair[1], pair[2], pair[2]
    );
  END LOOP;
END;
$$;

-- Inspector grants are evaluated per evidence domain and, where present, per
-- location. A grant for one domain never unlocks every tenant table.
DO $$
DECLARE pair text[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY ARRAY[
    ['temperature_logs','temperature'],['checks','cleaning'],
    ['haccp_hazards','haccp'],['haccp_flow_runs','haccp'],
    ['recipes','allergens'],['training_records','training'],
    ['goods_in_logs','traceability'],['expiry_items','traceability'],['suppliers','traceability'],
    ['purchase_orders','traceability'],['recalls','traceability'],
    ['audits','audits'],['pest_sightings','pest'],
    ['documents','documents'],['incidents','incidents'],
    ['calibration_logs','temperature']
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY inspector_scoped_read ON public.%I FOR SELECT TO authenticated USING (public.has_valid_inspector_grant(organization_id, %L, location_id))',
      pair[1], pair[2]
    );
  END LOOP;
END;
$$;

-- Only managers can delete mutable master data. Evidence records are append-only.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['suppliers','assets','recipes','purchase_orders','stock_items','shifts']
  LOOP
    EXECUTE format(
      'CREATE POLICY tenant_delete_admin ON public.%I FOR DELETE TO authenticated USING (public.can_manage_organization(organization_id))',
      t
    );
  END LOOP;
END;
$$;

-- Health data is intentionally stricter than the generic evidence scope.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='health_register'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.health_register', p.policyname); END LOOP;
END;
$$;
CREATE POLICY health_read_private ON public.health_register FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_organization(organization_id));
CREATE POLICY health_insert_self ON public.health_register FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = public.current_organization_id()
    AND (location_id IS NULL OR location_id = public.current_location_id())
    AND public.can_contribute_to_organization(organization_id)
  );
CREATE POLICY health_update_private ON public.health_register FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_organization(organization_id))
  WITH CHECK (user_id = auth.uid() OR public.can_manage_organization(organization_id));

DROP POLICY tenant_read ON public.alerts;
CREATE POLICY alerts_read_recipient ON public.alerts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_organization(organization_id));

DROP POLICY tenant_read ON public.training_records;
CREATE POLICY training_records_private_read ON public.training_records FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_manage_organization(organization_id)
    OR public.has_valid_inspector_grant(organization_id, 'training', location_id)
  );

-- ---------------------------------------------------------------------------
-- Immutable, tamper-evident audit trail and corrective actions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE','SIGN_OFF','EXPORT','LOGIN')),
  entity text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  previous_hash text,
  record_hash text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.audit_events FROM authenticated;
GRANT SELECT ON public.audit_events TO authenticated;
CREATE POLICY audit_events_read ON public.audit_events FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR public.can_manage_organization(organization_id)
  );
CREATE INDEX IF NOT EXISTS idx_audit_events_org_time
  ON public.audit_events(organization_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.capture_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_org_id uuid;
  v_location_id uuid;
  v_entity_id uuid;
  v_actor_id uuid := auth.uid();
  v_occurred_at timestamptz := clock_timestamp();
  v_previous_hash text;
  v_hash text;
BEGIN
  v_before := CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  v_after := CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
  v_org_id := COALESCE((v_after->>'organization_id')::uuid, (v_before->>'organization_id')::uuid);
  IF v_org_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  v_location_id := COALESCE((v_after->>'location_id')::uuid, (v_before->>'location_id')::uuid);
  v_entity_id := COALESCE((v_after->>'id')::uuid, (v_before->>'id')::uuid);

  PERFORM pg_advisory_xact_lock(hashtextextended(v_org_id::text, 0));
  SELECT record_hash INTO v_previous_hash
    FROM public.audit_events
   WHERE organization_id = v_org_id
   ORDER BY occurred_at DESC, id DESC
   LIMIT 1;

  v_hash := encode(digest(
    concat_ws('|', v_org_id::text, TG_TABLE_NAME, TG_OP, v_entity_id::text,
      COALESCE(v_actor_id::text,''), v_occurred_at::text,
      COALESCE(v_previous_hash,''), COALESCE(v_before::text,''), COALESCE(v_after::text,'')),
    'sha256'
  ), 'hex');

  INSERT INTO public.audit_events (
    organization_id, location_id, actor_id, action, entity, entity_id,
    before_data, after_data, previous_hash, record_hash, occurred_at
  ) VALUES (
    v_org_id, v_location_id, v_actor_id, TG_OP, TG_TABLE_NAME, v_entity_id,
    v_before, v_after, v_previous_hash, v_hash, v_occurred_at
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_evidence_export(
  p_from date,
  p_to date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id uuid := public.current_organization_id();
  v_location_id uuid := public.current_location_id();
  v_actor_id uuid := auth.uid();
  v_occurred_at timestamptz := clock_timestamp();
  v_previous_hash text;
  v_after jsonb;
  v_hash text;
BEGIN
  IF v_actor_id IS NULL OR p_from IS NULL OR p_to IS NULL OR p_to < p_from
     OR p_to - p_from > 366 THEN
    RAISE EXCEPTION 'invalid export request';
  END IF;

  IF v_org_id IS NULL THEN
    SELECT g.organization_id,
           CASE WHEN cardinality(g.location_ids) = 1 THEN g.location_ids[1] ELSE NULL END
      INTO v_org_id, v_location_id
      FROM public.inspector_access_grants g
     WHERE g.inspector_user_id = v_actor_id
       AND g.revoked_at IS NULL
       AND now() BETWEEN g.valid_from AND g.valid_until
     ORDER BY g.valid_until
     LIMIT 1;
  END IF;

  IF v_org_id IS NULL OR NOT (
    public.can_read_organization(v_org_id)
    OR public.has_valid_inspector_grant(v_org_id)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_after := jsonb_build_object('from', p_from, 'to', p_to);
  PERFORM pg_advisory_xact_lock(hashtextextended(v_org_id::text, 0));
  SELECT record_hash INTO v_previous_hash
    FROM public.audit_events
   WHERE organization_id = v_org_id
   ORDER BY occurred_at DESC, id DESC
   LIMIT 1;

  v_hash := encode(digest(
    concat_ws('|', v_org_id::text, 'inspection_export', 'EXPORT', '',
      v_actor_id::text, v_occurred_at::text, COALESCE(v_previous_hash,''), '', v_after::text),
    'sha256'
  ), 'hex');

  INSERT INTO public.audit_events (
    organization_id, location_id, actor_id, action, entity,
    after_data, previous_hash, record_hash, occurred_at
  ) VALUES (
    v_org_id, v_location_id, v_actor_id, 'EXPORT', 'inspection_export',
    v_after, v_previous_hash, v_hash, v_occurred_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.record_evidence_export(date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_evidence_export(date,date) TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'temperature_logs','checks','incidents','documents','expiry_items','waste_entries',
    'suppliers','haccp_hazards','audits','recalls','assets','recipes','purchase_orders',
    'stock_items','shifts','time_clock','training_records','label_prints','goods_in_logs',
    'calibration_logs','health_register','pest_sightings','oil_tests','complaints',
    'chemicals','haccp_flow_runs'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_event ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_event AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_audit_event()',
      t
    );
  END LOOP;
END;
$$;

CREATE TABLE IF NOT EXISTS public.corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id() REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id uuid DEFAULT public.current_location_id() REFERENCES public.locations(id) ON DELETE SET NULL,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  description text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','verified','closed')),
  completed_at timestamptz,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_table, source_id, description)
);
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY corrective_read ON public.corrective_actions FOR SELECT TO authenticated
  USING (public.can_read_organization(organization_id));
CREATE POLICY corrective_insert ON public.corrective_actions FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_organization_id() AND created_by = auth.uid());
CREATE POLICY corrective_update ON public.corrective_actions FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.can_manage_organization(organization_id))
  WITH CHECK (owner_id = auth.uid() OR public.can_manage_organization(organization_id));

-- Versioned approvals replace the previous free-text HACCP approval.
CREATE TABLE IF NOT EXISTS public.haccp_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id() REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id uuid DEFAULT public.current_location_id() REFERENCES public.locations(id) ON DELETE SET NULL,
  version integer NOT NULL,
  plan jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','approved','superseded')),
  submitted_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  submitted_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  approval_statement text,
  content_hash text GENERATED ALWAYS AS (encode(extensions.digest(plan::text, 'sha256'), 'hex')) STORED,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (organization_id, location_id, version)
);
ALTER TABLE public.haccp_plan_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY haccp_versions_read ON public.haccp_plan_versions FOR SELECT TO authenticated
  USING (
    public.can_read_organization(organization_id)
    OR public.has_valid_inspector_grant(organization_id, 'haccp', location_id)
  );
CREATE POLICY haccp_versions_insert ON public.haccp_plan_versions FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.has_org_role(organization_id, ARRAY['owner','manager','chef']::public.app_role[])
  );
CREATE POLICY haccp_versions_approve ON public.haccp_plan_versions FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner','manager']::public.app_role[]));

CREATE OR REPLACE FUNCTION public.record_haccp_plan(
  p_plan jsonb,
  p_approve boolean DEFAULT false,
  p_statement text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := public.current_organization_id();
  v_location_id uuid := public.current_location_id();
  v_role public.app_role := public.current_user_role();
  v_version integer;
  v_id uuid;
BEGIN
  IF v_org_id IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF v_role NOT IN ('owner','manager','chef') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_approve AND v_role NOT IN ('owner','manager') THEN RAISE EXCEPTION 'approval requires owner or manager'; END IF;
  IF p_approve AND char_length(COALESCE(trim(p_statement),'')) < 10 THEN RAISE EXCEPTION 'approval statement is required'; END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_org_id::text || ':' || COALESCE(v_location_id::text, 'all'), 1)
  );

  SELECT COALESCE(max(version), 0) + 1 INTO v_version
    FROM public.haccp_plan_versions
   WHERE organization_id = v_org_id
     AND location_id IS NOT DISTINCT FROM v_location_id;

  IF p_approve THEN
    UPDATE public.haccp_plan_versions
       SET status = 'superseded'
     WHERE organization_id = v_org_id
       AND location_id IS NOT DISTINCT FROM v_location_id
       AND status = 'approved';
  END IF;

  INSERT INTO public.haccp_plan_versions (
    organization_id, location_id, version, plan, status, submitted_by, submitted_at,
    approved_by, approved_at, approval_statement, created_by
  ) VALUES (
    v_org_id, v_location_id, v_version, p_plan,
    CASE WHEN p_approve THEN 'approved' ELSE 'in_review' END,
    auth.uid(), now(),
    CASE WHEN p_approve THEN auth.uid() ELSE NULL END,
    CASE WHEN p_approve THEN now() ELSE NULL END,
    CASE WHEN p_approve THEN trim(p_statement) ELSE NULL END,
    auth.uid()
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'version', v_version, 'status', CASE WHEN p_approve THEN 'approved' ELSE 'in_review' END);
END;
$$;
REVOKE ALL ON FUNCTION public.record_haccp_plan(jsonb,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_haccp_plan(jsonb,boolean,text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Feature-complete persistence primitives (allergens, stock, sensors, billing)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id() REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  allergens text[] NOT NULL DEFAULT '{}',
  specification_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE RESTRICT,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL DEFAULT public.current_organization_id() REFERENCES public.organizations(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  PRIMARY KEY (recipe_id, ingredient_id)
);
CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id() REFERENCES public.organizations(id) ON DELETE RESTRICT,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  unit_price_eur numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price_eur >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id() REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id uuid DEFAULT public.current_location_id() REFERENCES public.locations(id) ON DELETE SET NULL,
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN ('receipt','usage','waste','adjustment','transfer')),
  quantity numeric NOT NULL CHECK (quantity <> 0),
  reference_table text,
  reference_id uuid,
  idempotency_key text,
  recorded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS public.sensor_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  name text NOT NULL,
  external_device_id text NOT NULL UNIQUE,
  secret_hash text NOT NULL,
  target_min numeric NOT NULL CHECK (target_min BETWEEN -100 AND 300),
  target_max numeric NOT NULL CHECK (target_max BETWEEN -100 AND 300),
  last_seen_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (target_min < target_max),
  UNIQUE (organization_id, external_device_id)
);
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  device_id uuid NOT NULL REFERENCES public.sensor_devices(id) ON DELETE RESTRICT,
  external_event_id text NOT NULL,
  reading numeric NOT NULL,
  unit text NOT NULL DEFAULT 'celsius' CHECK (unit IN ('celsius','fahrenheit')),
  captured_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (device_id, external_event_id)
);
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  email_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  critical_only boolean NOT NULL DEFAULT false,
  weekly_digest boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  channel text NOT NULL CHECK (channel IN ('email','push','in_app')),
  template text NOT NULL,
  payload jsonb NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','dead_letter')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  processing_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  token text NOT NULL UNIQUE CHECK (char_length(token) BETWEEN 20 AND 512),
  platform text NOT NULL CHECK (platform IN ('ios','android','web')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, token)
);
CREATE TABLE IF NOT EXISTS public.subscriptions (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE RESTRICT,
  provider_customer_id text UNIQUE,
  provider_subscription_id text UNIQUE,
  plan text NOT NULL DEFAULT 'trial',
  status text NOT NULL DEFAULT 'trialing',
  seats integer NOT NULL DEFAULT 1 CHECK (seats > 0),
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ingredients','purchase_order_lines','stock_movements','sensor_devices',
    'sensor_readings','notification_preferences','notification_outbox',
    'device_push_tokens','subscriptions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END;
$$;

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY recipe_ingredients_read ON public.recipe_ingredients FOR SELECT TO authenticated
  USING (
    public.can_read_organization(organization_id)
    OR public.has_valid_inspector_grant(organization_id, 'allergens')
  );
CREATE POLICY recipe_ingredients_write ON public.recipe_ingredients FOR ALL TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['owner','manager','chef']::public.app_role[]))
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.has_org_role(organization_id, ARRAY['owner','manager','chef']::public.app_role[])
  );

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='training_courses'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.training_courses', p.policyname); END LOOP;
END;
$$;
CREATE POLICY training_courses_read ON public.training_courses FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.can_read_organization(organization_id));
CREATE POLICY training_courses_manage_tenant ON public.training_courses FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND public.can_manage_organization(organization_id))
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.can_manage_organization(organization_id)
  );

CREATE POLICY ingredients_read ON public.ingredients FOR SELECT TO authenticated
  USING (
    public.can_read_organization(organization_id)
    OR public.has_valid_inspector_grant(organization_id, 'allergens')
  );
CREATE POLICY ingredients_write ON public.ingredients FOR ALL TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['owner','manager','chef']::public.app_role[]))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner','manager','chef']::public.app_role[]));
CREATE POLICY po_lines_read ON public.purchase_order_lines FOR SELECT TO authenticated
  USING (
    public.can_read_organization(organization_id)
    OR public.has_valid_inspector_grant(organization_id, 'traceability')
  );
CREATE POLICY po_lines_write ON public.purchase_order_lines FOR ALL TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (public.can_manage_organization(organization_id));
CREATE POLICY stock_movements_read ON public.stock_movements FOR SELECT TO authenticated
  USING (
    public.can_read_organization(organization_id)
    OR public.has_valid_inspector_grant(organization_id, 'traceability', location_id)
  );
CREATE POLICY stock_movements_insert ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_organization_id() AND recorded_by = auth.uid());
CREATE POLICY sensor_devices_read ON public.sensor_devices FOR SELECT TO authenticated
  USING (public.can_manage_organization(organization_id));
CREATE POLICY sensor_devices_update ON public.sensor_devices FOR UPDATE TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.can_manage_organization(organization_id)
  );
CREATE POLICY sensor_readings_read ON public.sensor_readings FOR SELECT TO authenticated
  USING (
    public.can_read_organization(organization_id)
    OR public.has_valid_inspector_grant(organization_id, 'temperature', location_id)
  );
CREATE POLICY notification_preferences_self ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.can_read_organization(organization_id))
  WITH CHECK (user_id = auth.uid() AND public.can_read_organization(organization_id));
CREATE POLICY notification_outbox_admin_read ON public.notification_outbox FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR public.can_manage_organization(organization_id));
CREATE POLICY device_push_tokens_self ON public.device_push_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.can_read_organization(organization_id))
  WITH CHECK (user_id = auth.uid() AND public.can_read_organization(organization_id));
CREATE POLICY subscriptions_admin_read ON public.subscriptions FOR SELECT TO authenticated
  USING (public.can_manage_organization(organization_id));

CREATE OR REPLACE FUNCTION public.set_my_notification_preferences(
  p_email_enabled boolean DEFAULT NULL,
  p_push_enabled boolean DEFAULT NULL,
  p_weekly_digest boolean DEFAULT NULL
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
    user_id, organization_id, email_enabled, push_enabled, weekly_digest
  ) VALUES (
    auth.uid(), v_org_id, COALESCE(p_email_enabled, true),
    COALESCE(p_push_enabled, true), COALESCE(p_weekly_digest, false)
  )
  ON CONFLICT (user_id, organization_id) DO UPDATE SET
    email_enabled = COALESCE(p_email_enabled, notification_preferences.email_enabled),
    push_enabled = COALESCE(p_push_enabled, notification_preferences.push_enabled),
    weekly_digest = COALESCE(p_weekly_digest, notification_preferences.weekly_digest),
    updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.set_my_notification_preferences(boolean,boolean,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_notification_preferences(boolean,boolean,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_my_push_token(
  p_token text,
  p_platform text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org_id uuid := public.current_organization_id();
BEGIN
  IF auth.uid() IS NULL OR v_org_id IS NULL
     OR char_length(trim(p_token)) NOT BETWEEN 20 AND 512
     OR p_platform NOT IN ('ios','android','web') THEN
    RAISE EXCEPTION 'invalid push token';
  END IF;
  INSERT INTO public.device_push_tokens (
    user_id, organization_id, token, platform, enabled
  ) VALUES (
    auth.uid(), v_org_id, trim(p_token), p_platform, true
  )
  ON CONFLICT (token) DO UPDATE SET
    platform = EXCLUDED.platform,
    enabled = true,
    updated_at = now()
  WHERE device_push_tokens.user_id = auth.uid()
    AND device_push_tokens.organization_id = v_org_id;
END;
$$;
REVOKE ALL ON FUNCTION public.register_my_push_token(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_my_push_token(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.disable_my_push_token(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.device_push_tokens
     SET enabled = false, updated_at = now()
   WHERE token = trim(p_token)
     AND user_id = auth.uid()
     AND organization_id = public.current_organization_id();
$$;
REVOKE ALL ON FUNCTION public.disable_my_push_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disable_my_push_token(text) TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations','locations','organization_memberships','corrective_actions',
    'ingredients','notification_preferences','device_push_tokens','subscriptions'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_production_touch ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_production_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()',
      t
    );
  END LOOP;
END;
$$;

-- Enforce tenant ownership for every relation introduced above.
CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_id_organization ON public.suppliers(id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_id_organization ON public.documents(id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_recipes_id_organization ON public.recipes(id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ingredients_id_organization ON public.ingredients(id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_orders_id_organization ON public.purchase_orders(id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_items_id_organization ON public.stock_items(id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sensor_devices_id_organization ON public.sensor_devices(id, organization_id);

ALTER TABLE public.corrective_actions ADD CONSTRAINT fk_corrective_location_organization
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.haccp_plan_versions ADD CONSTRAINT fk_haccp_version_location_organization
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.ingredients ADD CONSTRAINT fk_ingredient_supplier_organization
  FOREIGN KEY (supplier_id, organization_id) REFERENCES public.suppliers(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.ingredients ADD CONSTRAINT fk_ingredient_document_organization
  FOREIGN KEY (specification_document_id, organization_id) REFERENCES public.documents(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.recipe_ingredients ADD CONSTRAINT fk_recipe_ingredient_recipe_organization
  FOREIGN KEY (recipe_id, organization_id) REFERENCES public.recipes(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.recipe_ingredients ADD CONSTRAINT fk_recipe_ingredient_item_organization
  FOREIGN KEY (ingredient_id, organization_id) REFERENCES public.ingredients(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.purchase_order_lines ADD CONSTRAINT fk_po_line_order_organization
  FOREIGN KEY (purchase_order_id, organization_id) REFERENCES public.purchase_orders(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.purchase_order_lines ADD CONSTRAINT fk_po_line_ingredient_organization
  FOREIGN KEY (ingredient_id, organization_id) REFERENCES public.ingredients(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.stock_movements ADD CONSTRAINT fk_stock_movement_item_organization
  FOREIGN KEY (stock_item_id, organization_id) REFERENCES public.stock_items(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.stock_movements ADD CONSTRAINT fk_stock_movement_location_organization
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.sensor_devices ADD CONSTRAINT fk_sensor_device_location_organization
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.sensor_readings ADD CONSTRAINT fk_sensor_reading_location_organization
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.sensor_readings ADD CONSTRAINT fk_sensor_reading_device_organization
  FOREIGN KEY (device_id, organization_id) REFERENCES public.sensor_devices(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.audit_events ADD CONSTRAINT fk_audit_event_location_organization
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT;
ALTER TABLE public.notification_preferences ADD CONSTRAINT fk_notification_preference_membership
  FOREIGN KEY (organization_id, user_id)
  REFERENCES public.organization_memberships(organization_id, user_id) ON DELETE CASCADE;
ALTER TABLE public.device_push_tokens ADD CONSTRAINT fk_push_token_membership
  FOREIGN KEY (organization_id, user_id)
  REFERENCES public.organization_memberships(organization_id, user_id) ON DELETE CASCADE;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'corrective_actions','haccp_plan_versions','ingredients','purchase_order_lines',
    'stock_movements','sensor_readings'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_event ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_event AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_audit_event()',
      t
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Trigger repairs and secure object storage
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_temp_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.target_min IS NOT NULL AND NEW.reading < NEW.target_min)
     OR (NEW.target_max IS NOT NULL AND NEW.reading > NEW.target_max) THEN
    NEW.status := 'out_of_range';
    INSERT INTO public.alerts (
      user_id, organization_id, location_id, kind, severity, title, message,
      idempotency_key
    )
    SELECT DISTINCT m.user_id, NEW.organization_id, NEW.location_id,
      'temperature', 'critical', 'Temperature outside critical limit',
      format('%s: %s °C (limits %s–%s °C)', NEW.location, NEW.reading, NEW.target_min, NEW.target_max),
      'temperature:' || NEW.id::text || ':in_app:' || m.user_id::text
      FROM public.organization_memberships m
     WHERE m.organization_id = NEW.organization_id
       AND m.status = 'active'
       AND (m.role IN ('owner','manager','chef') OR m.user_id = NEW.user_id)
    ON CONFLICT (organization_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL DO NOTHING;

    INSERT INTO public.notification_outbox (
      organization_id, recipient_id, channel, template, payload, idempotency_key
    )
    SELECT m.organization_id, m.user_id, channel.name, 'temperature_out_of_range',
      jsonb_build_object(
        'severity', 'critical',
        'title', 'Temperature outside critical limit',
        'message', format('%s: %s °C (limits %s–%s °C)', NEW.location, NEW.reading, NEW.target_min, NEW.target_max),
        'temperature_log_id', NEW.id,
        'location_id', NEW.location_id
      ),
      'temperature:' || NEW.id::text || ':' || channel.name || ':' || m.user_id::text
      FROM public.organization_memberships m
      LEFT JOIN public.notification_preferences pref
        ON pref.user_id = m.user_id AND pref.organization_id = m.organization_id
      CROSS JOIN (VALUES ('email'), ('push')) AS channel(name)
     WHERE m.organization_id = NEW.organization_id
       AND m.status = 'active'
       AND m.role IN ('owner','manager','chef')
       AND (
         (channel.name = 'email' AND COALESCE(pref.email_enabled, true))
         OR (
           channel.name = 'push'
           AND COALESCE(pref.push_enabled, true)
           AND EXISTS (
             SELECT 1 FROM public.device_push_tokens token
              WHERE token.user_id = m.user_id
                AND token.organization_id = m.organization_id
                AND token.enabled
           )
         )
       )
    ON CONFLICT (idempotency_key) DO NOTHING;
  ELSE
    NEW.status := 'in_range';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_temp_alert ON public.temperature_logs;
CREATE TRIGGER trg_temp_alert
  BEFORE INSERT OR UPDATE OF reading, target_min, target_max ON public.temperature_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_temp_alert();

DROP TRIGGER IF EXISTS trg_activity_temp ON public.temperature_logs;
DROP TRIGGER IF EXISTS trg_temp_activity ON public.temperature_logs;
DROP TRIGGER IF EXISTS trg_activity_incident ON public.incidents;
DROP TRIGGER IF EXISTS trg_incident_activity ON public.incidents;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', false, 10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','text/csv']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'docs_%'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname); END LOOP;
END;
$$;
CREATE POLICY docs_select_scoped ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      public.can_read_organization(public.try_uuid((storage.foldername(name))[1]))
      OR EXISTS (
        SELECT 1 FROM public.documents document
         WHERE document.storage_path = name
           AND document.archived_at IS NULL
           AND public.has_valid_inspector_grant(
             document.organization_id, 'documents', document.location_id
           )
      )
    )
  );
CREATE POLICY docs_insert_scoped ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND ((storage.foldername(name))[1]) = public.current_organization_id()::text
    AND ((storage.foldername(name))[2]) = auth.uid()::text
    AND public.can_contribute_to_organization(public.current_organization_id())
  );
CREATE POLICY docs_update_scoped ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND ((storage.foldername(name))[1]) = public.current_organization_id()::text
    AND ((storage.foldername(name))[2]) = auth.uid()::text
  );
CREATE POLICY docs_delete_scoped ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND ((storage.foldername(name))[1]) = public.current_organization_id()::text
    AND (
      ((storage.foldername(name))[2]) = auth.uid()::text
      OR public.can_manage_organization(public.current_organization_id())
    )
  );

-- Prevent direct creation of privileged legacy roles.
REVOKE ALL ON public.organizations, public.locations, public.organization_memberships,
  public.inspector_access_grants, public.inspector_access_invitations,
  public.audit_events, public.notification_outbox, public.sensor_readings,
  public.device_push_tokens, public.subscriptions FROM anon;
GRANT SELECT ON public.organizations, public.locations, public.organization_memberships,
  public.inspector_access_grants, public.audit_events, public.haccp_plan_versions,
  public.sensor_readings, public.notification_outbox, public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations, public.organization_memberships TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.inspector_access_grants,
  public.organization_invitations, public.inspector_access_invitations FROM authenticated;
GRANT UPDATE (revoked_at) ON public.inspector_access_grants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.corrective_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredients, public.recipe_ingredients,
  public.purchase_order_lines, public.notification_preferences,
  public.device_push_tokens TO authenticated;
GRANT SELECT ON public.sensor_devices TO authenticated;
REVOKE UPDATE ON public.sensor_devices FROM authenticated;
GRANT UPDATE (name, target_min, target_max, is_active) ON public.sensor_devices TO authenticated;
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.haccp_plan_versions, public.sensor_readings,
  public.notification_outbox, public.subscriptions FROM authenticated;

COMMIT;
