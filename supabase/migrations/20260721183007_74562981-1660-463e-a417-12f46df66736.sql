CREATE TABLE public.haccp_flow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_key TEXT NOT NULL,
  title TEXT NOT NULL,
  product TEXT,
  location TEXT,
  ccp_value NUMERIC,
  ccp_unit TEXT,
  target_min NUMERIC,
  target_max NUMERIC,
  in_range BOOLEAN,
  corrective_action TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'complete',
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.haccp_flow_runs TO authenticated;
GRANT ALL ON public.haccp_flow_runs TO service_role;
ALTER TABLE public.haccp_flow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read haccp_flow_runs" ON public.haccp_flow_runs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert haccp_flow_runs" ON public.haccp_flow_runs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "manage haccp_flow_runs" ON public.haccp_flow_runs
  FOR ALL TO authenticated
  USING (public.is_manager_or_owner(auth.uid()))
  WITH CHECK (public.is_manager_or_owner(auth.uid()));
CREATE INDEX idx_haccp_flow_runs_performed_at ON public.haccp_flow_runs(performed_at DESC);
CREATE INDEX idx_haccp_flow_runs_flow_key ON public.haccp_flow_runs(flow_key);