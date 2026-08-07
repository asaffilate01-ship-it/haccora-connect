-- Phase 23: separately governed SaaS operators, owner-only billing and
-- complete inspector equipment scope support.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'platform_operator_role') then
    create type public.platform_operator_role as enum (
      'platform_owner',
      'platform_support',
      'platform_auditor'
    );
  end if;
end
$$;

create table if not exists public.platform_operators (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role public.platform_operator_role not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (char_length(event_type) between 3 and 80),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default clock_timestamp()
);

create index if not exists platform_audit_events_actor_time_idx
  on public.platform_audit_events (actor_id, occurred_at desc);

revoke all on public.platform_operators, public.platform_audit_events from anon, authenticated;
grant select on public.platform_operators, public.platform_audit_events to authenticated;
grant all on public.platform_operators, public.platform_audit_events to service_role;

alter table public.platform_operators enable row level security;
alter table public.platform_audit_events enable row level security;

create or replace function public.is_platform_operator(
  p_user_id uuid,
  p_roles public.platform_operator_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user_id = auth.uid()
     and exists (
       select 1
         from public.platform_operators po
        where po.user_id = p_user_id
          and po.status = 'active'
          and (p_roles is null or po.role = any(p_roles))
     );
$$;

revoke all on function public.is_platform_operator(uuid, public.platform_operator_role[]) from public;
grant execute on function public.is_platform_operator(uuid, public.platform_operator_role[]) to authenticated;

drop policy if exists platform_operators_self_read on public.platform_operators;
create policy platform_operators_self_read
on public.platform_operators for select to authenticated
using (user_id = auth.uid() and status = 'active');

drop policy if exists platform_audit_authorised_read on public.platform_audit_events;
create policy platform_audit_authorised_read
on public.platform_audit_events for select to authenticated
using (
  public.is_platform_operator(
    auth.uid(),
    array['platform_owner', 'platform_auditor']::public.platform_operator_role[]
  )
);

create or replace function public.get_my_platform_context()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select jsonb_build_object(
      'role', po.role,
      'display_name', po.display_name,
      'status', po.status
    )
      from public.platform_operators po
     where po.user_id = auth.uid()
       and po.status = 'active'
  ), '{}'::jsonb);
$$;

revoke all on function public.get_my_platform_context() from public;
grant execute on function public.get_my_platform_context() to authenticated;

create or replace function public.get_platform_overview()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_result jsonb;
begin
  if not public.is_platform_operator(
    v_actor,
    array['platform_owner', 'platform_auditor']::public.platform_operator_role[]
  ) then
    raise exception 'platform operator access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', clock_timestamp(),
    'organizations_total', (select count(*) from public.organizations where archived_at is null),
    'locations_active', (select count(*) from public.locations where is_active),
    'memberships_active', (
      select count(*) from public.organization_memberships where status = 'active'
    ),
    'subscriptions_active', (
      select count(*) from public.subscriptions where status in ('active', 'trialing')
    ),
    'trials_active', (
      select count(*) from public.subscriptions where status = 'trialing'
    ),
    'subscriptions_by_status', coalesce((
      select jsonb_object_agg(status, total)
        from (
          select status, count(*) as total
            from public.subscriptions
           group by status
        ) counts
    ), '{}'::jsonb)
  ) into v_result;

  insert into public.platform_audit_events (actor_id, event_type, metadata)
  values (
    v_actor,
    'platform_overview_viewed',
    jsonb_build_object('organizations_total', v_result->'organizations_total')
  );

  return v_result;
end;
$$;

revoke all on function public.get_platform_overview() from public;
grant execute on function public.get_platform_overview() to authenticated;

create or replace function public.get_platform_customers()
returns table (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  created_at timestamptz,
  active_locations bigint,
  active_memberships bigint,
  plan text,
  subscription_status text,
  trial_ends_at timestamptz,
  current_period_end timestamptz
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
begin
  if not public.is_platform_operator(
    v_actor,
    array['platform_owner', 'platform_auditor']::public.platform_operator_role[]
  ) then
    raise exception 'platform operator access required' using errcode = '42501';
  end if;

  insert into public.platform_audit_events (actor_id, event_type)
  values (v_actor, 'platform_customer_directory_viewed');

  return query
  select
    organization.id,
    organization.name,
    organization.slug,
    organization.created_at,
    (select count(*) from public.locations location
      where location.organization_id = organization.id and location.is_active),
    (select count(*) from public.organization_memberships membership
      where membership.organization_id = organization.id and membership.status = 'active'),
    coalesce(subscription.plan, 'trial'),
    coalesce(subscription.status, 'trialing'),
    subscription.trial_ends_at,
    subscription.current_period_end
  from public.organizations organization
  left join public.subscriptions subscription on subscription.organization_id = organization.id
  where organization.archived_at is null
  order by organization.created_at desc, organization.id;
end;
$$;

revoke all on function public.get_platform_customers() from public;
grant execute on function public.get_platform_customers() to authenticated;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
      from pg_constraint
     where conrelid = 'public.inspector_access_grants'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%evidence_scopes%'
  loop
    execute format(
      'alter table public.inspector_access_grants drop constraint %I',
      constraint_row.conname
    );
  end loop;

  for constraint_row in
    select conname
      from pg_constraint
     where conrelid = 'public.inspector_access_invitations'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%evidence_scopes%'
  loop
    execute format(
      'alter table public.inspector_access_invitations drop constraint %I',
      constraint_row.conname
    );
  end loop;
end
$$;

alter table public.inspector_access_grants
  add constraint inspector_access_grants_evidence_scopes_v2_check
  check (
    cardinality(evidence_scopes) between 1 and 11
    and evidence_scopes <@ array[
      'haccp', 'temperature', 'cleaning', 'pest', 'allergens', 'training',
      'traceability', 'audits', 'documents', 'incidents', 'equipment'
    ]::text[]
  );

alter table public.inspector_access_invitations
  add constraint inspector_access_invitations_evidence_scopes_v2_check
  check (
    cardinality(evidence_scopes) between 1 and 11
    and evidence_scopes <@ array[
      'haccp', 'temperature', 'cleaning', 'pest', 'allergens', 'training',
      'traceability', 'audits', 'documents', 'incidents', 'equipment'
    ]::text[]
  );

drop policy if exists subscriptions_admin_read on public.subscriptions;
drop policy if exists subscriptions_owner_read on public.subscriptions;
create policy subscriptions_owner_read on public.subscriptions for select to authenticated
using (public.has_org_role(organization_id, array['owner']::public.app_role[]));

drop policy if exists billing_events_read on public.billing_events;
drop policy if exists billing_events_owner_read on public.billing_events;
create policy billing_events_owner_read on public.billing_events for select to authenticated
using (public.has_org_role(organization_id, array['owner']::public.app_role[]));

comment on table public.platform_operators is
  'Out-of-band SaaS operator assignments. Never inferred from sign-up metadata or tenant membership.';
comment on table public.platform_audit_events is
  'Append-only audit trail for platform-level access. Tenant evidence remains protected by tenant RLS.';