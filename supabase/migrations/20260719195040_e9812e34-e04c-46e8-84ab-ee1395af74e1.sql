
-- Auto-alerting triggers for compliance events

-- 1) Temperature out-of-range → create alert
CREATE OR REPLACE FUNCTION public.tg_temp_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'out_of_range' THEN
    INSERT INTO public.alerts (user_id, kind, severity, title, message)
    VALUES (
      NEW.user_id,
      'temperature',
      'critical',
      'Temperatur außer Toleranz / Temperature out of range',
      COALESCE(NEW.location,'') || ': ' || NEW.value_c::text || '°C'
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_temp_alert ON public.temperature_logs;
CREATE TRIGGER trg_temp_alert
AFTER INSERT ON public.temperature_logs
FOR EACH ROW EXECUTE FUNCTION public.tg_temp_alert();

-- 2) Expiry within 2 days or expired → create alert
CREATE OR REPLACE FUNCTION public.tg_expiry_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE days_left int;
BEGIN
  IF NEW.expires_on IS NULL THEN RETURN NEW; END IF;
  days_left := (NEW.expires_on - CURRENT_DATE);
  IF days_left <= 2 THEN
    INSERT INTO public.alerts (user_id, kind, severity, title, message)
    VALUES (
      NEW.user_id,
      'expiry',
      CASE WHEN days_left < 0 THEN 'critical' ELSE 'warning' END,
      CASE WHEN days_left < 0
        THEN 'Abgelaufen / Expired: ' || NEW.name
        ELSE 'Läuft bald ab / Expiring soon: ' || NEW.name END,
      'MHD: ' || NEW.expires_on::text
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_expiry_alert ON public.expiry_items;
CREATE TRIGGER trg_expiry_alert
AFTER INSERT ON public.expiry_items
FOR EACH ROW EXECUTE FUNCTION public.tg_expiry_alert();

-- 3) High-severity incident → create alert
CREATE OR REPLACE FUNCTION public.tg_incident_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.severity = 'high' THEN
    INSERT INTO public.alerts (user_id, kind, severity, title, message)
    VALUES (
      NEW.user_id,
      'incident',
      'critical',
      'Vorfall hoher Priorität / High-severity incident',
      NEW.title
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_incident_alert ON public.incidents;
CREATE TRIGGER trg_incident_alert
AFTER INSERT ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.tg_incident_alert();

-- 4) Activity log helper: log incident creations (audit trail for inspectors)
CREATE OR REPLACE FUNCTION public.tg_activity_log_incident()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action, entity, entity_id, meta)
  VALUES (NEW.user_id, TG_OP, 'incident', NEW.id, jsonb_build_object('title', NEW.title, 'severity', NEW.severity, 'status', NEW.status));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_activity_incident ON public.incidents;
CREATE TRIGGER trg_activity_incident
AFTER INSERT OR UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.tg_activity_log_incident();

-- 5) Log temperature out-of-range to activity log
CREATE OR REPLACE FUNCTION public.tg_activity_log_temp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'out_of_range' THEN
    INSERT INTO public.activity_logs (user_id, action, entity, entity_id, meta)
    VALUES (NEW.user_id, 'out_of_range', 'temperature_log', NEW.id,
            jsonb_build_object('location', NEW.location, 'value_c', NEW.value_c));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_activity_temp ON public.temperature_logs;
CREATE TRIGGER trg_activity_temp
AFTER INSERT ON public.temperature_logs
FOR EACH ROW EXECUTE FUNCTION public.tg_activity_log_temp();
