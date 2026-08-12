-- 1. Custom role profiles: explicit, owner/manager-only write paths.
DROP POLICY IF EXISTS organization_roles_tenant_insert ON public.organization_roles;
DROP POLICY IF EXISTS organization_roles_tenant_update ON public.organization_roles;
DROP POLICY IF EXISTS organization_roles_tenant_delete ON public.organization_roles;

CREATE POLICY organization_roles_tenant_insert ON public.organization_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.has_org_role(organization_id, ARRAY['owner','manager']::public.app_role[])
  );

CREATE POLICY organization_roles_tenant_update ON public.organization_roles
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.has_org_role(organization_id, ARRAY['owner','manager']::public.app_role[])
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.has_org_role(organization_id, ARRAY['owner','manager']::public.app_role[])
  );

CREATE POLICY organization_roles_tenant_delete ON public.organization_roles
  FOR DELETE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.has_org_role(organization_id, ARRAY['owner','manager']::public.app_role[])
  );

-- 2. Recipe ingredients: remove the blanket role write path that bypassed
--    custom role permission profiles. Allergen edits now always run through
--    custom_role_allows(), which still permits owners and unrestricted roles.
DROP POLICY IF EXISTS recipe_ingredients_write ON public.recipe_ingredients;

-- 3. Sensor devices: managers can register and retire their own devices.
DROP POLICY IF EXISTS sensor_devices_insert ON public.sensor_devices;
DROP POLICY IF EXISTS sensor_devices_delete ON public.sensor_devices;

CREATE POLICY sensor_devices_insert ON public.sensor_devices
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.can_manage_organization(organization_id)
  );

CREATE POLICY sensor_devices_delete ON public.sensor_devices
  FOR DELETE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.can_manage_organization(organization_id)
  );