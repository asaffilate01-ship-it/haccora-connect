-- 1. Hide sensitive profile columns from other signed-in users (no column-level select for vat_id/business_state)
REVOKE SELECT ON public.profiles FROM authenticated;
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(format('%I', column_name), ', ')
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'profiles'
     AND column_name NOT IN ('vat_id', 'business_state');
  EXECUTE format('GRANT SELECT (%s) ON public.profiles TO authenticated', cols);
END
$$;
GRANT ALL ON public.profiles TO service_role;

-- 2. Inspector reads of organizations must respect the granted evidence scope
DROP POLICY IF EXISTS organizations_read ON public.organizations;
CREATE POLICY organizations_read ON public.organizations
  FOR SELECT TO authenticated
  USING (
    public.can_read_organization(id)
    OR public.has_valid_inspector_grant(id, 'organisation_details')
  );

-- 3. Workflow step results must be bound to the caller's active organisation
DROP POLICY IF EXISTS workflow_results_write ON public.workflow_step_results;
CREATE POLICY workflow_results_write ON public.workflow_step_results
  FOR INSERT TO authenticated
  WITH CHECK (
    completed_by = auth.uid()
    AND public.can_contribute_to_organization(organization_id)
    AND organization_id = public.current_organization_id()
  );