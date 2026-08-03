
-- ============ ROLES & PROFILES ============
CREATE TYPE public.app_role AS ENUM ('owner','manager','chef','staff','inspector');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  location TEXT,
  restaurant_name TEXT,
  language TEXT NOT NULL DEFAULT 'de',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 WHEN 'chef' THEN 3
    WHEN 'staff' THEN 4 WHEN 'inspector' THEN 5 END
  LIMIT 1;
$$;

-- Auto-create profile + default 'staff' role for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, restaurant_name, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'restaurant_name',
    COALESCE(NEW.raw_user_meta_data->>'language','de')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'staff'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ OPERATIONAL TABLES ============
-- Helper: can current user see all restaurant data?
CREATE OR REPLACE FUNCTION public.is_manager_or_owner(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner','manager'));
$$;

CREATE OR REPLACE FUNCTION public.is_inspector(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role='inspector');
$$;

-- Temperature logs
CREATE TABLE public.temperature_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  target_min NUMERIC,
  target_max NUMERIC,
  reading NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok',
  note TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.temperature_logs TO authenticated;
GRANT ALL ON public.temperature_logs TO service_role;
ALTER TABLE public.temperature_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "temp read" ON public.temperature_logs FOR SELECT TO authenticated
  USING (auth.uid()=user_id OR public.is_manager_or_owner(auth.uid()) OR public.is_inspector(auth.uid()));
CREATE POLICY "temp insert" ON public.temperature_logs FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "temp update own" ON public.temperature_logs FOR UPDATE TO authenticated
  USING (auth.uid()=user_id OR public.is_manager_or_owner(auth.uid()));
CREATE POLICY "temp delete mgr" ON public.temperature_logs FOR DELETE TO authenticated
  USING (public.is_manager_or_owner(auth.uid()));

-- Daily checks
CREATE TABLE public.checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checks TO authenticated;
GRANT ALL ON public.checks TO service_role;
ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checks read" ON public.checks FOR SELECT TO authenticated
  USING (auth.uid()=user_id OR public.is_manager_or_owner(auth.uid()) OR public.is_inspector(auth.uid()));
CREATE POLICY "checks insert" ON public.checks FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "checks update" ON public.checks FOR UPDATE TO authenticated
  USING (auth.uid()=user_id OR public.is_manager_or_owner(auth.uid()));
CREATE POLICY "checks delete" ON public.checks FOR DELETE TO authenticated
  USING (public.is_manager_or_owner(auth.uid()));

-- Incidents
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  root_cause TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inc read" ON public.incidents FOR SELECT TO authenticated
  USING (auth.uid()=user_id OR public.is_manager_or_owner(auth.uid()) OR public.is_inspector(auth.uid()));
CREATE POLICY "inc insert" ON public.incidents FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "inc update" ON public.incidents FOR UPDATE TO authenticated
  USING (auth.uid()=user_id OR public.is_manager_or_owner(auth.uid()));
CREATE POLICY "inc delete" ON public.incidents FOR DELETE TO authenticated
  USING (public.is_manager_or_owner(auth.uid()));

-- Alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts read" ON public.alerts FOR SELECT TO authenticated
  USING (auth.uid()=user_id OR public.is_manager_or_owner(auth.uid()));
CREATE POLICY "alerts insert" ON public.alerts FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "alerts update" ON public.alerts FOR UPDATE TO authenticated
  USING (auth.uid()=user_id OR public.is_manager_or_owner(auth.uid()));
CREATE POLICY "alerts delete" ON public.alerts FOR DELETE TO authenticated
  USING (public.is_manager_or_owner(auth.uid()));

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  version TEXT,
  file_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc read" ON public.documents FOR SELECT TO authenticated
  USING (auth.uid()=user_id OR public.is_manager_or_owner(auth.uid()) OR public.is_inspector(auth.uid()));
CREATE POLICY "doc insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "doc update" ON public.documents FOR UPDATE TO authenticated
  USING (auth.uid()=user_id OR public.is_manager_or_owner(auth.uid()));
CREATE POLICY "doc delete" ON public.documents FOR DELETE TO authenticated
  USING (public.is_manager_or_owner(auth.uid()));

-- Audit log (activity)
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log read" ON public.activity_logs FOR SELECT TO authenticated
  USING (auth.uid()=user_id OR public.is_manager_or_owner(auth.uid()) OR public.is_inspector(auth.uid()));
CREATE POLICY "log insert" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
