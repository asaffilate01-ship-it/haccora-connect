BEGIN;

CREATE TABLE IF NOT EXISTS public.omniqora_location_links(
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  omniqora_tenant_id uuid NOT NULL,
  omniqora_location_id uuid NOT NULL,
  haccora_location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(organization_id,omniqora_location_id),
  UNIQUE(organization_id,haccora_location_id)
);

ALTER TABLE public.omniqora_location_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.omniqora_location_links FROM public,anon,authenticated;
GRANT SELECT ON public.omniqora_location_links TO authenticated;
GRANT ALL ON public.omniqora_location_links TO service_role;

CREATE POLICY omniqora_location_links_org_read
ON public.omniqora_location_links FOR SELECT TO authenticated
USING(public.has_org_role(organization_id,array['owner','manager']::public.app_role[]));

COMMIT;
