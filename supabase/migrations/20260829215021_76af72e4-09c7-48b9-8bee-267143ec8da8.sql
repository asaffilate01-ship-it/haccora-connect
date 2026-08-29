REVOKE ALL ON FUNCTION public.guard_approved_active_location() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_approved_active_membership() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_approved_inspector_invitation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_approved_tenant_invitation() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_platform_credit_control_cases() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.platform_manage_credit_control_case(uuid, text, text, timestamptz) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_platform_credit_control_cases() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_manage_credit_control_case(uuid, text, text, timestamptz) TO authenticated;