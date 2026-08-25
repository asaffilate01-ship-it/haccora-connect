CREATE OR REPLACE FUNCTION public.get_platform_operators()
 RETURNS TABLE(user_id uuid, display_name text, email text, role platform_operator_role, status text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
begin
  if not public.is_platform_operator(
    auth.uid(), array['platform_owner','platform_auditor']::public.platform_operator_role[]
  ) then raise exception 'platform operator access required' using errcode = '42501'; end if;
  insert into public.platform_audit_events (actor_id, event_type)
  values (auth.uid(), 'platform_operator_directory_viewed');
  return query
  select operator.user_id, operator.display_name::text, coalesce(account.email, '')::text,
         operator.role, operator.status::text, operator.created_at
    from public.platform_operators operator
    left join auth.users account on account.id = operator.user_id
   order by operator.status, operator.created_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_tenant_team()
 RETURNS TABLE(membership_id uuid, user_id uuid, full_name text, email text, role app_role, role_profile_id uuid, role_name text, status text, default_location_id uuid, location_name text, accepted_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_organization_id uuid := public.current_organization_id();
begin
  if not public.has_org_permission(v_organization_id, 'team.invite') then
    raise exception 'team administration permission required' using errcode = '42501';
  end if;

  insert into public.tenant_admin_events (organization_id, actor_id, event_type)
  values (v_organization_id, auth.uid(), 'tenant_team_directory_viewed');

  return query
  select membership.id, membership.user_id,
         coalesce(nullif(btrim(profile.full_name), ''), 'Team member')::text,
         coalesce(account.email, '')::text, membership.role, membership.role_profile_id,
         coalesce(role_profile.name, initcap(membership.role::text))::text,
         membership.status::text, membership.default_location_id, location.name::text,
         membership.accepted_at, membership.created_at
    from public.organization_memberships membership
    left join public.profiles profile on profile.id = membership.user_id
    left join auth.users account on account.id = membership.user_id
    left join public.organization_roles role_profile on role_profile.id = membership.role_profile_id
    left join public.locations location on location.id = membership.default_location_id
   where membership.organization_id = v_organization_id
   order by case membership.status when 'active' then 0 when 'invited' then 1 else 2 end,
            membership.created_at;
end;
$function$;