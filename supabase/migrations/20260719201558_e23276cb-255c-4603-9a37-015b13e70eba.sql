
-- Attach compliance triggers to their tables

-- Temperature: alert + activity log on out_of_range
DROP TRIGGER IF EXISTS trg_temp_alert ON public.temperature_logs;
CREATE TRIGGER trg_temp_alert
  AFTER INSERT ON public.temperature_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_temp_alert();

DROP TRIGGER IF EXISTS trg_temp_activity ON public.temperature_logs;
CREATE TRIGGER trg_temp_activity
  AFTER INSERT ON public.temperature_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_activity_log_temp();

-- Incidents: alert on high severity + activity log for all
DROP TRIGGER IF EXISTS trg_incident_alert ON public.incidents;
CREATE TRIGGER trg_incident_alert
  AFTER INSERT OR UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.tg_incident_alert();

DROP TRIGGER IF EXISTS trg_incident_activity ON public.incidents;
CREATE TRIGGER trg_incident_activity
  AFTER INSERT OR UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.tg_activity_log_incident();

-- Expiry alerts
DROP TRIGGER IF EXISTS trg_expiry_alert ON public.expiry_items;
CREATE TRIGGER trg_expiry_alert
  AFTER INSERT OR UPDATE OF expires_on ON public.expiry_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_expiry_alert();

-- Updated_at triggers on major tables
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles','incidents','recipes','suppliers','stock_items','purchase_orders',
    'expiry_items','assets','audits','recalls','shifts','training_courses',
    'training_records','documents','haccp_hazards','waste_entries'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_updated_at ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t);
  END LOOP;
END $$;
