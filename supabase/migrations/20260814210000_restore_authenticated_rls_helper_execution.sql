-- Restore the minimum function permissions required for authenticated RLS
-- policies after the blanket PUBLIC/anon function revocation in
-- 20260809163212_fc50cdce-11db-4486-94d0-f60dab2d0b41.sql.
--
-- These functions are context readers or boolean policy predicates. This does
-- not grant anonymous access, trigger execution, mutation RPCs, or service-role
-- capabilities.
GRANT EXECUTE ON FUNCTION public.current_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_location_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_valid_inspector_grant(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_organization(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_contribute_to_organization(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_organization(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_operate_record(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_profile_context(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.try_uuid(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_or_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_inspector(uuid) TO authenticated;
