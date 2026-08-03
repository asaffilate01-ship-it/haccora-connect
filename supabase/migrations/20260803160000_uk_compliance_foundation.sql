-- Haccora UK: versioned, reviewable compliance content and responsibility ownership.
-- Official sources remain authoritative. Templates must be specialist-approved before publication.

CREATE TABLE IF NOT EXISTS public.compliance_content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction text NOT NULL CHECK (jurisdiction IN ('england','wales','northern_ireland','scotland')),
  content_key text NOT NULL,
  version text NOT NULL,
  title text NOT NULL,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  official_source_url text NOT NULL CHECK (official_source_url ~ '^https://'),
  source_reviewed_at date NOT NULL,
  specialist_approved_at timestamptz,
  specialist_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jurisdiction, content_key, version),
  CHECK (published_at IS NULL OR specialist_approved_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.site_compliance_profiles (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL,
  jurisdiction text NOT NULL CHECK (jurisdiction IN ('england','wales','northern_ireland','scotland')),
  business_type text NOT NULL DEFAULT 'caterer',
  serves_ppds boolean NOT NULL DEFAULT false,
  serves_vulnerable_groups boolean NOT NULL DEFAULT false,
  approved_content_version text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, location_id),
  FOREIGN KEY (organization_id, location_id)
    REFERENCES public.locations(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.responsibility_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL,
  control_area text NOT NULL CHECK (control_area IN
    ('pest','waste','extraction','gas','electrical','fire','water','equipment','other')),
  responsible_party text NOT NULL CHECK (responsible_party IN ('business','landlord','contractor','shared')),
  party_name text,
  evidence_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  next_review_at date,
  escalation_contact text,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, location_id)
    REFERENCES public.locations(organization_id, id) ON DELETE CASCADE
);

ALTER TABLE public.compliance_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_compliance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsibility_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS compliance_content_read ON public.compliance_content_versions;
CREATE POLICY compliance_content_read ON public.compliance_content_versions
FOR SELECT TO authenticated
USING (published_at IS NOT NULL AND retired_at IS NULL);

DROP POLICY IF EXISTS site_compliance_profiles_read ON public.site_compliance_profiles;
CREATE POLICY site_compliance_profiles_read ON public.site_compliance_profiles
FOR SELECT TO authenticated
USING (public.can_read_organization(organization_id));

DROP POLICY IF EXISTS site_compliance_profiles_manage ON public.site_compliance_profiles;
CREATE POLICY site_compliance_profiles_manage ON public.site_compliance_profiles
FOR ALL TO authenticated
USING (public.can_manage_organization(organization_id))
WITH CHECK (public.can_manage_organization(organization_id));

DROP POLICY IF EXISTS responsibility_assignments_read ON public.responsibility_assignments;
CREATE POLICY responsibility_assignments_read ON public.responsibility_assignments
FOR SELECT TO authenticated
USING (public.can_read_organization(organization_id)
  OR public.has_valid_inspector_grant(organization_id, 'documents', location_id));

DROP POLICY IF EXISTS responsibility_assignments_manage ON public.responsibility_assignments;
CREATE POLICY responsibility_assignments_manage ON public.responsibility_assignments
FOR ALL TO authenticated
USING (public.can_manage_organization(organization_id))
WITH CHECK (public.can_manage_organization(organization_id));

REVOKE ALL ON public.compliance_content_versions, public.site_compliance_profiles,
  public.responsibility_assignments FROM anon;
GRANT SELECT ON public.compliance_content_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_compliance_profiles,
  public.responsibility_assignments TO authenticated;

