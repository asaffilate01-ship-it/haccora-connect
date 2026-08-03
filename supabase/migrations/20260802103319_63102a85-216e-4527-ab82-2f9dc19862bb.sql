-- Haccora V2 / File 3: entitlements, billing event integrity, API/webhook
-- governance, native preferences and explicit offline conflict resolution.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'eur' CHECK (currency ~ '^[a-z]{3}$'),
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS last_event_at timestamptz;

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.subscription_entitlements (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  entitlement text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  limit_value bigint CHECK (limit_value IS NULL OR limit_value >= 0),
  source text NOT NULL DEFAULT 'plan' CHECK (source IN ('plan','override','trial')),
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, entitlement),
  CHECK (effective_until IS NULL OR effective_until > effective_from)
);

CREATE TABLE IF NOT EXISTS public.usage_counters (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  metric text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  quantity bigint NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, metric, period_start),
  CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'stripe',
  provider_event_id text NOT NULL UNIQUE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  livemode boolean NOT NULL DEFAULT false,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  payload jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received','processed','ignored','failed')),
  processing_error text,
  occurred_at timestamptz NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id()
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  public_key text NOT NULL UNIQUE,
  secret_hash text NOT NULL CHECK (secret_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id()
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  url text NOT NULL CHECK (url ~ '^https://'),
  signing_secret_hash text NOT NULL CHECK (signing_secret_hash ~ '^[0-9a-f]{64}$'),
  encrypted_signing_secret text NOT NULL,
  event_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  enabled boolean NOT NULL DEFAULT true,
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  disabled_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, url)
);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  endpoint_id uuid NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE RESTRICT,
  event_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','delivered','failed','dead_letter')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  response_status integer,
  response_excerpt text,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.user_experience_preferences (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  locale text NOT NULL DEFAULT 'en' CHECK (locale IN ('de','en')),
  glove_mode boolean NOT NULL DEFAULT false,
  reduced_motion boolean NOT NULL DEFAULT false,
  high_contrast boolean NOT NULL DEFAULT false,
  biometric_lock boolean NOT NULL DEFAULT false,
  default_station text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.sync_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  client_mutation_id text NOT NULL,
  entity_table text NOT NULL,
  entity_id uuid,
  client_payload jsonb NOT NULL,
  server_payload jsonb,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','client_accepted','server_accepted','merged','dismissed')),
  resolution jsonb,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, client_mutation_id)
);

CREATE INDEX IF NOT EXISTS billing_events_org_idx
  ON public.billing_events (organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS webhook_delivery_queue_idx
  ON public.webhook_deliveries (status, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS sync_conflicts_open_idx
  ON public.sync_conflicts (organization_id, status, created_at);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'subscription_entitlements','usage_counters','billing_events','api_clients',
    'webhook_endpoints','webhook_deliveries','user_experience_preferences','sync_conflicts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END;
$$;

CREATE POLICY entitlements_read ON public.subscription_entitlements FOR SELECT TO authenticated
  USING (public.can_read_organization(organization_id));
CREATE POLICY usage_read ON public.usage_counters FOR SELECT TO authenticated
  USING (public.can_manage_organization(organization_id));
CREATE POLICY billing_events_read ON public.billing_events FOR SELECT TO authenticated
  USING (public.can_manage_organization(organization_id));
CREATE POLICY api_clients_read ON public.api_clients FOR SELECT TO authenticated
  USING (public.can_manage_organization(organization_id));
CREATE POLICY webhook_endpoints_read ON public.webhook_endpoints FOR SELECT TO authenticated
  USING (public.can_manage_organization(organization_id));
CREATE POLICY webhook_deliveries_read ON public.webhook_deliveries FOR SELECT TO authenticated
  USING (public.can_manage_organization(organization_id));
CREATE POLICY experience_self_read ON public.user_experience_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.can_read_organization(organization_id));
CREATE POLICY experience_self_write ON public.user_experience_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.can_read_organization(organization_id))
  WITH CHECK (user_id = auth.uid() AND public.can_read_organization(organization_id));
CREATE POLICY sync_conflicts_read ON public.sync_conflicts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_organization(organization_id));
CREATE POLICY sync_conflicts_update ON public.sync_conflicts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_organization(organization_id))
  WITH CHECK (user_id = auth.uid() OR public.can_manage_organization(organization_id));

GRANT INSERT, UPDATE ON public.user_experience_preferences TO authenticated;
GRANT UPDATE (status, resolution, resolved_by, resolved_at) ON public.sync_conflicts TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.subscription_entitlements, public.usage_counters,
  public.billing_events, public.api_clients, public.webhook_endpoints,
  public.webhook_deliveries FROM authenticated;
REVOKE SELECT ON public.webhook_endpoints FROM authenticated;
GRANT SELECT (id, organization_id, name, url, event_types, enabled, failure_count,
  disabled_at, created_by, created_at, updated_at) ON public.webhook_endpoints TO authenticated;
REVOKE SELECT ON public.api_clients FROM authenticated;
GRANT SELECT (id, organization_id, name, public_key, scopes, last_used_at, expires_at,
  revoked_at, created_by, created_at) ON public.api_clients TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_entitlements()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_object_agg(entitlement, jsonb_build_object(
    'enabled', enabled,
    'limit', limit_value,
    'source', source,
    'effective_until', effective_until
  )), '{}'::jsonb)
  FROM public.subscription_entitlements
  WHERE organization_id = public.current_organization_id()
    AND (effective_until IS NULL OR effective_until > now())
$$;

REVOKE ALL ON FUNCTION public.get_my_entitlements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_entitlements() TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_usage(
  p_organization_id uuid,
  p_metric text,
  p_quantity bigint DEFAULT 1
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_quantity bigint; v_start date := date_trunc('month', now())::date;
BEGIN
  IF auth.role() <> 'service_role' OR p_quantity <= 0 THEN RAISE EXCEPTION 'service role required'; END IF;
  INSERT INTO public.usage_counters (organization_id, metric, period_start, period_end, quantity)
  VALUES (p_organization_id, p_metric, v_start, (v_start + interval '1 month - 1 day')::date, p_quantity)
  ON CONFLICT (organization_id, metric, period_start)
  DO UPDATE SET quantity = public.usage_counters.quantity + EXCLUDED.quantity, updated_at = now()
  RETURNING quantity INTO v_quantity;
  RETURN v_quantity;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_usage(uuid,text,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(uuid,text,bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_webhook_deliveries(p_limit integer DEFAULT 25)
RETURNS SETOF public.webhook_deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service role required'; END IF;
  RETURN QUERY
  UPDATE public.webhook_deliveries delivery SET
    status = 'processing', locked_at = now(), attempts = delivery.attempts + 1
  WHERE delivery.id IN (
    SELECT candidate.id FROM public.webhook_deliveries candidate
    WHERE candidate.status IN ('pending','failed') AND candidate.next_attempt_at <= now()
      AND (candidate.locked_at IS NULL OR candidate.locked_at < now() - interval '15 minutes')
    ORDER BY candidate.created_at
    FOR UPDATE SKIP LOCKED LIMIT greatest(1, least(p_limit, 100))
  )
  RETURNING delivery.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_webhook_deliveries(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webhook_deliveries(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.tg_queue_webhook_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid; v_type text; v_id uuid; v_payload jsonb;
BEGIN
  v_org := COALESCE(NEW.organization_id, OLD.organization_id);
  v_type := TG_TABLE_NAME || '.' || lower(TG_OP);
  v_id := gen_random_uuid();
  v_payload := jsonb_build_object(
    'id', v_id, 'type', v_type, 'occurred_at', now(),
    'organization_id', v_org, 'data', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
  );
  INSERT INTO public.webhook_deliveries (
    organization_id, endpoint_id, event_id, event_type, payload
  )
  SELECT endpoint.organization_id, endpoint.id, v_id, v_type, v_payload
  FROM public.webhook_endpoints endpoint
  WHERE endpoint.organization_id = v_org AND endpoint.enabled
    AND (cardinality(endpoint.event_types) = 0 OR v_type = ANY(endpoint.event_types))
  ON CONFLICT (endpoint_id, event_id) DO NOTHING;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_corrective_action_webhook ON public.corrective_actions;
CREATE TRIGGER trg_corrective_action_webhook
  AFTER INSERT OR UPDATE ON public.corrective_actions
  FOR EACH ROW EXECUTE FUNCTION public.tg_queue_webhook_event();
DROP TRIGGER IF EXISTS trg_workflow_run_webhook ON public.workflow_runs;
CREATE TRIGGER trg_workflow_run_webhook
  AFTER INSERT OR UPDATE ON public.workflow_runs
  FOR EACH ROW EXECUTE FUNCTION public.tg_queue_webhook_event();
