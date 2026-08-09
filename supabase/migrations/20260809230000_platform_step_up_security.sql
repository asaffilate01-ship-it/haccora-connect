-- Phase 34: require AAL2 for SaaS-owner mutations while preserving service jobs.

begin;

create or replace function public.require_platform_operator_aal2()
returns trigger
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'authenticated'
     and exists (
       select 1
         from public.platform_operators operator
        where operator.user_id = auth.uid()
          and operator.status = 'active'
     )
     and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'platform mutation requires MFA step-up' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.require_platform_operator_aal2() from public, anon, authenticated;
grant execute on function public.require_platform_operator_aal2() to service_role;

drop trigger if exists organizations_platform_aal2 on public.organizations;
create trigger organizations_platform_aal2
before insert or update or delete on public.organizations
for each row execute function public.require_platform_operator_aal2();

drop trigger if exists subscriptions_platform_aal2 on public.subscriptions;
create trigger subscriptions_platform_aal2
before insert or update or delete on public.subscriptions
for each row execute function public.require_platform_operator_aal2();

drop trigger if exists platform_operators_aal2 on public.platform_operators;
create trigger platform_operators_aal2
before insert or update or delete on public.platform_operators
for each row execute function public.require_platform_operator_aal2();

comment on function public.require_platform_operator_aal2() is
  'Fail-closed MFA step-up guard for authenticated SaaS operators. Service-role billing, provisioning and recovery remain separate governed paths.';

commit;
