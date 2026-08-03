
-- Storage RLS for documents bucket: users can manage their own files (path prefix = auth.uid())
CREATE POLICY "docs_select_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "docs_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "docs_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "docs_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Inspectors read all documents in the bucket
CREATE POLICY "docs_select_inspector" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND public.is_inspector(auth.uid()));
