
-- RECIPES
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  allergens text[] NOT NULL DEFAULT '{}',
  cost_eur numeric(10,2) NOT NULL DEFAULT 0,
  price_eur numeric(10,2) NOT NULL DEFAULT 0,
  flagged boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes read" ON public.recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "recipes manage" ON public.recipes FOR ALL TO authenticated
  USING (public.is_manager_or_owner(auth.uid()) OR public.has_role(auth.uid(),'chef'))
  WITH CHECK (public.is_manager_or_owner(auth.uid()) OR public.has_role(auth.uid(),'chef'));
CREATE TRIGGER trg_recipes_updated BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- PURCHASE ORDERS
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL,
  supplier text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_eur numeric(10,2) NOT NULL DEFAULT 0,
  expected_date date,
  line_count integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po read" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "po manage" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.is_manager_or_owner(auth.uid()))
  WITH CHECK (public.is_manager_or_owner(auth.uid()));
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- STOCK ITEMS
CREATE TABLE public.stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  qty numeric(10,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  par numeric(10,2) NOT NULL DEFAULT 0,
  supplier text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;
GRANT ALL ON public.stock_items TO service_role;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock read" ON public.stock_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock manage" ON public.stock_items FOR ALL TO authenticated
  USING (public.is_manager_or_owner(auth.uid()) OR public.has_role(auth.uid(),'chef'))
  WITH CHECK (public.is_manager_or_owner(auth.uid()) OR public.has_role(auth.uid(),'chef'));
CREATE TRIGGER trg_stock_updated BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- SHIFTS
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name text NOT NULL,
  staff_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  role_label text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shifts read" ON public.shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "shifts manage" ON public.shifts FOR ALL TO authenticated
  USING (public.is_manager_or_owner(auth.uid()))
  WITH CHECK (public.is_manager_or_owner(auth.uid()));
CREATE TRIGGER trg_shifts_updated BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- TIME CLOCK
CREATE TABLE public.time_clock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  role_label text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_clock TO authenticated;
GRANT ALL ON public.time_clock TO service_role;
ALTER TABLE public.time_clock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "time_clock self" ON public.time_clock FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_manager_or_owner(auth.uid()));
CREATE POLICY "time_clock insert self" ON public.time_clock FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "time_clock update self" ON public.time_clock FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_manager_or_owner(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_manager_or_owner(auth.uid()));
CREATE POLICY "time_clock delete mgr" ON public.time_clock FOR DELETE TO authenticated
  USING (public.is_manager_or_owner(auth.uid()));
CREATE TRIGGER trg_clock_updated BEFORE UPDATE ON public.time_clock FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
