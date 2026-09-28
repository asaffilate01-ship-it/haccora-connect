-- One shared product, tenant configuration and atomic, approval-only onboarding.
-- Existing tenants are unchanged. Add-on interest never grants an entitlement.
begin;

create table public.platform_tenant_setups (
  id uuid primary key default gen_random_uuid(),
  revision integer not null default 1 check (revision > 0),
  business_name text not null check (char_length(btrim(business_name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 64),
  owner_email text not null check (owner_email = lower(btrim(owner_email)) and owner_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and char_length(owner_email) <= 254),
  location_name text not null check (char_length(btrim(location_name)) between 2 and 160),
  address_line text not null check (char_length(btrim(address_line)) between 4 and 240),
  postcode text not null check (char_length(btrim(postcode)) between 5 and 10),
  intended_plan text not null references public.platform_plan_catalog(code),
  requested_addons text[] not null default '{}' check (
    cardinality(requested_addons) <= 12 and array_position(requested_addons, null) is null and
    requested_addons <@ array['veyumo','omni-intelligence','taxnuvia','xpertjobs','suppliers','dishbee','eventplanr','craftvaro','insure360','omni-comms','zoryn-rewards','training']::text[]
  ),
  organization_id uuid unique references public.organizations(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  launched_at timestamptz,
  check ((organization_id is null) = (launched_at is null))
);

alter table public.platform_tenant_setups enable row level security;
revoke all on public.platform_tenant_setups from public, anon, authenticated;
grant select on public.platform_tenant_setups to authenticated;
grant all on public.platform_tenant_setups to service_role;
create policy tenant_setup_owner_read on public.platform_tenant_setups
for select to authenticated using (
  organization_id is not null and
  public.has_org_role(organization_id, array['owner']::public.app_role[])
);

create or replace function public.require_tenant_setup_operator()
returns void language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_platform_operator(auth.uid(), array['platform_owner']::public.platform_operator_role[])
     or coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then
    raise exception 'platform owner MFA required' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.platform_save_tenant_setup(
  p_id uuid, p_revision integer, p_business_name text, p_slug text,
  p_owner_email text, p_location_name text, p_address_line text, p_postcode text,
  p_intended_plan text, p_requested_addons text[]
)
returns uuid language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_setup public.platform_tenant_setups%rowtype;
begin
  perform public.require_tenant_setup_operator();
  if not exists (select 1 from public.platform_plan_catalog where code = p_intended_plan and active) then
    raise exception 'active intended plan required' using errcode = '23514';
  end if;
  if p_id is null then
    if p_revision is distinct from 0 then raise exception 'new setup requires revision zero' using errcode = '23514'; end if;
    insert into public.platform_tenant_setups (
      business_name, slug, owner_email, location_name, address_line, postcode,
      intended_plan, requested_addons, created_by
    ) values (
      btrim(p_business_name), lower(btrim(p_slug)), lower(btrim(p_owner_email)),
      btrim(p_location_name), btrim(p_address_line), upper(btrim(p_postcode)),
      p_intended_plan, p_requested_addons, auth.uid()
    ) returning id into v_id;
  else
    select * into v_setup from public.platform_tenant_setups where id = p_id for update;
    if v_setup.id is null then raise exception 'setup not found' using errcode = 'P0002'; end if;
    if v_setup.organization_id is not null then raise exception 'launched setup is immutable' using errcode = '23514'; end if;
    if v_setup.revision is distinct from p_revision then raise exception 'setup changed; reload before saving' using errcode = '40001'; end if;
    update public.platform_tenant_setups set
      business_name = btrim(p_business_name), slug = lower(btrim(p_slug)),
      owner_email = lower(btrim(p_owner_email)), location_name = btrim(p_location_name),
      address_line = btrim(p_address_line), postcode = upper(btrim(p_postcode)),
      intended_plan = p_intended_plan, requested_addons = p_requested_addons,
      revision = revision + 1, updated_at = clock_timestamp()
    where id = p_id returning id into v_id;
  end if;
  insert into public.platform_audit_events(actor_id, event_type, metadata)
  values (auth.uid(), 'platform_tenant_setup_saved', jsonb_build_object('setup_id', v_id));
  return v_id;
end;
$$;

create or replace function public.platform_get_tenant_setups()
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v_result jsonb;
begin
  perform public.require_tenant_setup_operator();
  select coalesce(jsonb_agg(to_jsonb(setup) || jsonb_build_object(
    'owner_verified', exists (select 1 from auth.users account where lower(account.email) = setup.owner_email and account.email_confirmed_at is not null and (account.banned_until is null or account.banned_until <= now())),
    'slug_available', not exists (select 1 from public.organizations organization where organization.slug = setup.slug and organization.id is distinct from setup.organization_id)
  ) order by setup.created_at desc), '[]'::jsonb) into v_result
  from public.platform_tenant_setups setup;
  insert into public.platform_audit_events(actor_id, event_type)
  values (auth.uid(), 'platform_tenant_setups_viewed');
  return v_result;
end;
$$;

create or replace function public.platform_launch_tenant_setup(p_id uuid, p_revision integer, p_reason text)
returns uuid language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_setup public.platform_tenant_setups%rowtype;
  v_plan public.platform_plan_catalog%rowtype;
  v_owner uuid; v_org uuid; v_location uuid;
begin
  perform public.require_tenant_setup_operator();
  select * into v_setup from public.platform_tenant_setups where id = p_id for update;
  if v_setup.id is null then raise exception 'setup not found' using errcode = 'P0002'; end if;
  -- The setup is the idempotency key. A retry returns the same tenant.
  if v_setup.organization_id is not null then return v_setup.organization_id; end if;
  if v_setup.revision is distinct from p_revision then raise exception 'setup changed; reload before approval' using errcode = '40001'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 4 and 500 then
    raise exception 'approval reason required' using errcode = '23514';
  end if;
  select id into v_owner from auth.users
   where lower(email) = v_setup.owner_email and email_confirmed_at is not null
     and (banned_until is null or banned_until <= now()) for share;
  if v_owner is null then raise exception 'owner must verify their account before approval' using errcode = '23514'; end if;
  select * into v_plan from public.platform_plan_catalog where code = 'trial' and active for share;
  if v_plan.code is null then raise exception 'approved trial plan unavailable' using errcode = '23514'; end if;

  -- All writes commit together. No partially provisioned tenant can be observed.
  -- Paid plan selection records intent; only the existing billing path changes access.
  insert into public.organizations (
    name, slug, country_code, timezone, enabled_modules, created_by,
    service_status, access_approved_at, access_approved_by, access_approval_type
  ) values (
    v_setup.business_name, v_setup.slug, 'GB', 'Europe/London', v_plan.enabled_modules,
    v_owner, 'active', clock_timestamp(), auth.uid(), 'trial'
  ) returning id into v_org;
  insert into public.subscriptions (
    organization_id, plan, status, seats, location_limit, contract_mrr_pence,
    currency, billing_email, trial_ends_at
  ) values (
    v_org, 'trial', 'trialing', v_plan.included_seats, v_plan.max_locations, 0,
    'gbp', v_setup.owner_email, clock_timestamp() + interval '60 days'
  );
  insert into public.locations (organization_id, name, timezone, address)
  values (v_org, v_setup.location_name, 'Europe/London',
    jsonb_build_object('line1', v_setup.address_line, 'postcode', v_setup.postcode, 'country', 'GB'))
  returning id into v_location;
  insert into public.organization_memberships (
    organization_id, user_id, role, default_location_id, status, invited_by, accepted_at
  ) values (v_org, v_owner, 'owner', v_location, 'active', auth.uid(), clock_timestamp());
  -- Preserve an existing owner's selected workspace when they own several tenants.
  update public.profiles set current_organization_id = v_org, current_location_id = v_location,
    restaurant_name = v_setup.business_name, location = v_setup.location_name, language = 'en'
  where id = v_owner and current_organization_id is null;
  update public.platform_tenant_setups set organization_id = v_org, launched_at = clock_timestamp(),
    updated_at = clock_timestamp() where id = p_id;
  insert into public.platform_audit_events(actor_id, event_type, metadata)
  values (auth.uid(), 'platform_tenant_created', jsonb_build_object(
    'setup_id', p_id, 'organization_id', v_org, 'owner_user_id', v_owner,
    'plan', 'trial', 'intended_plan', v_setup.intended_plan, 'trial_days', 60,
    'requested_addons', v_setup.requested_addons, 'reason', btrim(p_reason)
  ));
  return v_org;
end;
$$;

revoke all on function public.require_tenant_setup_operator() from public, anon, authenticated;
revoke all on function public.platform_save_tenant_setup(uuid,integer,text,text,text,text,text,text,text,text[]) from public, anon;
revoke all on function public.platform_get_tenant_setups() from public, anon;
revoke all on function public.platform_launch_tenant_setup(uuid,integer,text) from public, anon;
grant execute on function public.platform_save_tenant_setup(uuid,integer,text,text,text,text,text,text,text,text[]) to authenticated;
grant execute on function public.platform_get_tenant_setups() to authenticated;
grant execute on function public.platform_launch_tenant_setup(uuid,integer,text) to authenticated;

comment on table public.platform_tenant_setups is
  'Shared-core configuration and onboarding intent. requested_addons and intended_plan are not entitlements. No credentials or tenant forks.';
commit;