DROP POLICY IF EXISTS fsa_prospects_operator_read ON public.fsa_prospects;
CREATE POLICY fsa_prospects_operator_read ON public.fsa_prospects
  FOR SELECT TO authenticated
  USING (public.is_platform_operator(auth.uid(), array['platform_owner'::public.platform_operator_role,'platform_support'::public.platform_operator_role]));

DROP POLICY IF EXISTS device_session_self_read ON public.device_sessions;
CREATE POLICY device_session_self_read ON public.device_sessions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id = public.current_organization_id())
  );