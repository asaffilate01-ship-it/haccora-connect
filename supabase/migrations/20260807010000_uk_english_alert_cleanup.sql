-- Phase 21: make active automated alert copy UK English only.
-- Historical migration text is retained for an immutable migration lineage; these
-- replacement functions and data updates control the deployed runtime.

CREATE OR REPLACE FUNCTION public.tg_temp_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'out_of_range' THEN
    INSERT INTO public.alerts (user_id, kind, severity, title, message)
    VALUES (
      NEW.user_id,
      'temperature',
      'critical',
      'Temperature out of range',
      COALESCE(NEW.location, '') || ': ' || NEW.value_c::text || '°C'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_expiry_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_left int;
BEGIN
  IF NEW.expires_on IS NULL THEN
    RETURN NEW;
  END IF;
  days_left := NEW.expires_on - CURRENT_DATE;
  IF days_left <= 2 THEN
    INSERT INTO public.alerts (user_id, kind, severity, title, message)
    VALUES (
      NEW.user_id,
      'expiry',
      CASE WHEN days_left < 0 THEN 'critical' ELSE 'warning' END,
      CASE
        WHEN days_left < 0 THEN 'Expired: ' || NEW.name
        ELSE 'Expiring soon: ' || NEW.name
      END,
      'Expiry date: ' || NEW.expires_on::text
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_incident_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.severity = 'high' THEN
    INSERT INTO public.alerts (user_id, kind, severity, title, message)
    VALUES (NEW.user_id, 'incident', 'critical', 'High-severity incident', NEW.title);
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.alerts
SET title = regexp_replace(title, '^Temperatur außer Toleranz / ', '')
WHERE title LIKE 'Temperatur außer Toleranz / %';

UPDATE public.alerts
SET title = regexp_replace(title, '^Abgelaufen / ', '')
WHERE title LIKE 'Abgelaufen / %';

UPDATE public.alerts
SET title = regexp_replace(title, '^Läuft bald ab / ', '')
WHERE title LIKE 'Läuft bald ab / %';

UPDATE public.alerts
SET title = regexp_replace(title, '^Vorfall hoher Priorität / ', '')
WHERE title LIKE 'Vorfall hoher Priorität / %';
