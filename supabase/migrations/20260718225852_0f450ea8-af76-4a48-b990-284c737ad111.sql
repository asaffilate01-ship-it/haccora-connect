
-- Training courses catalog
CREATE TABLE public.training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_de TEXT NOT NULL,
  title_en TEXT NOT NULL,
  minutes INT NOT NULL DEFAULT 30,
  modules INT NOT NULL DEFAULT 1,
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.training_courses TO authenticated;
GRANT ALL ON public.training_courses TO service_role;
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read courses" ON public.training_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage courses" ON public.training_courses FOR ALL TO authenticated
  USING (public.is_manager_or_owner(auth.uid())) WITH CHECK (public.is_manager_or_owner(auth.uid()));

-- Training records per user
CREATE TABLE public.training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.training_courses(id) ON DELETE SET NULL,
  progress INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  score INT,
  certificate_valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_records TO authenticated;
GRANT ALL ON public.training_records TO service_role;
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own records" ON public.training_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_manager_or_owner(auth.uid()) OR public.is_inspector(auth.uid()));
CREATE POLICY "Users insert own records" ON public.training_records FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_manager_or_owner(auth.uid()));
CREATE POLICY "Users update own records" ON public.training_records FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_manager_or_owner(auth.uid()));
CREATE POLICY "Managers delete records" ON public.training_records FOR DELETE TO authenticated
  USING (public.is_manager_or_owner(auth.uid()));
CREATE TRIGGER training_records_touch BEFORE UPDATE ON public.training_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Label prints audit
CREATE TABLE public.label_prints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  product_name TEXT NOT NULL,
  use_by DATE,
  allergens TEXT[] NOT NULL DEFAULT '{}',
  printed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.label_prints TO authenticated;
GRANT ALL ON public.label_prints TO service_role;
ALTER TABLE public.label_prints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in read prints" ON public.label_prints FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed in create prints" ON public.label_prints FOR INSERT TO authenticated WITH CHECK (printed_by = auth.uid());
CREATE POLICY "Managers delete prints" ON public.label_prints FOR DELETE TO authenticated
  USING (public.is_manager_or_owner(auth.uid()));

-- Seed default courses
INSERT INTO public.training_courses (title_de, title_en, minutes, modules, required) VALUES
  ('IfSG §43 Erstbelehrung', 'IfSG §43 Initial briefing', 35, 5, true),
  ('HACCP-Grundlagen', 'HACCP fundamentals', 60, 8, true),
  ('Allergene (LMIV)', 'Allergens (EU 1169/2011)', 25, 4, true),
  ('Küchenhygiene & Reinigung', 'Kitchen hygiene & cleaning', 40, 6, false),
  ('Arbeitssicherheit', 'Workplace safety', 30, 5, true);
