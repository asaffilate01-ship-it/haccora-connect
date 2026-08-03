-- Haccora V2 / File 2: persistent workflow execution, corrective-action control,
-- sensor health, recall traceability and governed regulatory/training content.

ALTER TABLE public.corrective_actions
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'operations',
  ADD COLUMN IF NOT EXISTS immediate_action text,
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS corrective_action text,
  ADD COLUMN IF NOT EXISTS preventive_action text,
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE INDEX IF NOT EXISTS corrective_actions_queue_idx
  ON public.corrective_actions (organization_id, status, due_at, severity);

CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id()
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id uuid DEFAULT public.current_location_id()
    REFERENCES public.locations(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 160),
  category text NOT NULL DEFAULT 'operations',
  recurrence jsonb NOT NULL DEFAULT '{}'::jsonb,
  active_version_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (organization_id, location_id, name)
);

CREATE TABLE IF NOT EXISTS public.workflow_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.workflow_templates(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL DEFAULT public.current_organization_id()
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','approved','superseded','withdrawn')),
  change_summary text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  published_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version),
  UNIQUE (organization_id, id)
);

ALTER TABLE public.workflow_templates
  ADD CONSTRAINT workflow_templates_active_version_fk
  FOREIGN KEY (organization_id, active_version_id)
  REFERENCES public.workflow_template_versions(organization_id, id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.workflow_template_versions(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL DEFAULT public.current_organization_id()
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position > 0),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 240),
  instructions text,
  input_type text NOT NULL DEFAULT 'confirmation'
    CHECK (input_type IN ('confirmation','text','number','temperature','photo','document','choice')),
  required boolean NOT NULL DEFAULT true,
  evidence_required boolean NOT NULL DEFAULT false,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version_id, position)
);

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id()
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id uuid DEFAULT public.current_location_id()
    REFERENCES public.locations(id) ON DELETE SET NULL,
  template_id uuid NOT NULL REFERENCES public.workflow_templates(id) ON DELETE RESTRICT,
  version_id uuid NOT NULL REFERENCES public.workflow_template_versions(id) ON DELETE RESTRICT,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','in_progress','blocked','completed','cancelled','overdue')),
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  idempotency_key text NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.workflow_step_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id()
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  run_id uuid NOT NULL REFERENCES public.workflow_runs(id) ON DELETE RESTRICT,
  step_id uuid NOT NULL REFERENCES public.workflow_steps(id) ON DELETE RESTRICT,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','failed','skipped')),
  completed_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, step_id)
);

CREATE TABLE IF NOT EXISTS public.corrective_action_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id()
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  action_id uuid NOT NULL REFERENCES public.corrective_actions(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN (
    'created','assigned','started','evidence_added','escalated','verified','closed','reopened'
  )),
  note text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.unified_inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  item_type text NOT NULL,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  title text NOT NULL,
  summary text,
  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  due_at timestamptz,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_table, source_id, item_type)
);

CREATE TABLE IF NOT EXISTS public.sensor_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  device_id uuid NOT NULL REFERENCES public.sensor_devices(id) ON DELETE RESTRICT,
  health text NOT NULL CHECK (health IN ('healthy','warning','offline')),
  last_seen_at timestamptz,
  missing_minutes integer NOT NULL DEFAULT 0 CHECK (missing_minutes >= 0),
  assessed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, assessed_at)
);

CREATE TABLE IF NOT EXISTS public.traceability_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id()
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id uuid DEFAULT public.current_location_id()
    REFERENCES public.locations(id) ON DELETE SET NULL,
  from_type text NOT NULL,
  from_id text NOT NULL,
  to_type text NOT NULL,
  to_id text NOT NULL,
  lot_code text,
  quantity numeric,
  unit text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, from_type, from_id, to_type, to_id, lot_code)
);

CREATE TABLE IF NOT EXISTS public.recall_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id()
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id uuid DEFAULT public.current_location_id()
    REFERENCES public.locations(id) ON DELETE SET NULL,
  lot_code text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','running','completed','failed')),
  target_minutes integer NOT NULL DEFAULT 120 CHECK (target_minutes BETWEEN 5 AND 1440),
  started_at timestamptz,
  completed_at timestamptz,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  signed_off_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regulatory_content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT,
  jurisdiction text NOT NULL,
  topic text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  content jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','specialist_review','approved','withdrawn')),
  effective_from date,
  effective_until date,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  review_statement text,
  content_hash text GENERATED ALWAYS AS
    (encode(extensions.digest(content::text, 'sha256'), 'hex')) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (organization_id, jurisdiction, topic, version),
  CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until >= effective_from)
);

CREATE TABLE IF NOT EXISTS public.training_course_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id()
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  course_key text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  title text NOT NULL,
  content jsonb NOT NULL,
  pass_score integer NOT NULL DEFAULT 80 CHECK (pass_score BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','superseded','withdrawn')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, course_key, version)
);

CREATE TABLE IF NOT EXISTS public.training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_organization_id()
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id uuid DEFAULT public.current_location_id()
    REFERENCES public.locations(id) ON DELETE SET NULL,
  course_version_id uuid NOT NULL REFERENCES public.training_course_versions(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned','in_progress','passed','failed','expired')),
  score integer CHECK (score BETWEEN 0 AND 100),
  completed_at timestamptz,
  assigned_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_version_id, user_id)
);

CREATE INDEX IF NOT EXISTS workflow_runs_queue_idx
  ON public.workflow_runs (organization_id, status, due_at);
CREATE INDEX IF NOT EXISTS unified_inbox_queue_idx
  ON public.unified_inbox_items (organization_id, status, severity, due_at);
CREATE INDEX IF NOT EXISTS traceability_lot_idx
  ON public.traceability_edges (organization_id, lot_code, occurred_at);
CREATE INDEX IF NOT EXISTS training_assignments_due_idx
  ON public.training_assignments (organization_id, status, due_at);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workflow_templates','workflow_template_versions','workflow_steps','workflow_runs',
    'workflow_step_results','corrective_action_events','unified_inbox_items',
    'sensor_health_snapshots','traceability_edges','recall_drills',
    'regulatory_content_versions','training_course_versions','training_assignments'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END;
$$;

CREATE POLICY workflow_templates_read ON public.workflow_templates FOR SELECT TO authenticated
  USING (public.can_read_organization(organization_id));
CREATE POLICY workflow_templates_write ON public.workflow_templates FOR ALL TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (public.can_manage_organization(organization_id));
CREATE POLICY workflow_versions_read ON public.workflow_template_versions FOR SELECT TO authenticated
  USING (public.can_read_organization(organization_id));
CREATE POLICY workflow_versions_write ON public.workflow_template_versions FOR ALL TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (public.can_manage_organization(organization_id));
CREATE POLICY workflow_steps_read ON public.workflow_steps FOR SELECT TO authenticated
  USING (public.can_read_organization(organization_id));
CREATE POLICY workflow_steps_write ON public.workflow_steps FOR ALL TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (public.can_manage_organization(organization_id));
CREATE POLICY workflow_runs_read ON public.workflow_runs FOR SELECT TO authenticated
  USING (public.can_read_organization(organization_id));
CREATE POLICY workflow_runs_create ON public.workflow_runs FOR INSERT TO authenticated
  WITH CHECK (public.can_contribute_to_organization(organization_id));
CREATE POLICY workflow_runs_update ON public.workflow_runs FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR public.can_manage_organization(organization_id))
  WITH CHECK (assigned_to = auth.uid() OR public.can_manage_organization(organization_id));
CREATE POLICY workflow_results_read ON public.workflow_step_results FOR SELECT TO authenticated
  USING (public.can_read_organization(organization_id));
CREATE POLICY workflow_results_write ON public.workflow_step_results FOR INSERT TO authenticated
  WITH CHECK (completed_by = auth.uid() AND public.can_contribute_to_organization(organization_id));
CREATE POLICY corrective_events_read ON public.corrective_action_events FOR SELECT TO authenticated
  USING (public.can_read_organization(organization_id));
CREATE POLICY corrective_events_create ON public.corrective_action_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND public.can_contribute_to_organization(organization_id));
CREATE POLICY inbox_read ON public.unified_inbox_items FOR SELECT TO authenticated
  USING (public.can_read_organization(organization_id));
CREATE POLICY inbox_update ON public.unified_inbox_items FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.can_manage_organization(organization_id))
  WITH CHECK (owner_id = auth.uid() OR public.can_manage_organization(organization_id));
CREATE POLICY sensor_health_read ON public.sensor_health_snapshots FOR SELECT TO authenticated
  USING (public.can_read_organization(organization_id));
CREATE POLICY traceability_read ON public.traceability_edges FOR SELECT TO authenticated
  USING (
    public.can_read_organization(organization_id)
    OR public.has_valid_inspector_grant(organization_id, 'traceability', location_id)
  );
CREATE POLICY traceability_write ON public.traceability_edges FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.can_contribute_to_organization(organization_id));
CREATE POLICY recall_drills_read ON public.recall_drills FOR SELECT TO authenticated
  USING (
    public.can_read_organization(organization_id)
    OR public.has_valid_inspector_grant(organization_id, 'traceability', location_id)
  );
CREATE POLICY recall_drills_write ON public.recall_drills FOR ALL TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (public.can_manage_organization(organization_id));
CREATE POLICY regulatory_content_read ON public.regulatory_content_versions FOR SELECT TO authenticated
  USING (
    status = 'approved' AND
    (organization_id IS NULL OR public.can_read_organization(organization_id))
  );
CREATE POLICY regulatory_content_manage ON public.regulatory_content_versions FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND public.can_manage_organization(organization_id))
  WITH CHECK (organization_id IS NOT NULL AND public.can_manage_organization(organization_id));
CREATE POLICY training_versions_read ON public.training_course_versions FOR SELECT TO authenticated
  USING (public.can_read_organization(organization_id));
CREATE POLICY training_versions_manage ON public.training_course_versions FOR ALL TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (public.can_manage_organization(organization_id));
CREATE POLICY training_assignments_read ON public.training_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_organization(organization_id));
CREATE POLICY training_assignments_manage ON public.training_assignments FOR ALL TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (public.can_manage_organization(organization_id));

REVOKE INSERT, UPDATE, DELETE ON public.sensor_health_snapshots,
  public.regulatory_content_versions FROM authenticated;

CREATE OR REPLACE FUNCTION public.transition_corrective_action(
  p_action_id uuid,
  p_status text,
  p_note text DEFAULT NULL,
  p_evidence jsonb DEFAULT '[]'::jsonb
)
RETURNS public.corrective_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action public.corrective_actions;
  v_event text;
BEGIN
  SELECT * INTO v_action FROM public.corrective_actions
   WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND OR NOT (
    v_action.owner_id = auth.uid() OR public.can_manage_organization(v_action.organization_id)
  ) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_status NOT IN ('open','in_progress','verified','closed') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  IF p_status = 'verified' AND NOT public.can_manage_organization(v_action.organization_id) THEN
    RAISE EXCEPTION 'verification requires manager';
  END IF;
  IF p_status IN ('verified','closed') AND jsonb_array_length(COALESCE(p_evidence, '[]'::jsonb)) = 0
     AND jsonb_array_length(v_action.evidence) = 0 THEN
    RAISE EXCEPTION 'verification evidence required';
  END IF;
  v_event := CASE p_status
    WHEN 'open' THEN 'reopened' WHEN 'in_progress' THEN 'started'
    WHEN 'verified' THEN 'verified' ELSE 'closed' END;
  UPDATE public.corrective_actions SET
    status = p_status,
    evidence = evidence || COALESCE(p_evidence, '[]'::jsonb),
    completed_at = CASE WHEN p_status IN ('verified','closed') THEN now() ELSE completed_at END,
    verified_at = CASE WHEN p_status = 'verified' THEN now() ELSE verified_at END,
    verified_by = CASE WHEN p_status = 'verified' THEN auth.uid() ELSE verified_by END,
    closed_at = CASE WHEN p_status = 'closed' THEN now() ELSE NULL END,
    updated_at = now()
   WHERE id = p_action_id RETURNING * INTO v_action;
  INSERT INTO public.corrective_action_events (
    organization_id, action_id, event_type, note, payload, actor_id
  ) VALUES (
    v_action.organization_id, v_action.id, v_event, nullif(trim(p_note), ''),
    jsonb_build_object('status', p_status, 'evidence', COALESCE(p_evidence, '[]'::jsonb)),
    auth.uid()
  );
  UPDATE public.unified_inbox_items SET
    status = CASE WHEN p_status IN ('verified','closed') THEN 'resolved' ELSE status END,
    resolved_at = CASE WHEN p_status IN ('verified','closed') THEN now() ELSE resolved_at END,
    updated_at = now()
   WHERE organization_id = v_action.organization_id
     AND source_table = 'corrective_actions' AND source_id = v_action.id;
  RETURN v_action;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_corrective_action(uuid,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_corrective_action(uuid,text,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_temperature_corrective_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_action_id uuid;
BEGIN
  IF NEW.status <> 'out_of_range' THEN RETURN NEW; END IF;
  INSERT INTO public.corrective_actions (
    organization_id, location_id, source_table, source_id, description,
    severity, category, due_at, created_by
  ) VALUES (
    NEW.organization_id, NEW.location_id, 'temperature_logs', NEW.id,
    'Out-of-range temperature requires containment, root-cause review and verification.',
    'high', 'temperature', now() + interval '30 minutes', NEW.user_id
  ) ON CONFLICT (organization_id, source_table, source_id, description)
    DO UPDATE SET updated_at = now()
  RETURNING id INTO v_action_id;
  INSERT INTO public.unified_inbox_items (
    organization_id, location_id, item_type, source_table, source_id,
    title, summary, severity, due_at
  ) VALUES (
    NEW.organization_id, NEW.location_id, 'corrective_action',
    'corrective_actions', v_action_id, 'Temperature excursion',
    format('%s recorded at %s °C', NEW.location, NEW.reading), 'high', now() + interval '30 minutes'
  ) ON CONFLICT (organization_id, source_table, source_id, item_type)
    DO UPDATE SET summary = EXCLUDED.summary, status = 'open', updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_temperature_corrective_action ON public.temperature_logs;
CREATE TRIGGER trg_temperature_corrective_action
  AFTER INSERT OR UPDATE OF status ON public.temperature_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_temperature_corrective_action();

CREATE OR REPLACE FUNCTION public.tg_sensor_excursion_corrective_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_device public.sensor_devices; v_action_id uuid;
BEGIN
  SELECT * INTO v_device FROM public.sensor_devices WHERE id = NEW.device_id;
  IF NEW.reading BETWEEN v_device.target_min AND v_device.target_max THEN RETURN NEW; END IF;
  INSERT INTO public.corrective_actions (
    organization_id, location_id, source_table, source_id, description,
    severity, category, due_at, created_by
  ) VALUES (
    NEW.organization_id, NEW.location_id, 'sensor_readings', NEW.id,
    'Sensor excursion requires containment, investigation and verification.',
    'critical', 'sensor', now() + interval '15 minutes', v_device.created_by
  ) ON CONFLICT (organization_id, source_table, source_id, description)
    DO UPDATE SET updated_at = now()
  RETURNING id INTO v_action_id;
  INSERT INTO public.unified_inbox_items (
    organization_id, location_id, item_type, source_table, source_id,
    title, summary, severity, due_at
  ) VALUES (
    NEW.organization_id, NEW.location_id, 'sensor_excursion',
    'corrective_actions', v_action_id, 'Critical sensor excursion',
    format('%s measured %s °C; accepted range %s–%s °C',
      v_device.name, NEW.reading, v_device.target_min, v_device.target_max),
    'critical', now() + interval '15 minutes'
  ) ON CONFLICT (organization_id, source_table, source_id, item_type)
    DO UPDATE SET summary = EXCLUDED.summary, status = 'open', updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sensor_excursion_corrective_action ON public.sensor_readings;
CREATE TRIGGER trg_sensor_excursion_corrective_action
  AFTER INSERT ON public.sensor_readings
  FOR EACH ROW EXECUTE FUNCTION public.tg_sensor_excursion_corrective_action();

CREATE OR REPLACE FUNCTION public.complete_workflow_run(p_run_id uuid)
RETURNS public.workflow_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_run public.workflow_runs; v_missing integer;
BEGIN
  SELECT * INTO v_run FROM public.workflow_runs WHERE id = p_run_id FOR UPDATE;
  IF NOT FOUND OR NOT (
    v_run.assigned_to = auth.uid() OR public.can_manage_organization(v_run.organization_id)
  ) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT count(*) INTO v_missing
    FROM public.workflow_steps step
   WHERE step.version_id = v_run.version_id AND step.required
     AND NOT EXISTS (
       SELECT 1 FROM public.workflow_step_results result
        WHERE result.run_id = v_run.id AND result.step_id = step.id
     );
  IF v_missing > 0 THEN RAISE EXCEPTION 'required workflow steps are incomplete'; END IF;
  UPDATE public.workflow_runs SET status = 'completed', completed_at = now(), updated_at = now()
   WHERE id = p_run_id RETURNING * INTO v_run;
  RETURN v_run;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_workflow_run(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_workflow_run(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dispatch_operations_control()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_overdue integer; v_offline integer;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service role required'; END IF;
  UPDATE public.workflow_runs SET status = 'overdue', updated_at = now()
   WHERE status IN ('scheduled','in_progress') AND due_at < now();
  GET DIAGNOSTICS v_overdue = ROW_COUNT;
  INSERT INTO public.sensor_health_snapshots (
    organization_id, location_id, device_id, health, last_seen_at, missing_minutes
  )
  SELECT device.organization_id, device.location_id, device.id,
    CASE WHEN device.last_seen_at IS NULL OR device.last_seen_at < now() - interval '60 minutes'
      THEN 'offline' ELSE 'warning' END,
    device.last_seen_at,
    greatest(0, floor(extract(epoch FROM (now() - COALESCE(device.last_seen_at, device.created_at))) / 60)::integer)
  FROM public.sensor_devices device
  WHERE device.is_active
    AND (device.last_seen_at IS NULL OR device.last_seen_at < now() - interval '15 minutes');
  GET DIAGNOSTICS v_offline = ROW_COUNT;
  INSERT INTO public.unified_inbox_items (
    organization_id, location_id, item_type, source_table, source_id,
    title, summary, severity, due_at
  )
  SELECT device.organization_id, device.location_id, 'sensor_offline', 'sensor_devices', device.id,
    'Sensor connectivity needs attention',
    format('%s has not reported for %s minutes', device.name,
      floor(extract(epoch FROM (now() - COALESCE(device.last_seen_at, device.created_at))) / 60)),
    CASE WHEN device.last_seen_at IS NULL OR device.last_seen_at < now() - interval '60 minutes'
      THEN 'critical' ELSE 'high' END,
    now() + interval '15 minutes'
  FROM public.sensor_devices device
  WHERE device.is_active
    AND (device.last_seen_at IS NULL OR device.last_seen_at < now() - interval '15 minutes')
  ON CONFLICT (organization_id, source_table, source_id, item_type)
  DO UPDATE SET summary = EXCLUDED.summary, severity = EXCLUDED.severity,
    status = 'open', due_at = EXCLUDED.due_at, updated_at = now();
  UPDATE public.corrective_actions SET escalated_at = now(), updated_at = now()
   WHERE status IN ('open','in_progress') AND due_at < now() AND escalated_at IS NULL;
  RETURN jsonb_build_object('overdue_workflows', v_overdue, 'unhealthy_sensors', v_offline);
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_operations_control() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_operations_control() TO service_role;
