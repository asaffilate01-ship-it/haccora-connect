CREATE OR REPLACE FUNCTION public.tg_temp_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'out_of_range' THEN
    INSERT INTO public.alerts (user_id, kind, severity, title, message)
    VALUES (NEW.user_id, 'temperature', 'critical', 'Temperature out of range',
      COALESCE(NEW.location, '') || ': ' || NEW.reading::text || '°C');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.tg_activity_log_temp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'out_of_range' THEN
    INSERT INTO public.activity_logs (user_id, action, entity, entity_id, meta)
    VALUES (NEW.user_id, 'out_of_range', 'temperature_log', NEW.id,
      jsonb_build_object('location', NEW.location, 'reading', NEW.reading));
  END IF;
  RETURN NEW;
END; $$;