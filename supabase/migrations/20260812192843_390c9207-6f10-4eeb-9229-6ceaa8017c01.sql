DROP POLICY IF EXISTS "corrective_insert" ON public.corrective_actions;
CREATE POLICY "corrective_insert" ON public.corrective_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_contribute_to_organization(organization_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "stock_movements_insert" ON public.stock_movements;
CREATE POLICY "stock_movements_insert" ON public.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_contribute_to_organization(organization_id)
    AND recorded_by = auth.uid()
  );