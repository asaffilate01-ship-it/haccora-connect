-- Phase 32: temperature_logs has always used logged_at as its evidence time.
-- Replace the platform aggregate forward-only so already-linked environments
-- converge without rewriting the published Phase 28 migration.

create index if not exists idx_temperature_logs_logged_at
  on public.temperature_logs (logged_at desc);

create or replace function public.get_platform_dashboard()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_role public.platform_operator_role;
  v_result jsonb;
begin
  if not public.is_platform_operator(
    v_actor, array['platform_owner','platform_support','platform_auditor']::public.platform_operator_role[]
  ) then
    raise exception 'platform operator access required' using errcode = '42501';
  end if;

  select operator.role
    into v_role
    from public.platform_operators operator
   where operator.user_id = v_actor
     and operator.status = 'active';

  select jsonb_build_object(
    'generated_at', clock_timestamp(),
    'financial_access', v_role in ('platform_owner','platform_auditor'),
    'tenants_total', (select count(*) from public.organizations),
    'tenants_active', (select count(*) from public.organizations organization
                        where organization.service_status = 'active'
                          and organization.archived_at is null),
    'tenants_frozen', (select count(*) from public.organizations organization
                        where organization.service_status = 'frozen'),
    'tenants_closed', (select count(*) from public.organizations organization
                        where organization.service_status = 'closed'
                           or organization.archived_at is not null),
    'locations_active', (select count(*) from public.locations location where location.is_active),
    'members_active', (select count(*) from public.organization_memberships membership
                        where membership.status = 'active'),
    'subscriptions_active', (select count(*) from public.subscriptions subscription
                              where subscription.status = 'active'),
    'trials_active', (select count(*) from public.subscriptions subscription
                      where subscription.status = 'trialing'),
    'subscriptions_past_due', (select count(*) from public.subscriptions subscription
                                where subscription.status = 'past_due'),
    'mrr_pence', case when v_role in ('platform_owner','platform_auditor') then
      coalesce((select sum(coalesce(subscription.contract_mrr_pence, plan.monthly_price_pence, 0))
                  from public.subscriptions subscription
                  left join public.platform_plan_catalog plan on plan.code = subscription.plan
                 where subscription.status = 'active'), 0) else null end,
    'arr_pence', case when v_role in ('platform_owner','platform_auditor') then
      12 * coalesce((select sum(coalesce(subscription.contract_mrr_pence, plan.monthly_price_pence, 0))
                       from public.subscriptions subscription
                       left join public.platform_plan_catalog plan on plan.code = subscription.plan
                      where subscription.status = 'active'), 0) else null end,
    'past_due_mrr_pence', case when v_role in ('platform_owner','platform_auditor') then
      coalesce((select sum(coalesce(subscription.contract_mrr_pence, plan.monthly_price_pence, 0))
                  from public.subscriptions subscription
                  left join public.platform_plan_catalog plan on plan.code = subscription.plan
                 where subscription.status = 'past_due'), 0) else null end,
    'assets_active', (select count(*) from public.assets asset where asset.retired_at is null),
    'asset_events_30d', (select count(*) from public.asset_events event_record
                          where event_record.recorded_at >= clock_timestamp() - interval '30 days'),
    'asset_scans_30d', (select count(*) from public.asset_scans scan_record
                         where scan_record.scanned_at >= clock_timestamp() - interval '30 days'),
    'temperature_logs_30d', (select count(*) from public.temperature_logs temperature
                              where temperature.logged_at >= clock_timestamp() - interval '30 days'),
    'checks_30d', (select count(*) from public.checks check_record
                    where check_record.created_at >= clock_timestamp() - interval '30 days'),
    'subscriptions_by_status', coalesce((
      select jsonb_object_agg(status_counts.status, status_counts.total)
        from (select subscription.status, count(*) total
                from public.subscriptions subscription
               group by subscription.status) status_counts
    ), '{}'::jsonb),
    'subscriptions_by_plan', coalesce((
      select jsonb_object_agg(plan_counts.plan, plan_counts.total)
        from (select subscription.plan, count(*) total
                from public.subscriptions subscription
               group by subscription.plan) plan_counts
    ), '{}'::jsonb)
  ) into v_result;

  insert into public.platform_audit_events (actor_id, event_type, metadata)
  values (
    v_actor,
    'platform_dashboard_viewed',
    jsonb_build_object('tenants_total', v_result->'tenants_total')
  );

  return v_result;
end;
$$;

revoke all on function public.get_platform_dashboard() from public;
grant execute on function public.get_platform_dashboard() to authenticated;
