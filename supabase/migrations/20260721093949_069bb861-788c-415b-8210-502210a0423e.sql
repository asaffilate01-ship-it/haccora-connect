
-- ============ goods_in_logs (Wareneingang, LMIV / EU 178-2002 traceability)
CREATE TABLE public.goods_in_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  supplier text NOT NULL,
  product text NOT NULL,
  batch_lot text,
  quantity numeric,
  unit text,
  delivery_temp_c numeric,
  temp_ok boolean,
  packaging_ok boolean DEFAULT true,
  best_before date,
  photo_url text,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted','rejected','partial')),
  notes text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goods_in_logs TO authenticated;
GRANT ALL ON public.goods_in_logs TO service_role;
ALTER TABLE public.goods_in_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goods_in" ON public.goods_in_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inspectors read goods_in" ON public.goods_in_logs FOR SELECT USING (public.is_inspector(auth.uid()));
CREATE TRIGGER trg_touch_goods_in BEFORE UPDATE ON public.goods_in_logs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ calibration_logs (thermometer / probe calibration)
CREATE TABLE public.calibration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device text NOT NULL,
  serial_no text,
  method text NOT NULL DEFAULT 'ice_bath' CHECK (method IN ('ice_bath','boiling','reference','service')),
  reference_c numeric,
  measured_c numeric,
  deviation_c numeric,
  passed boolean NOT NULL DEFAULT true,
  next_due date,
  performed_by text,
  notes text,
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calibration_logs TO authenticated;
GRANT ALL ON public.calibration_logs TO service_role;
ALTER TABLE public.calibration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own calibration" ON public.calibration_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inspectors read calibration" ON public.calibration_logs FOR SELECT USING (public.is_inspector(auth.uid()));
CREATE TRIGGER trg_touch_calibration BEFORE UPDATE ON public.calibration_logs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ health_register (IfSG §43 Belehrung + sick-leave / exclusion)
CREATE TABLE public.health_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  staff_name text NOT NULL,
  kind text NOT NULL DEFAULT 'ifsg43' CHECK (kind IN ('ifsg43','refresher','sick_leave','fit_note','exclusion')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cleared','excluded')),
  issued_on date,
  expires_on date,
  symptoms text,
  fitness_cleared_on date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_register TO authenticated;
GRANT ALL ON public.health_register TO service_role;
ALTER TABLE public.health_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own health" ON public.health_register FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inspectors read health" ON public.health_register FOR SELECT USING (public.is_inspector(auth.uid()));
CREATE TRIGGER trg_touch_health BEFORE UPDATE ON public.health_register FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ pest_sightings
CREATE TABLE public.pest_sightings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'sighting' CHECK (kind IN ('sighting','contractor_visit','bait_check')),
  species text,
  location text,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high')),
  action_taken text,
  contractor text,
  photo_url text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pest_sightings TO authenticated;
GRANT ALL ON public.pest_sightings TO service_role;
ALTER TABLE public.pest_sightings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pest" ON public.pest_sightings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inspectors read pest" ON public.pest_sightings FOR SELECT USING (public.is_inspector(auth.uid()));
CREATE TRIGGER trg_touch_pest BEFORE UPDATE ON public.pest_sightings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ oil_tests (frying-oil TPM / quality)
CREATE TABLE public.oil_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fryer text NOT NULL,
  tpm_percent numeric,
  temperature_c numeric,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','change_soon','changed','rejected')),
  changed boolean DEFAULT false,
  notes text,
  tested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oil_tests TO authenticated;
GRANT ALL ON public.oil_tests TO service_role;
ALTER TABLE public.oil_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own oil" ON public.oil_tests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inspectors read oil" ON public.oil_tests FOR SELECT USING (public.is_inspector(auth.uid()));
CREATE TRIGGER trg_touch_oil BEFORE UPDATE ON public.oil_tests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ complaints
CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  guest_name text,
  contact text,
  channel text DEFAULT 'in_person' CHECK (channel IN ('in_person','phone','email','review','other')),
  kind text NOT NULL DEFAULT 'quality' CHECK (kind IN ('quality','allergen','foreign_body','illness','service','other')),
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  description text NOT NULL,
  resolution text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaints TO authenticated;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own complaints" ON public.complaints FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inspectors read complaints" ON public.complaints FOR SELECT USING (public.is_inspector(auth.uid()));
CREATE TRIGGER trg_touch_complaints BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ chemicals (COSHH / SDS register)
CREATE TABLE public.chemicals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  supplier text,
  hazard_class text,
  ghs_pictograms text[],
  storage_location text,
  sds_url text,
  ppe_required text,
  reviewed_on date,
  next_review date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chemicals TO authenticated;
GRANT ALL ON public.chemicals TO service_role;
ALTER TABLE public.chemicals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chemicals" ON public.chemicals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inspectors read chemicals" ON public.chemicals FOR SELECT USING (public.is_inspector(auth.uid()));
CREATE TRIGGER trg_touch_chemicals BEFORE UPDATE ON public.chemicals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
