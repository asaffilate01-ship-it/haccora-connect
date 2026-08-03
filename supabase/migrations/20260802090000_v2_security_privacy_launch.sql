-- Haccora Operations Control v2 — phase 1
-- Security, privacy and launch controls. Apply after the 20260801 production migration.

CREATE TABLE public.privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('access', 'export', 'rectification', 'restriction', 'deletion', 'objection')),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'identity_verified', 'in_review', 'blocked_by_legal_hold', 'completed', 'rejected', 'cancelled')),
  details text CHECK (char_length(details) <= 2000),
  due_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  export_storage_path text,
  decision_notes text CHECK (char_length(decision_notes) <= 4000),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_fingerprint text NOT NULL CHECK (session_fingerprint ~ '^[a-f0-9]{64}$'),
  device_label text NOT NULL CHECK (char_length(device_label) BETWEEN 1 AND 120),
  platform text NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'ios', 'android')),
  user_agent_hash text CHECK (user_agent_hash IS NULL OR user_agent_hash ~ '^[a-f0-9]{64}$'),
  ip_hash text CHECK (ip_hash IS NULL OR ip_hash ~ '^[a-f0-9]{64}$'),
  assurance_level text NOT NULL DEFAULT 'aal1' CHECK (assurance_level IN ('aal1', 'aal2')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (user_id, session_fingerprint)
);

CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (char_length(event_type) BETWEEN 3 AND 100),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  source text NOT NULL DEFAULT 'application' CHECK (source IN ('application', 'authentication', 'edge', 'sensor', 'administrator')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  ip_hash text CHECK (ip_hash IS NULL OR ip_hash ~ '^[a-f0-9]{64}$'),
  user_agent_hash text CHECK (user_agent_hash IS NULL OR user_agent_hash ~ '^[a-f0-9]{64}$'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.high_risk_action_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('owner_transfer', 'role_elevation', 'bulk_export', 'inspector_grant', 'account_deletion', 'retention_change', 'legal_hold_release')),
  resource_type text,
  resource_id uuid,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 1000),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'executed', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_reason text CHECK (char_length(decision_reason) <= 1000),
  decided_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (decided_by IS NULL OR decided_by <> requested_by)
);

CREATE TABLE public.retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  data_class text NOT NULL CHECK (data_class IN ('operational_evidence', 'health', 'training', 'security', 'billing', 'support', 'uploads')),
  retain_days integer NOT NULL CHECK (retain_days BETWEEN 1 AND 3650),
  deletion_mode text NOT NULL DEFAULT 'review' CHECK (deletion_mode IN ('automatic', 'review', 'archive')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, data_class)
);

CREATE TABLE public.legal_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 160),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 2000),
  scope jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(scope) = 'object'),
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  released_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.file_scan_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'clean', 'infected', 'failed', 'dead_letter')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  provider_reference text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(result) = 'object'),
  last_error text CHECK (char_length(last_error) <= 1000),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id)
);

CREATE TABLE public.backup_restore_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  environment text NOT NULL CHECK (environment IN ('staging', 'production')),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'running', 'passed', 'failed')),
  recovery_point_minutes integer CHECK (recovery_point_minutes BETWEEN 0 AND 10080),
  recovery_time_minutes integer CHECK (recovery_time_minutes BETWEEN 0 AND 10080),
  evidence_storage_path text,
  notes text CHECK (char_length(notes) <= 4000),
  performed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.webhook_replay_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration text NOT NULL,
  nonce_hash text NOT NULL CHECK (nonce_hash ~ '^[a-f0-9]{64}$'),
  received_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE (integration, nonce_hash)
);

CREATE TABLE public.rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX privacy_requests_org_status_idx ON public.privacy_requests (organization_id, status, due_at);
CREATE INDEX device_sessions_user_active_idx ON public.device_sessions (user_id, last_seen_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX security_events_org_time_idx ON public.security_events (organization_id, occurred_at DESC);
CREATE INDEX high_risk_pending_idx ON public.high_risk_action_requests (organization_id, expires_at) WHERE status = 'pending';
CREATE INDEX file_scan_claim_idx ON public.file_scan_jobs (next_attempt_at, created_at) WHERE status IN ('pending', 'failed');
CREATE INDEX webhook_nonce_expiry_idx ON public.webhook_replay_nonces (expires_at);

ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.high_risk_action_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_restore_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_replay_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY privacy_request_self_or_manager_read ON public.privacy_requests FOR SELECT TO authenticated
USING (requested_by = auth.uid() OR public.can_manage_organization(organization_id));
CREATE POLICY privacy_request_self_create ON public.privacy_requests FOR INSERT TO authenticated
WITH CHECK (requested_by = auth.uid() AND public.can_read_organization(organization_id));
CREATE POLICY privacy_request_manager_update ON public.privacy_requests FOR UPDATE TO authenticated
USING (public.can_manage_organization(organization_id)) WITH CHECK (public.can_manage_organization(organization_id));

CREATE POLICY device_session_self_read ON public.device_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY device_session_self_update ON public.device_sessions FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND organization_id = public.current_organization_id());

CREATE POLICY security_event_actor_or_manager_read ON public.security_events FOR SELECT TO authenticated
USING (actor_id = auth.uid() OR public.can_manage_organization(organization_id));

CREATE POLICY high_risk_manager_read ON public.high_risk_action_requests FOR SELECT TO authenticated
USING (public.can_manage_organization(organization_id));
CREATE POLICY high_risk_manager_create ON public.high_risk_action_requests FOR INSERT TO authenticated
WITH CHECK (requested_by = auth.uid() AND public.can_manage_organization(organization_id));

CREATE POLICY retention_manager_read ON public.retention_policies FOR SELECT TO authenticated
USING (public.can_manage_organization(organization_id));
CREATE POLICY retention_manager_write ON public.retention_policies FOR ALL TO authenticated
USING (public.can_manage_organization(organization_id)) WITH CHECK (public.can_manage_organization(organization_id));

CREATE POLICY legal_hold_manager_read ON public.legal_holds FOR SELECT TO authenticated
USING (public.can_manage_organization(organization_id));
CREATE POLICY legal_hold_owner_write ON public.legal_holds FOR ALL TO authenticated
USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'owner')
WITH CHECK (organization_id = public.current_organization_id() AND public.current_user_role() = 'owner');

CREATE POLICY scan_job_manager_read ON public.file_scan_jobs FOR SELECT TO authenticated
USING (public.can_manage_organization(organization_id));
CREATE POLICY restore_drill_manager_read ON public.backup_restore_drills FOR SELECT TO authenticated
USING (public.can_manage_organization(organization_id));
CREATE POLICY restore_drill_owner_write ON public.backup_restore_drills FOR ALL TO authenticated
USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'owner')
WITH CHECK (organization_id = public.current_organization_id() AND public.current_user_role() = 'owner');

CREATE OR REPLACE FUNCTION public.register_device_session(
  p_session_fingerprint text,
  p_device_label text,
  p_platform text,
  p_user_agent_hash text DEFAULT NULL,
  p_ip_hash text DEFAULT NULL,
  p_assurance_level text DEFAULT 'aal1'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_id uuid; v_org uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF p_session_fingerprint !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid fingerprint'; END IF;
  v_org := public.current_organization_id();
  IF v_org IS NULL THEN RAISE EXCEPTION 'workspace required'; END IF;
  INSERT INTO public.device_sessions (organization_id, user_id, session_fingerprint, device_label, platform, user_agent_hash, ip_hash, assurance_level)
  VALUES (v_org, auth.uid(), p_session_fingerprint, left(p_device_label, 120), p_platform, p_user_agent_hash, p_ip_hash, p_assurance_level)
  ON CONFLICT (user_id, session_fingerprint) DO UPDATE SET
    last_seen_at = now(), device_label = EXCLUDED.device_label, platform = EXCLUDED.platform,
    user_agent_hash = EXCLUDED.user_agent_hash, ip_hash = EXCLUDED.ip_hash,
    assurance_level = EXCLUDED.assurance_level, revoked_at = NULL
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.record_security_event(
  p_event_type text,
  p_severity text DEFAULT 'info',
  p_source text DEFAULT 'application',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_ip_hash text DEFAULT NULL,
  p_user_agent_hash text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_id uuid; v_org uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  v_org := public.current_organization_id();
  IF v_org IS NULL THEN RAISE EXCEPTION 'workspace required'; END IF;
  IF p_event_type NOT IN ('mfa_enrolled', 'mfa_removed', 'other_sessions_signed_out', 'privacy_request_submitted', 'password_changed', 'device_registered') THEN
    RAISE EXCEPTION 'unsupported client event';
  END IF;
  INSERT INTO public.security_events (organization_id, location_id, actor_id, event_type, severity, source, metadata, ip_hash, user_agent_hash)
  VALUES (v_org, public.current_location_id(), auth.uid(), p_event_type, p_severity, p_source, coalesce(p_metadata, '{}'::jsonb), p_ip_hash, p_user_agent_hash)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.decide_high_risk_action(
  p_request_id uuid,
  p_approve boolean,
  p_reason text
) RETURNS public.high_risk_action_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_row public.high_risk_action_requests;
BEGIN
  SELECT * INTO v_row FROM public.high_risk_action_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_manage_organization(v_row.organization_id) THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF v_row.requested_by = auth.uid() THEN RAISE EXCEPTION 'two-person approval required'; END IF;
  IF v_row.status <> 'pending' OR v_row.expires_at <= now() THEN RAISE EXCEPTION 'request is not active'; END IF;
  UPDATE public.high_risk_action_requests SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    decided_by = auth.uid(), decision_reason = left(p_reason, 1000), decided_at = now(), updated_at = now()
  WHERE id = p_request_id RETURNING * INTO v_row;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 THEN RAISE EXCEPTION 'invalid rate limit'; END IF;
  INSERT INTO public.rate_limit_buckets (bucket_key, request_count) VALUES (encode(extensions.digest(p_bucket_key, 'sha256'), 'hex'), 1)
  ON CONFLICT (bucket_key) DO UPDATE SET
    window_started_at = CASE WHEN public.rate_limit_buckets.window_started_at < now() - make_interval(secs => p_window_seconds) THEN now() ELSE public.rate_limit_buckets.window_started_at END,
    request_count = CASE WHEN public.rate_limit_buckets.window_started_at < now() - make_interval(secs => p_window_seconds) THEN 1 ELSE public.rate_limit_buckets.request_count + 1 END,
    updated_at = now()
  RETURNING request_count INTO v_count;
  RETURN v_count <= p_limit;
END $$;

CREATE OR REPLACE FUNCTION public.claim_file_scan_jobs(p_limit integer DEFAULT 10)
RETURNS SETOF public.file_scan_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.file_scan_jobs j SET status = 'processing', attempts = attempts + 1, locked_at = now(), updated_at = now()
  WHERE j.id IN (
    SELECT id FROM public.file_scan_jobs
    WHERE status IN ('pending', 'failed') AND next_attempt_at <= now()
    ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT least(greatest(p_limit, 1), 50)
  ) RETURNING j.*;
END $$;

CREATE OR REPLACE FUNCTION public.queue_document_scan() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.storage_path IS NOT NULL AND NEW.archived_at IS NULL THEN
    INSERT INTO public.file_scan_jobs (organization_id, document_id, storage_path)
    VALUES (NEW.organization_id, NEW.id, NEW.storage_path)
    ON CONFLICT (document_id) DO UPDATE SET storage_path = EXCLUDED.storage_path, status = 'pending', attempts = 0, next_attempt_at = now(), updated_at = now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_queue_document_scan ON public.documents;
CREATE TRIGGER trg_queue_document_scan AFTER INSERT OR UPDATE OF storage_path ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.queue_document_scan();

INSERT INTO public.file_scan_jobs (organization_id, document_id, storage_path)
SELECT organization_id, id, storage_path FROM public.documents
WHERE storage_path IS NOT NULL AND archived_at IS NULL
ON CONFLICT (document_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_document_scan_status(p_document_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT job.status
  FROM public.file_scan_jobs job
  JOIN public.documents document ON document.id = job.document_id
  WHERE document.id = p_document_id
    AND (
      public.can_read_organization(document.organization_id)
      OR public.has_valid_inspector_grant(document.organization_id, 'documents', document.location_id)
    )
$$;

DROP POLICY IF EXISTS docs_select_scoped ON storage.objects;
CREATE POLICY docs_select_scoped ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.documents document
    JOIN public.file_scan_jobs scan ON scan.document_id = document.id AND scan.status = 'clean'
    WHERE document.storage_path = name
      AND document.archived_at IS NULL
      AND (
        public.can_read_organization(document.organization_id)
        OR public.has_valid_inspector_grant(document.organization_id, 'documents', document.location_id)
      )
  )
);

REVOKE ALL ON public.webhook_replay_nonces, public.rate_limit_buckets FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_file_scan_jobs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_file_scan_jobs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.register_device_session(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_security_event(text, text, text, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_high_risk_action(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_document_scan_status(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_security_event_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$ BEGIN RAISE EXCEPTION 'security events are immutable'; END $$;
CREATE TRIGGER security_events_immutable BEFORE UPDATE OR DELETE ON public.security_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_security_event_mutation();

INSERT INTO public.retention_policies (organization_id, data_class, retain_days, deletion_mode)
SELECT id, policy.data_class, policy.retain_days, 'review'
FROM public.organizations CROSS JOIN (VALUES
  ('operational_evidence', 730), ('health', 365), ('training', 730), ('security', 365), ('billing', 3650), ('support', 365), ('uploads', 730)
) AS policy(data_class, retain_days)
ON CONFLICT (organization_id, data_class) DO NOTHING;
