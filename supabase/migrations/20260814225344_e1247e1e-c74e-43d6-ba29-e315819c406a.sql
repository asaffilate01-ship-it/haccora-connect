DROP POLICY IF EXISTS organizations_read ON public.organizations;
CREATE POLICY organizations_read ON public.organizations
  FOR SELECT TO authenticated
  USING (
    public.can_read_organization(id)
    OR public.has_valid_inspector_grant(id)
  );