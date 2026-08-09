-- 1. Hide secret columns from client roles (column-level grants)
REVOKE SELECT, UPDATE, INSERT, REFERENCES ON public.api_clients FROM anon, authenticated;
GRANT SELECT (id, organization_id, name, scopes, last_used_at, expires_at, revoked_at, created_by, created_at) ON public.api_clients TO authenticated;

REVOKE SELECT, UPDATE, INSERT, REFERENCES ON public.sensor_devices FROM anon, authenticated;
GRANT SELECT (id, organization_id, location_id, name, external_device_id, target_min, target_max, is_active, last_seen_at, created_by, created_at) ON public.sensor_devices TO authenticated;
GRANT UPDATE (name, location_id, target_min, target_max, is_active) ON public.sensor_devices TO authenticated;

REVOKE SELECT, UPDATE, INSERT, REFERENCES ON public.webhook_endpoints FROM anon, authenticated;
GRANT SELECT (id, organization_id, name, url, event_types, enabled, disabled_at, failure_count, created_by, created_at, updated_at) ON public.webhook_endpoints TO authenticated;

-- 2. contact_requests: platform-staff read only, no client writes
REVOKE ALL ON public.contact_requests FROM anon, authenticated;
GRANT ALL ON public.contact_requests TO service_role;
GRANT SELECT ON public.contact_requests TO authenticated;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contact_requests_platform_read ON public.contact_requests;
CREATE POLICY contact_requests_platform_read ON public.contact_requests
  FOR SELECT TO authenticated
  USING (public.is_platform_operator(auth.uid(), NULL));

-- 3. cleaning_tasks: enforce that location belongs to the same organisation
DROP POLICY IF EXISTS cleaning_tasks_insert ON public.cleaning_tasks;
CREATE POLICY cleaning_tasks_insert ON public.cleaning_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_organization(organization_id)
    AND created_by = auth.uid()
    AND (
      location_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.locations l
        WHERE l.id = cleaning_tasks.location_id
          AND l.organization_id = cleaning_tasks.organization_id
      )
    )
  );

DROP POLICY IF EXISTS cleaning_tasks_update ON public.cleaning_tasks;
CREATE POLICY cleaning_tasks_update ON public.cleaning_tasks
  FOR UPDATE TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (
    public.can_manage_organization(organization_id)
    AND (
      location_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.locations l
        WHERE l.id = cleaning_tasks.location_id
          AND l.organization_id = cleaning_tasks.organization_id
      )
    )
  );

-- 4. Fixed search_path on remaining helper
ALTER FUNCTION public.touch_updated_at() SET search_path = public, pg_temp;

-- 5. Revoke EXECUTE from signed-out visitors and PUBLIC on all public functions;
--    trigger helpers need no EXECUTE grants at all.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, pg_get_function_result(p.oid) = 'trigger' AS is_trigger
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.sig);
    IF fn.is_trigger THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn.sig);
    END IF;
  END LOOP;
END $$;
