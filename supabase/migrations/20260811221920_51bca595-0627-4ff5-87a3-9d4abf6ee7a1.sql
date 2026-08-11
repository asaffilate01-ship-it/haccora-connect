DROP POLICY IF EXISTS cleaning_completions_update ON public.cleaning_completions;
CREATE POLICY cleaning_completions_update ON public.cleaning_completions FOR UPDATE TO authenticated
  USING (public.can_manage_organization(organization_id))
  WITH CHECK (public.can_manage_organization(organization_id));

DROP POLICY IF EXISTS cleaning_completions_delete ON public.cleaning_completions;
CREATE POLICY cleaning_completions_delete ON public.cleaning_completions FOR DELETE TO authenticated
  USING (public.can_manage_organization(organization_id));

DROP POLICY IF EXISTS "doc update" ON public.documents;
CREATE POLICY "doc update" ON public.documents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_manager_or_owner(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_manager_or_owner(auth.uid()));