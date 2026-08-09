-- Phase 28: production SaaS control plane, subscription-bound tenant roles,
-- and evidence-grade QR equipment scan sessions.

begin;

-- ---------------------------------------------------------------------------
-- Commercial plan catalogue and tenant lifecycle
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column if not exists service_status text not null default 'active',
  add column if not exists service_status_reason text,
  add column if not exists frozen_at timestamptz,
  add column if not exists frozen_by uuid references auth.users(id) on delete set null;

alter table public.organizations drop constraint if exists organizations_service_status_check;
alter table public.organizations add constraint organizations_service_status_check
  check (service_status in ('active', 'frozen', 'closed'));
alter table public.organizations drop constraint if exists organizations_service_status_reason_length;
alter table public.organizations add constraint organizations_service_status_reason_length
  check (service_status_reason is null or char_length(service_status_reason) <= 500);

update public.organizations
   set country_code = 'GB', timezone = 'Europe/London'
 where archived_at is null;

create table if not exists public.platform_plan_catalog (
  code text primary key check (code ~ '^[a-z][a-z0-9_]{1,31}$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  monthly_price_pence integer check (monthly_price_pence is null or monthly_price_pence >= 0),
  included_seats integer not null check (included_seats between 1 and 100000),
  max_locations integer not null check (max_locations between 1 and 10000),
  custom_roles_limit integer not null default 0 check (custom_roles_limit between 0 and 1000),
  enabled_modules text[] not null default '{}'::text[],
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

insert into public.platform_plan_catalog (
  code, name, monthly_price_pence, included_seats, max_locations,
  custom_roles_limit, enabled_modules, display_order
) values
  ('trial', 'Trial', 0, 5, 1, 0,
    array['haccp','temperature','cleaning','menu','training','audits','assets'], 0),
  ('solo', 'Solo', 999, 5, 1, 0,
    array['haccp','temperature','cleaning','menu','training','audits','assets'], 10),
  ('complete', 'Complete', 2499, 1000, 1, 3,
    array['haccp','temperature','cleaning','menu','purchasing','rota','training','audits','assets','integrations'], 20),
  ('group', 'Small Group', 5999, 5000, 3, 10,
    array['haccp','temperature','cleaning','menu','purchasing','rota','training','audits','assets','integrations'], 30),
  ('enterprise', 'Enterprise', null, 100000, 10000, 100,
    array['haccp','temperature','cleaning','menu','purchasing','rota','training','audits','assets','integrations'], 40)
on conflict (code) do update set
  name = excluded.name,
  monthly_price_pence = excluded.monthly_price_pence,
  included_seats = excluded.included_seats,
  max_locations = excluded.max_locations,
  custom_roles_limit = excluded.custom_roles_limit,
  enabled_modules = excluded.enabled_modules,
  display_order = excluded.display_order,
  updated_at = clock_timestamp();

alter table public.subscriptions
  add column if not exists location_limit integer,
  add column if not exists contract_mrr_pence integer,
  add column if not exists price_override_reason text;

alter table public.subscriptions drop constraint if exists subscriptions_location_limit_check;
alter table public.subscriptions add constraint subscriptions_location_limit_check
  check (location_limit is null or location_limit between 1 and 10000);
alter table public.subscriptions drop constraint if exists subscriptions_contract_mrr_check;
alter table public.subscriptions add constraint subscriptions_contract_mrr_check
  check (contract_mrr_pence is null or contract_mrr_pence >= 0);
alter table public.subscriptions drop constraint if exists subscriptions_override_reason_length;
alter table public.subscriptions add constraint subscriptions_override_reason_length
  check (price_override_reason is null or char_length(price_override_reason) <= 500);

alter table public.subscriptions alter column currency set default 'gbp';
update public.subscriptions set currency = 'gbp' where currency <> 'gbp';
update public.subscriptions set plan = 'complete' where plan = 'pro';
update public.subscriptions subscription
   set seats = greatest(subscription.seats, plan.included_seats),
       location_limit = coalesce(subscription.location_limit, plan.max_locations),
       contract_mrr_pence = coalesce(subscription.contract_mrr_pence, plan.monthly_price_pence)
  from public.platform_plan_catalog plan
 where plan.code = subscription.plan;

insert into public.subscriptions (
  organization_id, plan, status, seats, currency, trial_ends_at,
  location_limit, contract_mrr_pence
)
select organization.id, 'trial', 'trialing', 5, 'gbp', clock_timestamp() + interval '7 days', 1, 0
  from public.organizations organization
 where not exists (
   select 1 from public.subscriptions subscription
    where subscription.organization_id = organization.id
 );

-- ---------------------------------------------------------------------------
-- Tenant-defined roles, bounded by the safe built-in role maximum
-- ---------------------------------------------------------------------------

create table if not exists public.organization_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  base_role public.app_role not null check (base_role in ('manager','chef','staff')),
  action_permissions text[] not null default '{}'::text[],
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (id, organization_id)
);

create unique index if not exists organization_roles_name_unique
  on public.organization_roles (organization_id, lower(name)) where active;

alter table public.organization_memberships
  add column if not exists role_profile_id uuid;
alter table public.organization_memberships drop constraint if exists membership_role_profile_org;
alter table public.organization_memberships add constraint membership_role_profile_org
  foreign key (role_profile_id, organization_id)
  references public.organization_roles(id, organization_id) on delete restrict;

alter table public.organization_invitations
  add column if not exists role_profile_id uuid;
alter table public.organization_invitations drop constraint if exists invitation_role_profile_org;
alter table public.organization_invitations add constraint invitation_role_profile_org
  foreign key (role_profile_id, organization_id)
  references public.organization_roles(id, organization_id) on delete restrict;

create table if not exists public.tenant_admin_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (char_length(event_type) between 3 and 80),
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default clock_timestamp()
);

create index if not exists tenant_admin_events_org_time_idx
  on public.tenant_admin_events (organization_id, occurred_at desc);

create or replace function public.reject_governance_audit_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Governance audit history is append-only';
end;
$$;

drop trigger if exists tenant_admin_events_immutable on public.tenant_admin_events;
create trigger tenant_admin_events_immutable
before update or delete on public.tenant_admin_events
for each row execute function public.reject_governance_audit_mutation();

drop trigger if exists platform_audit_events_immutable on public.platform_audit_events;
create trigger platform_audit_events_immutable
before update or delete on public.platform_audit_events
for each row execute function public.reject_governance_audit_mutation();

create or replace function public.default_role_actions(p_role public.app_role)
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select case p_role
    when 'owner' then array[
      'records.export','records.signOff','records.deleteLog','haccp.editPlan',
      'haccp.approvePlan','team.manageRoles','team.invite','rota.publish',
      'rota.approveSwap','purchasing.approvePO','purchasing.receive','recipes.cost',
      'menu.editAllergens','labels.print','incidents.report','incidents.close',
      'audits.perform','audits.publish','recalls.trigger','inspection.grantAccess',
      'assets.manage','assets.record'
    ]::text[]
    when 'manager' then array[
      'records.export','records.signOff','haccp.editPlan','team.manageRoles','team.invite','rota.publish',
      'rota.approveSwap','purchasing.approvePO','purchasing.receive','recipes.cost',
      'menu.editAllergens','labels.print','incidents.report','incidents.close',
      'audits.perform','audits.publish','recalls.trigger','inspection.grantAccess',
      'assets.manage','assets.record'
    ]::text[]
    when 'chef' then array[
      'haccp.editPlan','purchasing.receive','recipes.cost','menu.editAllergens',
      'labels.print','incidents.report','audits.perform','recalls.trigger','assets.record'
    ]::text[]
    when 'staff' then array['labels.print','incidents.report','assets.record']::text[]
    when 'inspector' then array['records.export']::text[]
    else '{}'::text[]
  end;
$$;

create or replace function public.has_org_permission(
  p_organization_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_organization_id is not null and exists (
    select 1
      from public.organization_memberships membership
      join public.organizations organization on organization.id = membership.organization_id
      left join public.organization_roles role_profile
        on role_profile.id = membership.role_profile_id
       and role_profile.organization_id = membership.organization_id
       and role_profile.active
     where membership.organization_id = p_organization_id
       and membership.user_id = auth.uid()
       and membership.status = 'active'
       and organization.service_status = 'active'
       and organization.archived_at is null
       and p_permission = any(
         case
           when membership.role = 'owner' then public.default_role_actions('owner')
           when role_profile.id is null then public.default_role_actions(membership.role)
           else array(
             select permission
               from unnest(role_profile.action_permissions) permission
              where permission = any(public.default_role_actions(membership.role))
           )
         end
       )
  );
$$;

revoke all on function public.has_org_permission(uuid, text) from public;
grant execute on function public.has_org_permission(uuid, text) to authenticated;

-- Existing built-in RLS remains the maximum privilege boundary. These
-- restrictive policies ensure a tenant-defined role can only remove actions;
-- it cannot regain them by calling a table endpoint directly.
create or replace function public.custom_role_allows(
  p_organization_id uuid,
  p_permissions text[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.organization_memberships membership
      join public.organizations organization on organization.id = membership.organization_id
      left join public.organization_roles role_profile
        on role_profile.id = membership.role_profile_id
       and role_profile.organization_id = membership.organization_id
       and role_profile.active
     where membership.organization_id = p_organization_id
       and membership.user_id = auth.uid()
       and membership.status = 'active'
       and organization.service_status = 'active'
       and organization.archived_at is null
       and (
         membership.role = 'owner'
         or membership.role_profile_id is null
         or exists (
           select 1 from unnest(coalesce(p_permissions, '{}'::text[])) requested(permission)
            where requested.permission = any(role_profile.action_permissions)
              and requested.permission = any(public.default_role_actions(membership.role))
         )
       )
  );
$$;

revoke all on function public.custom_role_allows(uuid, text[]) from public;
grant execute on function public.custom_role_allows(uuid, text[]) to authenticated;

create policy custom_role_recipes_insert on public.recipes as restrictive
for insert to authenticated
with check (public.custom_role_allows(organization_id, array['menu.editAllergens']));
create policy custom_role_recipes_update on public.recipes as restrictive
for update to authenticated
using (public.custom_role_allows(organization_id, array['menu.editAllergens']))
with check (public.custom_role_allows(organization_id, array['menu.editAllergens']));
create policy custom_role_recipes_delete on public.recipes as restrictive
for delete to authenticated
using (public.custom_role_allows(organization_id, array['menu.editAllergens']));

create policy custom_role_ingredients_insert on public.ingredients as restrictive
for insert to authenticated
with check (public.custom_role_allows(organization_id, array['menu.editAllergens']));
create policy custom_role_ingredients_update on public.ingredients as restrictive
for update to authenticated
using (public.custom_role_allows(organization_id, array['menu.editAllergens']))
with check (public.custom_role_allows(organization_id, array['menu.editAllergens']));
create policy custom_role_ingredients_delete on public.ingredients as restrictive
for delete to authenticated
using (public.custom_role_allows(organization_id, array['menu.editAllergens']));

create policy custom_role_recipe_ingredients_insert on public.recipe_ingredients as restrictive
for insert to authenticated
with check (public.custom_role_allows(organization_id, array['menu.editAllergens']));
create policy custom_role_recipe_ingredients_update on public.recipe_ingredients as restrictive
for update to authenticated
using (public.custom_role_allows(organization_id, array['menu.editAllergens']))
with check (public.custom_role_allows(organization_id, array['menu.editAllergens']));
create policy custom_role_recipe_ingredients_delete on public.recipe_ingredients as restrictive
for delete to authenticated
using (public.custom_role_allows(organization_id, array['menu.editAllergens']));

create policy custom_role_purchase_orders_insert on public.purchase_orders as restrictive
for insert to authenticated
with check (public.custom_role_allows(organization_id, array['purchasing.approvePO','purchasing.receive']));
create policy custom_role_purchase_orders_update on public.purchase_orders as restrictive
for update to authenticated
using (public.custom_role_allows(organization_id, array['purchasing.approvePO','purchasing.receive']))
with check (public.custom_role_allows(organization_id, array['purchasing.approvePO','purchasing.receive']));
create policy custom_role_purchase_orders_delete on public.purchase_orders as restrictive
for delete to authenticated
using (public.custom_role_allows(organization_id, array['purchasing.approvePO']));

create policy custom_role_purchase_order_lines_insert on public.purchase_order_lines as restrictive
for insert to authenticated
with check (public.custom_role_allows(organization_id, array['purchasing.approvePO','purchasing.receive']));
create policy custom_role_purchase_order_lines_update on public.purchase_order_lines as restrictive
for update to authenticated
using (public.custom_role_allows(organization_id, array['purchasing.approvePO','purchasing.receive']))
with check (public.custom_role_allows(organization_id, array['purchasing.approvePO','purchasing.receive']));
create policy custom_role_purchase_order_lines_delete on public.purchase_order_lines as restrictive
for delete to authenticated
using (public.custom_role_allows(organization_id, array['purchasing.approvePO']));

create policy custom_role_haccp_insert on public.haccp_hazards as restrictive
for insert to authenticated
with check (public.custom_role_allows(organization_id, array['haccp.editPlan']));
create policy custom_role_haccp_update on public.haccp_hazards as restrictive
for update to authenticated
using (public.custom_role_allows(organization_id, array['haccp.editPlan']))
with check (public.custom_role_allows(organization_id, array['haccp.editPlan']));

create policy custom_role_incidents_insert on public.incidents as restrictive
for insert to authenticated
with check (public.custom_role_allows(organization_id, array['incidents.report']));
create policy custom_role_incidents_update on public.incidents as restrictive
for update to authenticated
using (public.custom_role_allows(organization_id, array['incidents.report','incidents.close']))
with check (public.custom_role_allows(organization_id, array['incidents.report','incidents.close']));

create policy custom_role_audits_insert on public.audits as restrictive
for insert to authenticated
with check (public.custom_role_allows(organization_id, array['audits.perform']));
create policy custom_role_audits_update on public.audits as restrictive
for update to authenticated
using (public.custom_role_allows(organization_id, array['audits.perform','audits.publish']))
with check (public.custom_role_allows(organization_id, array['audits.perform','audits.publish']));

create policy custom_role_recalls_insert on public.recalls as restrictive
for insert to authenticated
with check (public.custom_role_allows(organization_id, array['recalls.trigger']));
create policy custom_role_recalls_update on public.recalls as restrictive
for update to authenticated
using (public.custom_role_allows(organization_id, array['recalls.trigger']))
with check (public.custom_role_allows(organization_id, array['recalls.trigger']));

create policy custom_role_shifts_insert on public.shifts as restrictive
for insert to authenticated
with check (public.custom_role_allows(organization_id, array['rota.publish','rota.approveSwap']));
create policy custom_role_shifts_update on public.shifts as restrictive
for update to authenticated
using (public.custom_role_allows(organization_id, array['rota.publish','rota.approveSwap']))
with check (public.custom_role_allows(organization_id, array['rota.publish','rota.approveSwap']));
create policy custom_role_shifts_delete on public.shifts as restrictive
for delete to authenticated
using (public.custom_role_allows(organization_id, array['rota.publish']));

-- A frozen or closed tenant has no operational RLS context. The governed
-- context RPC below still reports the lifecycle state so the client can show
-- a clear account-status screen instead of treating the user as unassigned.
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select membership.organization_id
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    left join public.profiles profile on profile.id = membership.user_id
   where membership.user_id = auth.uid()
     and membership.status = 'active'
     and organization.service_status = 'active'
     and organization.archived_at is null
   order by (membership.organization_id = profile.current_organization_id) desc nulls last,
            membership.created_at
   limit 1;
$$;

create or replace function public.has_org_role(
  p_organization_id uuid,
  p_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.organization_memberships membership
      join public.organizations organization on organization.id = membership.organization_id
     where membership.organization_id = p_organization_id
       and membership.user_id = auth.uid()
       and membership.status = 'active'
       and membership.role = any(p_roles)
       and organization.service_status = 'active'
       and organization.archived_at is null
  );
$$;

create or replace function public.can_read_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_organization_id is not null and exists (
    select 1
      from public.organization_memberships membership
      join public.organizations organization on organization.id = membership.organization_id
     where membership.organization_id = p_organization_id
       and membership.user_id = auth.uid()
       and membership.status = 'active'
       and organization.service_status = 'active'
       and organization.archived_at is null
  );
$$;

create or replace function public.can_contribute_to_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_organization_id is not null and exists (
    select 1
      from public.organization_memberships membership
      join public.organizations organization on organization.id = membership.organization_id
     where membership.organization_id = p_organization_id
       and membership.user_id = auth.uid()
       and membership.status = 'active'
       and membership.role in ('owner','manager','chef','staff')
       and organization.service_status = 'active'
       and organization.archived_at is null
  );
$$;

create or replace function public.has_valid_inspector_grant(
  p_organization_id uuid,
  p_scope text default null,
  p_location_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.inspector_access_grants grant_record
      join public.organizations organization on organization.id = grant_record.organization_id
     where grant_record.organization_id = p_organization_id
       and grant_record.inspector_user_id = auth.uid()
       and grant_record.revoked_at is null
       and now() between grant_record.valid_from and grant_record.valid_until
       and organization.service_status = 'active'
       and organization.archived_at is null
       and (p_scope is null or p_scope = any(grant_record.evidence_scopes))
       and (
         p_location_id is null
         or cardinality(grant_record.location_ids) = 0
         or p_location_id = any(grant_record.location_ids)
       )
  );
$$;

create or replace function public.get_my_context()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select jsonb_build_object(
      'organization_id', membership.organization_id,
      'organization_name', organization.name,
      'location_id', coalesce(selected_location.id, membership.default_location_id),
      'location_name', coalesce(selected_location.name, default_location.name),
      'role', membership.role,
      'role_profile_id', role_profile.id,
      'role_name', coalesce(role_profile.name, initcap(membership.role::text)),
      'action_permissions', case
        when membership.role = 'owner' then public.default_role_actions('owner')
        when role_profile.id is null then public.default_role_actions(membership.role)
        else array(
          select permission
            from unnest(role_profile.action_permissions) permission
           where permission = any(public.default_role_actions(membership.role))
        )
      end,
      'membership_status', membership.status,
      'service_status', organization.service_status,
      'service_status_reason', organization.service_status_reason,
      'plan', coalesce(subscription.plan, 'trial'),
      'seat_limit', coalesce(subscription.seats, 5),
      'location_limit', coalesce(subscription.location_limit, 1)
    )
      from public.organization_memberships membership
      join public.organizations organization on organization.id = membership.organization_id
      left join public.profiles profile on profile.id = membership.user_id
      left join public.locations selected_location
        on selected_location.id = profile.current_location_id
       and selected_location.organization_id = membership.organization_id
      left join public.locations default_location
        on default_location.id = membership.default_location_id
       and default_location.organization_id = membership.organization_id
      left join public.organization_roles role_profile
        on role_profile.id = membership.role_profile_id
       and role_profile.organization_id = membership.organization_id
       and role_profile.active
      left join public.subscriptions subscription
        on subscription.organization_id = membership.organization_id
     where membership.user_id = auth.uid()
       and membership.status = 'active'
       and (profile.current_organization_id is null
            or profile.current_organization_id = membership.organization_id)
     order by membership.created_at
     limit 1
  ), (
    select jsonb_build_object(
      'organization_id', grant_record.organization_id,
      'organization_name', organization.name,
      'location_id', case when cardinality(grant_record.location_ids) = 1
                          then grant_record.location_ids[1] else null end,
      'location_name', case when cardinality(grant_record.location_ids) = 1
                            then location.name else 'Granted locations' end,
      'role', 'inspector',
      'role_name', 'Inspector',
      'action_permissions', public.default_role_actions('inspector'),
      'evidence_scopes', grant_record.evidence_scopes,
      'membership_status', 'active',
      'service_status', organization.service_status
    )
      from public.inspector_access_grants grant_record
      join public.organizations organization on organization.id = grant_record.organization_id
      left join public.locations location
        on location.id = case when cardinality(grant_record.location_ids) = 1
                              then grant_record.location_ids[1] else null end
       and location.organization_id = grant_record.organization_id
     where grant_record.inspector_user_id = auth.uid()
       and grant_record.revoked_at is null
       and now() between grant_record.valid_from and grant_record.valid_until
       and organization.service_status = 'active'
       and organization.archived_at is null
     order by grant_record.valid_until
     limit 1
  ), '{}'::jsonb);
$$;

revoke all on function public.get_my_context() from public;
grant execute on function public.get_my_context() to authenticated;

-- Sensitive tenant administration is RPC-only. This prevents a client from
-- bypassing plan limits or the active-owner safeguard with a direct update.
drop policy if exists memberships_manage on public.organization_memberships;
revoke insert, update, delete on public.organization_memberships from authenticated;

drop policy if exists locations_manage on public.locations;
revoke insert, update, delete on public.locations from authenticated;

revoke insert, update, delete on public.organization_invitations from authenticated;

create or replace function public.enforce_tenant_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer;
  v_profile public.organization_roles%rowtype;
begin
  if new.role_profile_id is not null then
    select * into v_profile from public.organization_roles role_profile
     where role_profile.id = new.role_profile_id
       and role_profile.organization_id = new.organization_id and role_profile.active;
    if v_profile.id is null or v_profile.base_role <> new.role then
      raise exception 'custom role does not match member base role';
    end if;
  elsif new.role = 'owner' then
    new.role_profile_id := null;
  end if;

  if new.status = 'active' and (
    tg_op = 'INSERT' or old.status <> 'active' or old.organization_id <> new.organization_id
  ) then
    perform 1 from public.subscriptions subscription
     where subscription.organization_id = new.organization_id for update;
    select coalesce(subscription.seats, 5) into v_limit
      from public.subscriptions subscription
     where subscription.organization_id = new.organization_id;
    if (select count(*) from public.organization_memberships membership
         where membership.organization_id = new.organization_id
           and membership.status = 'active' and membership.id <> new.id) >= coalesce(v_limit, 5) then
      raise exception 'subscription seat limit reached' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists organization_memberships_subscription_guard
on public.organization_memberships;
create trigger organization_memberships_subscription_guard
before insert or update of organization_id, status, role, role_profile_id
on public.organization_memberships
for each row execute function public.enforce_tenant_seat_limit();

create or replace function public.enforce_tenant_invitation_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer;
  v_inviter_role public.app_role;
begin
  select membership.role into v_inviter_role
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    left join public.organization_roles role_profile
      on role_profile.id = membership.role_profile_id
     and role_profile.organization_id = membership.organization_id and role_profile.active
   where membership.organization_id = new.organization_id
     and membership.user_id = new.invited_by and membership.status = 'active'
     and organization.service_status = 'active' and organization.archived_at is null
     and (
       membership.role = 'owner'
       or (
         membership.role = 'manager'
         and (membership.role_profile_id is null or 'team.invite' = any(role_profile.action_permissions))
       )
     );
  if v_inviter_role is null then raise exception 'team invitation permission required' using errcode = '42501'; end if;
  if new.role not in ('manager','chef','staff') then raise exception 'invalid invited role'; end if;
  if new.role = 'manager' and v_inviter_role <> 'owner' then
    raise exception 'tenant owner required for manager invitation' using errcode = '42501';
  end if;
  if new.role_profile_id is not null and not exists (
    select 1 from public.organization_roles role_profile
     where role_profile.id = new.role_profile_id
       and role_profile.organization_id = new.organization_id
       and role_profile.base_role = new.role and role_profile.active
  ) then raise exception 'invalid custom role'; end if;

  perform 1 from public.subscriptions subscription
   where subscription.organization_id = new.organization_id for update;
  select coalesce(subscription.seats, 5) into v_limit
    from public.subscriptions subscription where subscription.organization_id = new.organization_id;
  if (select count(*) from public.organization_memberships membership
       where membership.organization_id = new.organization_id and membership.status = 'active')
     + (select count(*) from public.organization_invitations invitation
         where invitation.organization_id = new.organization_id
           and invitation.id <> new.id and invitation.accepted_at is null
           and invitation.revoked_at is null and invitation.expires_at > clock_timestamp())
     >= coalesce(v_limit, 5) then
    raise exception 'subscription seat limit reached' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists organization_invitations_subscription_guard
on public.organization_invitations;
create trigger organization_invitations_subscription_guard
before insert on public.organization_invitations
for each row execute function public.enforce_tenant_invitation_limit();

alter table public.organization_roles enable row level security;
alter table public.tenant_admin_events enable row level security;

create policy organization_roles_tenant_read
on public.organization_roles for select to authenticated
using (public.can_manage_organization(organization_id));

create policy tenant_admin_events_owner_read
on public.tenant_admin_events for select to authenticated
using (public.has_org_role(organization_id, array['owner']::public.app_role[]));

revoke all on public.organization_roles, public.tenant_admin_events from anon, authenticated;
grant select on public.organization_roles, public.tenant_admin_events to authenticated;
grant all on public.organization_roles, public.tenant_admin_events to service_role;

create or replace function public.get_tenant_team()
returns table (
  membership_id uuid,
  user_id uuid,
  full_name text,
  email text,
  role public.app_role,
  role_profile_id uuid,
  role_name text,
  status text,
  default_location_id uuid,
  location_name text,
  accepted_at timestamptz,
  created_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public, auth, pg_temp
as $$
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
         coalesce(nullif(btrim(profile.full_name), ''), 'Team member'),
         coalesce(account.email, ''), membership.role, membership.role_profile_id,
         coalesce(role_profile.name, initcap(membership.role::text)),
         membership.status, membership.default_location_id, location.name,
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
$$;

revoke all on function public.get_tenant_team() from public;
grant execute on function public.get_tenant_team() to authenticated;

create or replace function public.get_tenant_admin_overview()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid := public.current_organization_id();
  v_result jsonb;
begin
  if not public.has_org_permission(v_organization_id, 'team.invite') then
    raise exception 'tenant administration permission required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'organization_id', organization.id,
    'organization_name', organization.name,
    'service_status', organization.service_status,
    'plan', coalesce(subscription.plan, 'trial'),
    'subscription_status', coalesce(subscription.status, 'trialing'),
    'currency', coalesce(subscription.currency, 'gbp'),
    'seat_limit', coalesce(subscription.seats, 5),
    'active_members', (select count(*) from public.organization_memberships m
                        where m.organization_id = organization.id and m.status = 'active'),
    'pending_invites', (select count(*) from public.organization_invitations invitation
                         where invitation.organization_id = organization.id
                           and invitation.accepted_at is null and invitation.revoked_at is null
                           and invitation.expires_at > clock_timestamp()),
    'location_limit', coalesce(subscription.location_limit, 1),
    'active_locations', (select count(*) from public.locations location
                          where location.organization_id = organization.id and location.is_active),
    'custom_roles_limit', coalesce(plan.custom_roles_limit, 0),
    'custom_roles_used', (select count(*) from public.organization_roles role_profile
                           where role_profile.organization_id = organization.id and role_profile.active),
    'current_period_end', subscription.current_period_end,
    'trial_ends_at', subscription.trial_ends_at
  ) into v_result
    from public.organizations organization
    left join public.subscriptions subscription on subscription.organization_id = organization.id
    left join public.platform_plan_catalog plan on plan.code = coalesce(subscription.plan, 'trial')
   where organization.id = v_organization_id;

  return v_result;
end;
$$;

revoke all on function public.get_tenant_admin_overview() from public;
grant execute on function public.get_tenant_admin_overview() to authenticated;

create or replace function public.get_tenant_locations()
returns table (
  id uuid,
  name text,
  business_state text,
  address jsonb,
  timezone text,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid := public.current_organization_id();
begin
  if not public.has_org_permission(v_organization_id, 'team.invite') then
    raise exception 'tenant administration permission required' using errcode = '42501';
  end if;
  return query
  select location.id, location.name, location.business_state, location.address,
         location.timezone, location.is_active, location.created_at
    from public.locations location
   where location.organization_id = v_organization_id
   order by location.is_active desc, location.name;
end;
$$;

revoke all on function public.get_tenant_locations() from public;
grant execute on function public.get_tenant_locations() to authenticated;

create or replace function public.manage_tenant_location(
  p_action text,
  p_location_id uuid default null,
  p_name text default null,
  p_business_state text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid := public.current_organization_id();
  v_location_limit integer;
  v_location_id uuid;
begin
  if not public.has_org_role(v_organization_id, array['owner']::public.app_role[]) then
    raise exception 'tenant owner permission required' using errcode = '42501';
  end if;
  if p_action not in ('create','rename','activate','deactivate') then
    raise exception 'unsupported location action';
  end if;

  select coalesce(subscription.location_limit, plan.max_locations, 1)
    into v_location_limit
    from public.subscriptions subscription
    left join public.platform_plan_catalog plan on plan.code = subscription.plan
   where subscription.organization_id = v_organization_id;

  if p_action = 'create' then
    if char_length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'location name required'; end if;
    if (select count(*) from public.locations location
         where location.organization_id = v_organization_id and location.is_active) >= coalesce(v_location_limit, 1) then
      raise exception 'subscription location limit reached' using errcode = '23514';
    end if;
    insert into public.locations (organization_id, name, business_state, timezone)
    values (v_organization_id, btrim(p_name), nullif(btrim(p_business_state), ''), 'Europe/London')
    returning id into v_location_id;
  else
    select location.id into v_location_id from public.locations location
     where location.id = p_location_id and location.organization_id = v_organization_id
     for update;
    if v_location_id is null then raise exception 'location not found'; end if;
    if p_action = 'rename' then
      if char_length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'location name required'; end if;
      update public.locations set name = btrim(p_name), business_state = nullif(btrim(p_business_state), '')
       where id = v_location_id;
    elsif p_action = 'activate' then
      if (select count(*) from public.locations location
           where location.organization_id = v_organization_id and location.is_active) >= coalesce(v_location_limit, 1) then
        raise exception 'subscription location limit reached' using errcode = '23514';
      end if;
      update public.locations set is_active = true where id = v_location_id;
    elsif p_action = 'deactivate' then
      if (select count(*) from public.locations location
           where location.organization_id = v_organization_id and location.is_active) <= 1 then
        raise exception 'organization must retain an active location';
      end if;
      update public.locations set is_active = false where id = v_location_id;
    end if;
  end if;

  insert into public.tenant_admin_events (organization_id, actor_id, event_type, target_id, metadata)
  values (v_organization_id, auth.uid(), 'tenant_location_' || p_action, v_location_id,
          jsonb_build_object('name', p_name));
  return v_location_id;
end;
$$;

revoke all on function public.manage_tenant_location(text, uuid, text, text) from public;
grant execute on function public.manage_tenant_location(text, uuid, text, text) to authenticated;

create or replace function public.save_tenant_role(
  p_role_id uuid,
  p_name text,
  p_base_role public.app_role,
  p_action_permissions text[]
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid := public.current_organization_id();
  v_limit integer;
  v_role_id uuid;
  v_invalid text[];
begin
  if not public.has_org_role(v_organization_id, array['owner']::public.app_role[]) then
    raise exception 'role management permission required' using errcode = '42501';
  end if;
  if p_base_role not in ('manager','chef','staff') then raise exception 'invalid base role'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80 then raise exception 'invalid role name'; end if;

  select coalesce(plan.custom_roles_limit, 0) into v_limit
    from public.subscriptions subscription
    join public.platform_plan_catalog plan on plan.code = subscription.plan
   where subscription.organization_id = v_organization_id;
  if coalesce(v_limit, 0) = 0 then raise exception 'custom roles are not included in this subscription'; end if;

  select array_agg(permission) into v_invalid
    from unnest(coalesce(p_action_permissions, '{}'::text[])) permission
   where not permission = any(public.default_role_actions(p_base_role));
  if cardinality(coalesce(v_invalid, '{}'::text[])) > 0 then
    raise exception 'role contains permissions above its safe base role';
  end if;

  if p_role_id is null then
    if (select count(*) from public.organization_roles role_profile
         where role_profile.organization_id = v_organization_id and role_profile.active) >= v_limit then
      raise exception 'subscription custom role limit reached' using errcode = '23514';
    end if;
    insert into public.organization_roles (
      organization_id, name, base_role, action_permissions, created_by
    ) values (
      v_organization_id, btrim(p_name), p_base_role,
      array(select distinct permission from unnest(coalesce(p_action_permissions, '{}'::text[])) permission),
      auth.uid()
    ) returning id into v_role_id;
  else
    update public.organization_roles
       set name = btrim(p_name), base_role = p_base_role,
           action_permissions = array(
             select distinct permission from unnest(coalesce(p_action_permissions, '{}'::text[])) permission
           ), updated_at = clock_timestamp()
     where id = p_role_id and organization_id = v_organization_id and active
     returning id into v_role_id;
    if v_role_id is null then raise exception 'role not found'; end if;
    if exists (
      select 1 from public.organization_memberships membership
       where membership.role_profile_id = v_role_id and membership.role <> p_base_role
    ) then
      raise exception 'change assigned members before changing the role base';
    end if;
  end if;

  insert into public.tenant_admin_events (organization_id, actor_id, event_type, target_id, metadata)
  values (v_organization_id, auth.uid(), 'tenant_role_saved', v_role_id,
          jsonb_build_object('name', btrim(p_name), 'base_role', p_base_role));
  return v_role_id;
end;
$$;

revoke all on function public.save_tenant_role(uuid, text, public.app_role, text[]) from public;
grant execute on function public.save_tenant_role(uuid, text, public.app_role, text[]) to authenticated;

create or replace function public.manage_tenant_member(
  p_membership_id uuid,
  p_role public.app_role,
  p_role_profile_id uuid,
  p_status text,
  p_default_location_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid := public.current_organization_id();
  v_actor_role public.app_role;
  v_target public.organization_memberships%rowtype;
  v_profile public.organization_roles%rowtype;
  v_seat_limit integer;
begin
  select membership.role into v_actor_role from public.organization_memberships membership
   where membership.organization_id = v_organization_id
     and membership.user_id = auth.uid() and membership.status = 'active';
  if not public.has_org_permission(v_organization_id, 'team.manageRoles') then
    raise exception 'role management permission required' using errcode = '42501';
  end if;
  if p_status not in ('active','suspended','revoked') then raise exception 'invalid membership status'; end if;
  if p_role = 'inspector' then raise exception 'inspectors use time-limited grants'; end if;

  select * into v_target from public.organization_memberships membership
   where membership.id = p_membership_id and membership.organization_id = v_organization_id
   for update;
  if v_target.id is null then raise exception 'member not found'; end if;
  if v_actor_role = 'manager' and (v_target.role in ('owner','manager') or p_role in ('owner','manager')) then
    raise exception 'tenant owner required for owner or manager changes' using errcode = '42501';
  end if;
  if p_role = 'owner' and p_role_profile_id is not null then raise exception 'owner cannot use a custom role'; end if;

  if p_role_profile_id is not null then
    select * into v_profile from public.organization_roles role_profile
     where role_profile.id = p_role_profile_id
       and role_profile.organization_id = v_organization_id and role_profile.active;
    if v_profile.id is null or v_profile.base_role <> p_role then raise exception 'custom role does not match member base role'; end if;
  end if;
  if p_default_location_id is not null and not exists (
    select 1 from public.locations location
     where location.id = p_default_location_id
       and location.organization_id = v_organization_id and location.is_active
  ) then raise exception 'invalid default location'; end if;

  if p_status = 'active' and v_target.status <> 'active' then
    select coalesce(subscription.seats, 5) into v_seat_limit
      from public.subscriptions subscription where subscription.organization_id = v_organization_id;
    if (select count(*) from public.organization_memberships membership
         where membership.organization_id = v_organization_id and membership.status = 'active') >= coalesce(v_seat_limit, 5) then
      raise exception 'subscription seat limit reached' using errcode = '23514';
    end if;
  end if;

  update public.organization_memberships
     set role = p_role, role_profile_id = p_role_profile_id, status = p_status,
         default_location_id = p_default_location_id, updated_at = clock_timestamp()
   where id = v_target.id;

  insert into public.tenant_admin_events (organization_id, actor_id, event_type, target_id, metadata)
  values (v_organization_id, auth.uid(), 'tenant_member_updated', v_target.user_id,
          jsonb_build_object('role', p_role, 'status', p_status,
                             'role_profile_id', p_role_profile_id,
                             'default_location_id', p_default_location_id));
end;
$$;

revoke all on function public.manage_tenant_member(uuid, public.app_role, uuid, text, uuid) from public;
grant execute on function public.manage_tenant_member(uuid, public.app_role, uuid, text, uuid) to authenticated;

create or replace function public.assert_tenant_invite_allowed(
  p_role public.app_role,
  p_role_profile_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid := public.current_organization_id();
  v_actor_role public.app_role;
  v_limit integer;
  v_used integer;
begin
  select membership.role into v_actor_role from public.organization_memberships membership
   where membership.organization_id = v_organization_id
     and membership.user_id = auth.uid() and membership.status = 'active';
  if not public.has_org_permission(v_organization_id, 'team.invite') then
    raise exception 'team invitation permission required' using errcode = '42501';
  end if;
  if p_role not in ('manager','chef','staff') then raise exception 'invalid invited role'; end if;
  if p_role = 'manager' and v_actor_role <> 'owner' then
    raise exception 'tenant owner required for manager invitation' using errcode = '42501';
  end if;
  if p_role_profile_id is not null and not exists (
    select 1 from public.organization_roles role_profile
     where role_profile.id = p_role_profile_id
       and role_profile.organization_id = v_organization_id
       and role_profile.base_role = p_role and role_profile.active
  ) then raise exception 'invalid custom role'; end if;

  select coalesce(subscription.seats, 5) into v_limit
    from public.subscriptions subscription where subscription.organization_id = v_organization_id;
  select (select count(*) from public.organization_memberships membership
           where membership.organization_id = v_organization_id and membership.status = 'active')
       + (select count(*) from public.organization_invitations invitation
           where invitation.organization_id = v_organization_id
             and invitation.accepted_at is null and invitation.revoked_at is null
             and invitation.expires_at > clock_timestamp())
    into v_used;
  if v_used >= coalesce(v_limit, 5) then raise exception 'subscription seat limit reached' using errcode = '23514'; end if;

  return jsonb_build_object('organization_id', v_organization_id, 'used', v_used, 'limit', coalesce(v_limit, 5));
end;
$$;

revoke all on function public.assert_tenant_invite_allowed(public.app_role, uuid) from public;
grant execute on function public.assert_tenant_invite_allowed(public.app_role, uuid) to authenticated;

-- Invitation acceptance carries the server-validated custom role assignment.
create or replace function public.accept_organization_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_invite public.organization_invitations;
  v_location_id uuid;
begin
  if v_user_id is null or char_length(p_token) < 32 then raise exception 'invalid invitation'; end if;
  select invitation.* into v_invite
    from public.organization_invitations invitation
    join public.organizations organization on organization.id = invitation.organization_id
   where invitation.token_hash = encode(digest(p_token, 'sha256'), 'hex')
     and invitation.accepted_at is null and invitation.revoked_at is null
     and invitation.expires_at > now()
     and organization.service_status = 'active' and organization.archived_at is null
   for update;
  if v_invite.id is null or v_email <> v_invite.email then raise exception 'invalid invitation'; end if;

  select location.id into v_location_id from public.locations location
   where location.organization_id = v_invite.organization_id and location.is_active
   order by location.created_at limit 1;

  insert into public.organization_memberships (
    organization_id, user_id, role, role_profile_id, default_location_id,
    status, invited_by, accepted_at
  ) values (
    v_invite.organization_id, v_user_id, v_invite.role, v_invite.role_profile_id,
    v_location_id, 'active', v_invite.invited_by, now()
  ) on conflict (organization_id, user_id) do update set
    role = case when organization_memberships.role = 'owner'
                then 'owner'::public.app_role else excluded.role end,
    role_profile_id = case when organization_memberships.role = 'owner'
                           then null else excluded.role_profile_id end,
    default_location_id = excluded.default_location_id,
    status = 'active', accepted_at = now();

  update public.organization_invitations set accepted_at = now() where id = v_invite.id;
  update public.profiles set current_organization_id = v_invite.organization_id,
                             current_location_id = v_location_id where id = v_user_id;
  insert into public.tenant_admin_events (organization_id, actor_id, event_type, target_id)
  values (v_invite.organization_id, v_user_id, 'tenant_invitation_accepted', v_invite.id);
  return jsonb_build_object('organization_id', v_invite.organization_id,
                            'location_id', v_location_id, 'role', v_invite.role,
                            'role_profile_id', v_invite.role_profile_id);
end;
$$;

revoke all on function public.accept_organization_invitation(text) from public;
grant execute on function public.accept_organization_invitation(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Audited SaaS owner control plane
-- ---------------------------------------------------------------------------

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
  ) then raise exception 'platform operator access required' using errcode = '42501'; end if;
  select operator.role into v_role from public.platform_operators operator
   where operator.user_id = v_actor and operator.status = 'active';

  select jsonb_build_object(
    'generated_at', clock_timestamp(),
    'financial_access', v_role in ('platform_owner','platform_auditor'),
    'tenants_total', (select count(*) from public.organizations),
    'tenants_active', (select count(*) from public.organizations organization
                        where organization.service_status = 'active' and organization.archived_at is null),
    'tenants_frozen', (select count(*) from public.organizations organization
                        where organization.service_status = 'frozen'),
    'tenants_closed', (select count(*) from public.organizations organization
                        where organization.service_status = 'closed' or organization.archived_at is not null),
    'locations_active', (select count(*) from public.locations location where location.is_active),
    'members_active', (select count(*) from public.organization_memberships membership where membership.status = 'active'),
    'subscriptions_active', (select count(*) from public.subscriptions subscription where subscription.status = 'active'),
    'trials_active', (select count(*) from public.subscriptions subscription where subscription.status = 'trialing'),
    'subscriptions_past_due', (select count(*) from public.subscriptions subscription where subscription.status = 'past_due'),
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
                              where temperature.recorded_at >= clock_timestamp() - interval '30 days'),
    'checks_30d', (select count(*) from public.checks check_record
                    where check_record.created_at >= clock_timestamp() - interval '30 days'),
    'subscriptions_by_status', coalesce((
      select jsonb_object_agg(status_counts.status, status_counts.total)
        from (select subscription.status, count(*) total from public.subscriptions subscription
               group by subscription.status) status_counts
    ), '{}'::jsonb),
    'subscriptions_by_plan', coalesce((
      select jsonb_object_agg(plan_counts.plan, plan_counts.total)
        from (select subscription.plan, count(*) total from public.subscriptions subscription
               group by subscription.plan) plan_counts
    ), '{}'::jsonb)
  ) into v_result;

  insert into public.platform_audit_events (actor_id, event_type, metadata)
  values (v_actor, 'platform_dashboard_viewed',
          jsonb_build_object('tenants_total', v_result->'tenants_total'));
  return v_result;
end;
$$;

revoke all on function public.get_platform_dashboard() from public;
grant execute on function public.get_platform_dashboard() to authenticated;

create or replace function public.get_platform_customers_v2()
returns table (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  service_status text,
  service_status_reason text,
  created_at timestamptz,
  active_locations bigint,
  active_memberships bigint,
  active_assets bigint,
  events_30d bigint,
  plan text,
  subscription_status text,
  seats integer,
  location_limit integer,
  mrr_pence integer,
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
  v_role public.platform_operator_role;
begin
  if not public.is_platform_operator(
    v_actor, array['platform_owner','platform_support','platform_auditor']::public.platform_operator_role[]
  ) then raise exception 'platform operator access required' using errcode = '42501'; end if;
  select operator.role into v_role from public.platform_operators operator
   where operator.user_id = v_actor and operator.status = 'active';
  insert into public.platform_audit_events (actor_id, event_type)
  values (v_actor, 'platform_customer_directory_v2_viewed');

  return query
  select organization.id, organization.name, organization.slug,
         organization.service_status, organization.service_status_reason,
         organization.created_at,
         (select count(*) from public.locations location
           where location.organization_id = organization.id and location.is_active),
         (select count(*) from public.organization_memberships membership
           where membership.organization_id = organization.id and membership.status = 'active'),
         (select count(*) from public.assets asset
           where asset.organization_id = organization.id and asset.retired_at is null),
         (select count(*) from public.asset_events event_record
           where event_record.organization_id = organization.id
             and event_record.recorded_at >= clock_timestamp() - interval '30 days'),
         coalesce(subscription.plan, 'trial'), coalesce(subscription.status, 'trialing'),
         coalesce(subscription.seats, 5), coalesce(subscription.location_limit, 1),
         case when v_role in ('platform_owner','platform_auditor')
              then coalesce(subscription.contract_mrr_pence, plan.monthly_price_pence, 0)
              else null end,
         subscription.trial_ends_at, subscription.current_period_end
    from public.organizations organization
    left join public.subscriptions subscription on subscription.organization_id = organization.id
    left join public.platform_plan_catalog plan on plan.code = coalesce(subscription.plan, 'trial')
   order by case organization.service_status when 'frozen' then 0 when 'active' then 1 else 2 end,
            organization.created_at desc;
end;
$$;

revoke all on function public.get_platform_customers_v2() from public;
grant execute on function public.get_platform_customers_v2() to authenticated;

create or replace function public.get_platform_plans()
returns setof public.platform_plan_catalog
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_platform_operator(
    auth.uid(), array['platform_owner','platform_support','platform_auditor']::public.platform_operator_role[]
  ) then raise exception 'platform operator access required' using errcode = '42501'; end if;
  return query select * from public.platform_plan_catalog plan order by plan.display_order, plan.code;
end;
$$;

revoke all on function public.get_platform_plans() from public;
grant execute on function public.get_platform_plans() to authenticated;

create or replace function public.get_platform_operators()
returns table (
  user_id uuid,
  display_name text,
  email text,
  role public.platform_operator_role,
  status text,
  created_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_platform_operator(
    auth.uid(), array['platform_owner','platform_auditor']::public.platform_operator_role[]
  ) then raise exception 'platform operator access required' using errcode = '42501'; end if;
  insert into public.platform_audit_events (actor_id, event_type)
  values (auth.uid(), 'platform_operator_directory_viewed');
  return query
  select operator.user_id, operator.display_name, coalesce(account.email, ''),
         operator.role, operator.status, operator.created_at
    from public.platform_operators operator
    left join auth.users account on account.id = operator.user_id
   order by operator.status, operator.created_at;
end;
$$;

revoke all on function public.get_platform_operators() from public;
grant execute on function public.get_platform_operators() to authenticated;

create or replace function public.platform_manage_tenant(
  p_organization_id uuid,
  p_action text,
  p_reason text,
  p_plan text default null,
  p_seats integer default null,
  p_location_limit integer default null,
  p_contract_mrr_pence integer default null,
  p_subscription_status text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_plan public.platform_plan_catalog%rowtype;
begin
  if not public.is_platform_operator(
    v_actor, array['platform_owner']::public.platform_operator_role[]
  ) then raise exception 'platform owner access required' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 4 then raise exception 'auditable reason required'; end if;
  if not exists (select 1 from public.organizations organization where organization.id = p_organization_id) then
    raise exception 'tenant not found';
  end if;

  if p_action = 'freeze' then
    update public.organizations set service_status = 'frozen', frozen_at = clock_timestamp(),
      frozen_by = v_actor, service_status_reason = btrim(p_reason), updated_at = clock_timestamp()
     where id = p_organization_id;
  elsif p_action = 'unfreeze' then
    update public.organizations set service_status = 'active', frozen_at = null,
      frozen_by = null, service_status_reason = btrim(p_reason), archived_at = null,
      updated_at = clock_timestamp() where id = p_organization_id;
  elsif p_action = 'close' then
    update public.organizations set service_status = 'closed', archived_at = clock_timestamp(),
      service_status_reason = btrim(p_reason), updated_at = clock_timestamp()
     where id = p_organization_id;
  elsif p_action = 'subscription' then
    select * into v_plan from public.platform_plan_catalog plan where plan.code = p_plan and plan.active;
    if v_plan.code is null then raise exception 'active plan required'; end if;
    if p_seats is not null and p_seats < 1 then raise exception 'seat limit must be positive'; end if;
    if p_location_limit is not null and p_location_limit < 1 then raise exception 'location limit must be positive'; end if;
    if p_contract_mrr_pence is not null and p_contract_mrr_pence < 0 then raise exception 'MRR cannot be negative'; end if;
    if p_subscription_status is not null and p_subscription_status not in (
      'trialing','active','past_due','canceled','unpaid','paused'
    ) then raise exception 'invalid subscription status'; end if;
    if coalesce(p_seats, v_plan.included_seats) < (
      select count(*) from public.organization_memberships membership
       where membership.organization_id = p_organization_id and membership.status = 'active'
    ) then raise exception 'seat limit is below current active staff volume' using errcode = '23514'; end if;
    if coalesce(p_location_limit, v_plan.max_locations) < (
      select count(*) from public.locations location
       where location.organization_id = p_organization_id and location.is_active
    ) then raise exception 'site limit is below current active premises volume' using errcode = '23514'; end if;
    insert into public.subscriptions (
      organization_id, plan, status, seats, currency, location_limit,
      contract_mrr_pence, price_override_reason, updated_at
    ) values (
      p_organization_id, v_plan.code, coalesce(p_subscription_status, 'active'),
      coalesce(p_seats, v_plan.included_seats), 'gbp',
      coalesce(p_location_limit, v_plan.max_locations),
      coalesce(p_contract_mrr_pence, v_plan.monthly_price_pence, 0), btrim(p_reason), clock_timestamp()
    ) on conflict (organization_id) do update set
      plan = excluded.plan, status = excluded.status, seats = excluded.seats,
      currency = 'gbp', location_limit = excluded.location_limit,
      contract_mrr_pence = excluded.contract_mrr_pence,
      price_override_reason = excluded.price_override_reason, updated_at = clock_timestamp();
    update public.organizations set enabled_modules = v_plan.enabled_modules, updated_at = clock_timestamp()
     where id = p_organization_id;
  else
    raise exception 'unsupported tenant action';
  end if;

  insert into public.platform_audit_events (actor_id, event_type, metadata)
  values (v_actor, 'platform_tenant_' || p_action,
          jsonb_build_object('organization_id', p_organization_id, 'reason', btrim(p_reason),
                             'plan', p_plan, 'seats', p_seats,
                             'location_limit', p_location_limit,
                             'contract_mrr_pence', p_contract_mrr_pence,
                             'subscription_status', p_subscription_status));
end;
$$;

revoke all on function public.platform_manage_tenant(uuid, text, text, text, integer, integer, integer, text) from public;
grant execute on function public.platform_manage_tenant(uuid, text, text, text, integer, integer, integer, text) to authenticated;

create or replace function public.platform_manage_operator(
  p_user_id uuid,
  p_role public.platform_operator_role,
  p_status text,
  p_reason text
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_platform_operator(
    auth.uid(), array['platform_owner']::public.platform_operator_role[]
  ) then raise exception 'platform owner access required' using errcode = '42501'; end if;
  if p_status not in ('active','suspended','revoked') then raise exception 'invalid operator status'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 4 then raise exception 'auditable reason required'; end if;
  if p_user_id = auth.uid() and p_status <> 'active' then raise exception 'platform owner cannot disable own account'; end if;
  if p_status <> 'active' and exists (
    select 1 from public.platform_operators operator
     where operator.user_id = p_user_id and operator.role = 'platform_owner'
       and operator.status = 'active'
  ) and (select count(*) from public.platform_operators operator
          where operator.role = 'platform_owner' and operator.status = 'active') <= 1 then
    raise exception 'platform must retain an active owner';
  end if;
  update public.platform_operators
     set role = p_role, status = p_status, updated_at = clock_timestamp()
   where user_id = p_user_id;
  if not found then raise exception 'operator not found'; end if;
  insert into public.platform_audit_events (actor_id, event_type, metadata)
  values (auth.uid(), 'platform_operator_updated',
          jsonb_build_object('user_id', p_user_id, 'role', p_role,
                             'status', p_status, 'reason', btrim(p_reason)));
end;
$$;

revoke all on function public.platform_manage_operator(uuid, public.platform_operator_role, text, text) from public;
grant execute on function public.platform_manage_operator(uuid, public.platform_operator_role, text, text) to authenticated;

alter table public.platform_plan_catalog enable row level security;
revoke all on public.platform_plan_catalog from anon, authenticated;
grant all on public.platform_plan_catalog to service_role;

-- ---------------------------------------------------------------------------
-- QR scan sessions and GPS/time evidence
-- ---------------------------------------------------------------------------

create table if not exists public.asset_scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid references public.locations(id) on delete restrict,
  asset_id uuid not null,
  qr_token uuid not null,
  scanner_user_id uuid not null references auth.users(id) on delete restrict,
  scanner_name text not null default 'Team member',
  source text not null check (source in ('web_camera','native_camera','manual_token','deep_link')),
  latitude numeric(9,6),
  longitude numeric(9,6),
  accuracy_metres numeric(10,2),
  client_scanned_at timestamptz,
  scanned_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp(),
  constraint asset_scans_location_org foreign key (location_id, organization_id)
    references public.locations(id, organization_id) on delete restrict,
  constraint asset_scans_asset_org foreign key (asset_id, organization_id)
    references public.assets(id, organization_id) on delete restrict,
  constraint asset_scans_latitude_check check (latitude is null or latitude between -90 and 90),
  constraint asset_scans_longitude_check check (longitude is null or longitude between -180 and 180),
  constraint asset_scans_accuracy_check check (accuracy_metres is null or accuracy_metres between 0 and 100000),
  constraint asset_scans_geo_pair_check check ((latitude is null) = (longitude is null))
);

create index if not exists asset_scans_asset_time_idx
  on public.asset_scans (organization_id, asset_id, scanned_at desc);
create index if not exists asset_scans_actor_time_idx
  on public.asset_scans (scanner_user_id, scanned_at desc);

alter table public.asset_events
  add column if not exists scan_session_id uuid references public.asset_scans(id) on delete restrict,
  add column if not exists scan_recorded_at timestamptz,
  add column if not exists scan_latitude numeric(9,6),
  add column if not exists scan_longitude numeric(9,6),
  add column if not exists scan_accuracy_metres numeric(10,2);

create or replace function public.reject_asset_scan_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Equipment scan history is append-only';
end;
$$;

drop trigger if exists asset_scans_immutable on public.asset_scans;
create trigger asset_scans_immutable before update or delete on public.asset_scans
for each row execute function public.reject_asset_scan_mutation();

create or replace function public.record_asset_scan(
  p_qr_token uuid,
  p_source text,
  p_client_scanned_at timestamptz default null,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_accuracy_metres numeric default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_asset public.assets%rowtype;
  v_scan public.asset_scans%rowtype;
  v_name text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_source not in ('web_camera','native_camera','manual_token','deep_link') then raise exception 'invalid scan source'; end if;
  if (p_latitude is null) <> (p_longitude is null) then raise exception 'latitude and longitude must be supplied together'; end if;
  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then raise exception 'invalid latitude'; end if;
  if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then raise exception 'invalid longitude'; end if;
  if p_accuracy_metres is not null and (p_accuracy_metres < 0 or p_accuracy_metres > 100000) then raise exception 'invalid GPS accuracy'; end if;
  if p_client_scanned_at is not null and abs(extract(epoch from (clock_timestamp() - p_client_scanned_at))) > 86400 then
    raise exception 'device scan timestamp outside accepted range';
  end if;

  select asset.* into v_asset from public.assets asset
   where asset.qr_token = p_qr_token and asset.retired_at is null;
  if v_asset.id is null then raise exception 'equipment not found'; end if;
  if not (
    public.has_org_permission(v_asset.organization_id, 'assets.manage')
    or (public.has_org_permission(v_asset.organization_id, 'assets.record')
        and (v_asset.location_id is null or v_asset.location_id = public.current_location_id()))
    or public.has_valid_inspector_grant(v_asset.organization_id, 'equipment', v_asset.location_id)
  ) then raise exception 'equipment access denied' using errcode = '42501'; end if;

  select coalesce(nullif(btrim(profile.full_name), ''), 'Team member') into v_name
    from public.profiles profile where profile.id = auth.uid();
  insert into public.asset_scans (
    organization_id, location_id, asset_id, qr_token, scanner_user_id,
    scanner_name, source, latitude, longitude, accuracy_metres, client_scanned_at
  ) values (
    v_asset.organization_id, v_asset.location_id, v_asset.id, v_asset.qr_token,
    auth.uid(), coalesce(v_name, 'Team member'), p_source,
    p_latitude, p_longitude, p_accuracy_metres, p_client_scanned_at
  ) returning * into v_scan;

  return jsonb_build_object(
    'scan_session_id', v_scan.id,
    'asset_id', v_asset.id,
    'qr_token', v_asset.qr_token,
    'asset_code', v_asset.asset_code,
    'asset_name', v_asset.name,
    'location_id', v_asset.location_id,
    'location', v_asset.location,
    'scanned_at', v_scan.scanned_at,
    'client_scanned_at', v_scan.client_scanned_at,
    'latitude', v_scan.latitude,
    'longitude', v_scan.longitude,
    'accuracy_metres', v_scan.accuracy_metres
  );
end;
$$;

revoke all on function public.record_asset_scan(uuid, text, timestamptz, numeric, numeric, numeric) from public;
grant execute on function public.record_asset_scan(uuid, text, timestamptz, numeric, numeric, numeric) to authenticated;

create or replace function public.attribute_asset_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_asset public.assets%rowtype;
  v_schedule public.asset_check_schedules%rowtype;
  v_scan public.asset_scans%rowtype;
begin
  select * into v_asset from public.assets asset where asset.id = new.asset_id;
  if v_asset.id is null or v_asset.organization_id is null or v_asset.retired_at is not null then
    raise exception 'Equipment is unavailable or retired';
  end if;
  new.organization_id := v_asset.organization_id;
  new.location_id := v_asset.location_id;

  if new.scan_session_id is not null then
    select * into v_scan from public.asset_scans scan_record
     where scan_record.id = new.scan_session_id
       and scan_record.asset_id = new.asset_id
       and scan_record.organization_id = new.organization_id
       and scan_record.scanner_user_id = auth.uid()
       and scan_record.scanned_at >= clock_timestamp() - interval '12 hours';
    if v_scan.id is null then raise exception 'valid recent scan session required'; end if;
    new.scan_recorded_at := v_scan.scanned_at;
    new.scan_latitude := v_scan.latitude;
    new.scan_longitude := v_scan.longitude;
    new.scan_accuracy_metres := v_scan.accuracy_metres;
  end if;

  if new.schedule_id is not null then
    select * into v_schedule from public.asset_check_schedules schedule
     where schedule.id = new.schedule_id and schedule.asset_id = new.asset_id
       and schedule.organization_id = new.organization_id and schedule.active;
    if v_schedule.id is null then raise exception 'The recurring equipment check is unavailable'; end if;
    new.event_type := v_schedule.event_type;
    new.measured_unit := coalesce(new.measured_unit, v_schedule.measured_unit);
    new.next_due_at := coalesce(new.next_due_at,
      clock_timestamp() + make_interval(days => v_schedule.frequency_days));
    if (v_schedule.minimum_value is not null or v_schedule.maximum_value is not null)
       and new.measured_value is null then raise exception 'A reading is required for this recurring equipment check'; end if;
    if (v_schedule.minimum_value is not null and new.measured_value < v_schedule.minimum_value)
       or (v_schedule.maximum_value is not null and new.measured_value > v_schedule.maximum_value) then
      new.outcome := 'fail';
    end if;
  end if;
  if new.outcome in ('fail','open') and char_length(btrim(coalesce(new.corrective_action, ''))) < 2 then
    raise exception 'A corrective action is required for failed or open equipment records';
  end if;
  if auth.uid() is not null then
    new.recorded_by := auth.uid();
    select coalesce(nullif(btrim(profile.full_name), ''), 'Team member') into new.recorded_by_name
      from public.profiles profile where profile.id = auth.uid();
  end if;
  if new.recorded_by is null then raise exception 'An attributable actor is required'; end if;
  new.recorded_by_name := coalesce(new.recorded_by_name, 'Team member');
  new.recorded_at := clock_timestamp();
  new.created_at := new.recorded_at;
  return new;
end;
$$;

alter table public.asset_scans enable row level security;

create policy asset_scans_role_location_read
on public.asset_scans for select to authenticated
using (
  public.can_manage_organization(organization_id)
  or (public.can_contribute_to_organization(organization_id)
      and (location_id is null or location_id = public.current_location_id()))
  or public.has_valid_inspector_grant(organization_id, 'equipment', location_id)
);

revoke all on public.asset_scans from anon, authenticated;
grant select on public.asset_scans to authenticated;
grant all on public.asset_scans to service_role;

drop policy if exists assets_manager_insert on public.assets;
create policy assets_manager_insert on public.assets for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and public.has_org_permission(organization_id, 'assets.manage')
  and (location_id is null or location_id = public.current_location_id() or public.is_manager_or_owner(auth.uid()))
);
drop policy if exists assets_manager_update on public.assets;
create policy assets_manager_update on public.assets for update to authenticated
using (public.has_org_permission(organization_id, 'assets.manage'))
with check (
  organization_id = public.current_organization_id()
  and public.has_org_permission(organization_id, 'assets.manage')
);
drop policy if exists assets_manager_delete on public.assets;
create policy assets_manager_delete on public.assets for delete to authenticated
using (public.has_org_permission(organization_id, 'assets.manage'));

drop policy if exists asset_events_role_location_insert on public.asset_events;
create policy asset_events_role_location_insert on public.asset_events for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and recorded_by = auth.uid()
  and public.has_org_permission(organization_id, 'assets.record')
  and (public.can_manage_organization(organization_id)
       or location_id is null or location_id = public.current_location_id())
);

drop policy if exists asset_check_schedules_manager_insert on public.asset_check_schedules;
create policy asset_check_schedules_manager_insert
on public.asset_check_schedules for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and created_by = auth.uid()
  and public.has_org_permission(organization_id, 'assets.manage')
);
drop policy if exists asset_check_schedules_manager_update on public.asset_check_schedules;
create policy asset_check_schedules_manager_update
on public.asset_check_schedules for update to authenticated
using (public.has_org_permission(organization_id, 'assets.manage'))
with check (
  organization_id = public.current_organization_id()
  and public.has_org_permission(organization_id, 'assets.manage')
);
drop policy if exists asset_check_schedules_manager_delete on public.asset_check_schedules;
create policy asset_check_schedules_manager_delete
on public.asset_check_schedules for delete to authenticated
using (public.has_org_permission(organization_id, 'assets.manage'));

comment on table public.platform_plan_catalog is
  'Server-authoritative GBP SaaS plan limits used by both platform and tenant administration.';
comment on table public.organization_roles is
  'Tenant-defined roles whose actions can only reduce the safe built-in base role maximum.';
comment on table public.tenant_admin_events is
  'Append-only tenant administration audit trail for team, role and location changes.';
comment on table public.asset_scans is
  'Append-only QR identification evidence with server time, optional consented GPS and device time.';
comment on column public.asset_events.scan_session_id is
  'Recent attributable QR scan used to identify the equipment before a reading or check was recorded.';

commit;
