-- Defence in depth: sensor telemetry writes must be tenant-scoped.
DROP POLICY IF EXISTS sensor_readings_insert ON public.sensor_readings;
DROP POLICY IF EXISTS sensor_readings_update ON public.sensor_readings;
DROP POLICY IF EXISTS sensor_readings_delete ON public.sensor_readings;

CREATE POLICY sensor_readings_insert ON public.sensor_readings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_organization(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.sensor_devices device
       WHERE device.id = sensor_readings.device_id
         AND device.organization_id = sensor_readings.organization_id
    )
  );

CREATE POLICY sensor_readings_update ON public.sensor_readings
  FOR UPDATE TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (public.can_manage_organization(organization_id));

CREATE POLICY sensor_readings_delete ON public.sensor_readings
  FOR DELETE TO authenticated
  USING (public.can_manage_organization(organization_id));