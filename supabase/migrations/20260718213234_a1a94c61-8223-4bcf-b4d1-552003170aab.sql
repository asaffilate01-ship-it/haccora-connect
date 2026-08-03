
CREATE TABLE public.haccp_hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step TEXT NOT NULL,
  hazard TEXT NOT NULL,
  control TEXT NOT NULL,
  is_ccp BOOLEAN NOT NULL DEFAULT false,
  critical_limit TEXT,
  monitoring TEXT,
  corrective_action TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.haccp_hazards TO authenticated;
GRANT ALL ON public.haccp_hazards TO service_role;
ALTER TABLE public.haccp_hazards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read haccp" ON public.haccp_hazards FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage haccp" ON public.haccp_hazards FOR ALL TO authenticated
  USING (public.is_manager_or_owner(auth.uid())) WITH CHECK (public.is_manager_or_owner(auth.uid()));
CREATE TRIGGER trg_haccp_updated BEFORE UPDATE ON public.haccp_hazards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  audit_type TEXT NOT NULL DEFAULT 'internal',
  score INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audits TO authenticated;
GRANT ALL ON public.audits TO service_role;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read audits" ON public.audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage audits" ON public.audits FOR ALL TO authenticated
  USING (public.is_manager_or_owner(auth.uid())) WITH CHECK (public.is_manager_or_owner(auth.uid()));
CREATE TRIGGER trg_audits_updated BEFORE UPDATE ON public.audits FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.recalls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product TEXT NOT NULL,
  batch TEXT,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recalls TO authenticated;
GRANT ALL ON public.recalls TO service_role;
ALTER TABLE public.recalls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read recalls" ON public.recalls FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage recalls" ON public.recalls FOR ALL TO authenticated
  USING (public.is_manager_or_owner(auth.uid())) WITH CHECK (public.is_manager_or_owner(auth.uid()));
CREATE TRIGGER trg_recalls_updated BEFORE UPDATE ON public.recalls FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  location TEXT,
  serial TEXT,
  last_service_at DATE,
  next_service_at DATE,
  status TEXT NOT NULL DEFAULT 'ok',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage assets" ON public.assets FOR ALL TO authenticated
  USING (public.is_manager_or_owner(auth.uid())) WITH CHECK (public.is_manager_or_owner(auth.uid()));
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
