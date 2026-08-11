DROP POLICY IF EXISTS docs_update_scoped ON storage.objects;
CREATE POLICY docs_update_scoped ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND ((storage.foldername(name))[1]) = public.current_organization_id()::text
    AND ((storage.foldername(name))[2]) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND ((storage.foldername(name))[1]) = public.current_organization_id()::text
    AND ((storage.foldername(name))[2]) = auth.uid()::text
    AND public.can_contribute_to_organization(public.current_organization_id())
  );

DROP POLICY IF EXISTS daily_diary_write ON public.daily_diary_entries;
CREATE POLICY daily_diary_insert ON public.daily_diary_entries FOR INSERT TO authenticated
  WITH CHECK (public.can_contribute_to_organization(organization_id));
CREATE POLICY daily_diary_update ON public.daily_diary_entries FOR UPDATE TO authenticated
  USING (public.can_contribute_to_organization(organization_id))
  WITH CHECK (public.can_contribute_to_organization(organization_id));
CREATE POLICY daily_diary_delete ON public.daily_diary_entries FOR DELETE TO authenticated
  USING (public.can_manage_organization(organization_id));