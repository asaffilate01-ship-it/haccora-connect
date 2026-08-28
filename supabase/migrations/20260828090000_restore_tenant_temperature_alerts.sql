-- Restore the tenant-aware temperature automation after the 20260827230218
-- function replacement regressed fan-out, notifications and audit metadata.
-- Published migrations remain immutable; this forward migration is the active
-- runtime definition.

CREATE OR REPLACE FUNCTION public.tg_temp_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message text;
BEGIN
  IF (NEW.target_min IS NOT NULL AND NEW.reading < NEW.target_min)
     OR (NEW.target_max IS NOT NULL AND NEW.reading > NEW.target_max) THEN
    NEW.status := 'out_of_range';
    v_message := format(
      '%s: %s °C (limits %s–%s °C)',
      NEW.location,
      NEW.reading,
      NEW.target_min,
      NEW.target_max
    );

    INSERT INTO public.alerts (
      user_id,
      organization_id,
      location_id,
      kind,
      severity,
      title,
      message,
      idempotency_key
    )
    SELECT DISTINCT
      membership.user_id,
      NEW.organization_id,
      NEW.location_id,
      'temperature',
      'critical',
      'Temperature outside critical limit',
      v_message,
      'temperature:' || NEW.id::text || ':in_app:' || membership.user_id::text
    FROM public.organization_memberships AS membership
    WHERE membership.organization_id = NEW.organization_id
      AND membership.status = 'active'
      AND (
        membership.role IN ('owner', 'manager', 'chef')
        OR membership.user_id = NEW.user_id
      )
    ON CONFLICT (organization_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL
      DO NOTHING;

    INSERT INTO public.notification_outbox (
      organization_id,
      recipient_id,
      channel,
      template,
      payload,
      idempotency_key
    )
    SELECT
      membership.organization_id,
      membership.user_id,
      channel.name,
      'temperature_out_of_range',
      jsonb_build_object(
        'severity', 'critical',
        'title', 'Temperature outside critical limit',
        'message', v_message,
        'temperature_log_id', NEW.id,
        'location_id', NEW.location_id
      ),
      'temperature:' || NEW.id::text || ':' || channel.name || ':' || membership.user_id::text
    FROM public.organization_memberships AS membership
    LEFT JOIN public.notification_preferences AS preference
      ON preference.user_id = membership.user_id
      AND preference.organization_id = membership.organization_id
    CROSS JOIN (VALUES ('email'), ('push')) AS channel(name)
    WHERE membership.organization_id = NEW.organization_id
      AND membership.status = 'active'
      AND membership.role IN ('owner', 'manager', 'chef')
      AND (
        (channel.name = 'email' AND COALESCE(preference.email_enabled, true))
        OR (
          channel.name = 'push'
          AND COALESCE(preference.push_enabled, true)
          AND EXISTS (
            SELECT 1
            FROM public.device_push_tokens AS token
            WHERE token.user_id = membership.user_id
              AND token.organization_id = membership.organization_id
              AND token.enabled
          )
        )
      )
    ON CONFLICT (idempotency_key) DO NOTHING;
  ELSE
    NEW.status := 'in_range';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_temp_alert ON public.temperature_logs;
CREATE TRIGGER trg_temp_alert
  BEFORE INSERT OR UPDATE OF reading, target_min, target_max
  ON public.temperature_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_temp_alert();

CREATE OR REPLACE FUNCTION public.tg_activity_log_temp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'out_of_range' THEN
    INSERT INTO public.activity_logs (
      user_id,
      organization_id,
      location_id,
      action,
      entity,
      entity_id,
      meta,
      idempotency_key
    )
    VALUES (
      NEW.user_id,
      NEW.organization_id,
      NEW.location_id,
      'out_of_range',
      'temperature_log',
      NEW.id,
      jsonb_build_object(
        'location', NEW.location,
        'reading', NEW.reading,
        'target_min', NEW.target_min,
        'target_max', NEW.target_max
      ),
      'temperature:' || NEW.id::text || ':activity'
    )
    ON CONFLICT (organization_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL
      DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_temp ON public.temperature_logs;
DROP TRIGGER IF EXISTS trg_temp_activity ON public.temperature_logs;
CREATE TRIGGER trg_temp_activity
  AFTER INSERT OR UPDATE OF reading, target_min, target_max
  ON public.temperature_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_activity_log_temp();
