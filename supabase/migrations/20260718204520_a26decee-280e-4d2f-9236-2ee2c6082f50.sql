
-- Expiry / use-by tracker
CREATE TABLE public.expiry_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  batch TEXT,
  qty NUMERIC,
  unit TEXT,
  expires_on DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expiry_items TO authenticated;
GRANT ALL ON public.expiry_items TO service_role;
ALTER TABLE public.expiry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expiry_select" ON public.expiry_items FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_manager_or_owner(auth.uid()) OR public.is_inspector(auth.uid()));
CREATE POLICY "expiry_insert" ON public.expiry_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expiry_update" ON public.expiry_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_manager_or_owner(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_manager_or_owner(auth.uid()));
CREATE POLICY "expiry_delete" ON public.expiry_items FOR DELETE TO authenticated
  USING (public.is_manager_or_owner(auth.uid()));
CREATE TRIGGER trg_expiry_updated BEFORE UPDATE ON public.expiry_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_expiry_expires ON public.expiry_items(expires_on);

-- Waste log
CREATE TABLE public.waste_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  qty NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  reason TEXT NOT NULL,
  cost_eur NUMERIC,
  note TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waste_entries TO authenticated;
GRANT ALL ON public.waste_entries TO service_role;
ALTER TABLE public.waste_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waste_select" ON public.waste_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_manager_or_owner(auth.uid()) OR public.is_inspector(auth.uid()));
CREATE POLICY "waste_insert" ON public.waste_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "waste_update" ON public.waste_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_manager_or_owner(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_manager_or_owner(auth.uid()));
CREATE POLICY "waste_delete" ON public.waste_entries FOR DELETE TO authenticated
  USING (public.is_manager_or_owner(auth.uid()));
CREATE INDEX idx_waste_logged ON public.waste_entries(logged_at DESC);

-- Suppliers
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  contact TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  cert_expires_on DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_owner(auth.uid()) OR auth.uid() = created_by);
CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE TO authenticated
  USING (public.is_manager_or_owner(auth.uid()))
  WITH CHECK (public.is_manager_or_owner(auth.uid()));
CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE TO authenticated
  USING (public.is_manager_or_owner(auth.uid()));
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
