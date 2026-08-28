begin;

alter table public.organizations
  add column if not exists access_approved_at timestamptz,
  add column if not exists access_approved_by uuid references auth.users(id) on delete set null,
  add column if not exists access_approval_type text;

alter table public.organizations
  drop constraint if exists organizations_access_approval_type_check;
alter table public.organizations
  add constraint organizations_access_approval_type_check
  check (access_approval_type is null or access_approval_type in ('trial', 'paid', 'manual'));

alter table public.subscriptions
  add column if not exists payment_failed_at timestamptz,
  add column if not exists grace_ends_at timestamptz,
  add column if not exists access_restricted_at timestamptz;

alter table public.subscriptions
  drop constraint if exists subscriptions_grace_window_check;
alter table public.subscriptions
  add constraint subscriptions_grace_window_check
  check (grace_ends_at is null or payment_failed_at is null or grace_ends_at > payment_failed_at);

update public.organizations organization
   set access_approved_at = coalesce(organization.access_approved_at, organization.created_at),
       access_approval_type = coalesce(
         organization.access_approval_type,
         case when subscription.plan = 'trial' then 'trial' else 'paid' end
       )
  from public.subscriptions subscription
 where subscription.organization_id = organization.id
   and organization.access_approved_at is null;

revoke all on function public.bootstrap_my_organization(text, text, text, text[]) from public;
revoke all on function public.bootstrap_my_organization(text, text, text, text[]) from anon;
revoke all on function public.bootstrap_my_organization(text, text, text, text[]) from authenticated;

alter table public.organization_invitations
  add column if not exists default_location_id uuid;

update public.organization_invitations invitation
   set default_location_id = (
    select candidate.id
      from public.locations candidate
     where candidate.organization_id = invitation.organization_id
       and candidate.is_active
     order by candidate.created_at
     limit 1
  )
 where invitation.default_location_id is null;

alter table public.organization_invitations
  drop constraint if exists organization_invitations_default_location_tenant_fk;
alter table public.organization_invitations
  add constraint organization_invitations_default_location_tenant_fk
  foreign key (default_location_id, organization_id)
  references public.locations(id, organization_id)
  on delete restrict;

create or replace function public.tenant_capacity_changes_allowed(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.organizations organization
      join public.subscriptions subscription
        on subscription.organization_id = organization.id
     where organization.id = p_organization_id
       and organization.service_status = 'active'
       and organization.archived_at is null
       and organization.access_approved_at is not null
       and organization.access_approval_type is not null
       and subscription.status in ('active', 'trialing')
       and (
         subscription.status <> 'trialing'
         or (
           subscription.trial_ends_at is not null
           and subscription.trial_ends_at > clock_timestamp()
         )
       )
  );
$$;

revoke all on function public.tenant_capacity_changes_allowed(uuid) from public, anon, authenticated;
grant execute on function public.tenant_capacity_changes_allowed(uuid) to service_role;

create or replace function public.guard_approved_tenant_invitation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.tenant_capacity_changes_allowed(new.organization_id) then
    raise exception 'an approved current trial or paid subscription is required to invite users'
      using errcode = '42501';
  end if;
  if new.default_location_id is null or not exists (
    select 1 from public.locations location
     where location.id = new.default_location_id
       and location.organization_id = new.organization_id
       and location.is_active
  ) then
    raise exception 'an active premises assignment is required' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists tenant_invitation_approval_guard on public.organization_invitations;
create trigger tenant_invitation_approval_guard
before insert on public.organization_invitations
for each row execute function public.guard_approved_tenant_invitation();

create or replace function public.guard_approved_inspector_invitation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.tenant_capacity_changes_allowed(new.organization_id) then
    raise exception 'an approved current trial or paid subscription is required to invite inspectors'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists inspector_invitation_approval_guard
on public.inspector_access_invitations;
create trigger inspector_invitation_approval_guard
before insert on public.inspector_access_invitations
for each row execute function public.guard_approved_inspector_invitation();

create or replace function public.guard_approved_active_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_activating boolean;
begin
  if tg_op = 'INSERT' then
    v_activating := new.status = 'active';
  else
    v_activating := new.status = 'active' and (
      old.status is distinct from new.status
      or old.organization_id is distinct from new.organization_id
    );
  end if;
  if v_activating and not public.tenant_capacity_changes_allowed(new.organization_id) then
    raise exception 'tenant access is not approved or the subscription is not current'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists tenant_membership_approval_guard on public.organization_memberships;
create trigger tenant_membership_approval_guard
before insert or update of organization_id, status on public.organization_memberships
for each row execute function public.guard_approved_active_membership();

create or replace function public.guard_approved_active_location()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_activating boolean;
begin
  if tg_op = 'INSERT' then
    v_activating := new.is_active;
  else
    v_activating := new.is_active and (
      old.is_active is distinct from new.is_active
      or old.organization_id is distinct from new.organization_id
    );
  end if;
  if v_activating and not public.tenant_capacity_changes_allowed(new.organization_id) then
    raise exception 'an approved current trial or paid subscription is required to add premises'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists tenant_location_approval_guard on public.locations;
create trigger tenant_location_approval_guard
before insert or update of organization_id, is_active on public.locations
for each row execute function public.guard_approved_active_location();

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
  if not public.tenant_capacity_changes_allowed(v_invite.organization_id) then
    raise exception 'tenant invitation cannot be accepted while subscription access is restricted';
  end if;

  select location.id into v_location_id from public.locations location
   where location.organization_id = v_invite.organization_id
     and location.is_active
     and location.id = v_invite.default_location_id
   limit 1;
  if v_location_id is null then raise exception 'assigned premises is no longer active'; end if;

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
  insert into public.tenant_admin_events (organization_id, actor_id, event_type, target_id, metadata)
  values (
    v_invite.organization_id,
    v_user_id,
    'tenant_invitation_accepted',
    v_invite.id,
    jsonb_build_object('default_location_id', v_location_id)
  );
  return jsonb_build_object('organization_id', v_invite.organization_id,
                            'location_id', v_location_id, 'role', v_invite.role,
                            'role_profile_id', v_invite.role_profile_id);
end;
$$;

revoke all on function public.accept_organization_invitation(text) from public;
grant execute on function public.accept_organization_invitation(text) to authenticated;

create or replace function public.accept_inspector_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_invite public.inspector_access_invitations;
begin
  if v_user_id is null or char_length(p_token) < 32 then
    raise exception 'invalid invitation';
  end if;
  if exists (
    select 1 from public.organization_memberships
     where user_id = v_user_id and status = 'active'
  ) then
    raise exception 'use a separate inspector account';
  end if;

  select * into v_invite
    from public.inspector_access_invitations
   where token_hash = encode(digest(p_token, 'sha256'), 'hex')
     and accepted_at is null
     and revoked_at is null
     and expires_at > now()
     and access_valid_until > now()
   for update;
  if v_invite.id is null or v_email <> v_invite.email then
    raise exception 'invalid invitation';
  end if;
  if not public.tenant_capacity_changes_allowed(v_invite.organization_id) then
    raise exception 'inspector invitation cannot be accepted while subscription access is restricted';
  end if;
  if exists (
    select 1 from unnest(v_invite.location_ids) invited_location
     where not exists (
       select 1 from public.locations location
        where location.id = invited_location
          and location.organization_id = v_invite.organization_id
          and location.is_active
     )
  ) then
    raise exception 'invalid location scope';
  end if;

  insert into public.inspector_access_grants (
    organization_id, inspector_user_id, location_ids, evidence_scopes,
    valid_from, valid_until, granted_by, reason
  ) values (
    v_invite.organization_id, v_user_id, v_invite.location_ids,
    v_invite.evidence_scopes, now(), v_invite.access_valid_until,
    v_invite.invited_by, v_invite.reason
  );
  update public.inspector_access_invitations
     set accepted_at = now()
   where id = v_invite.id;

  return jsonb_build_object(
    'organization_id', v_invite.organization_id,
    'role', 'inspector',
    'valid_until', v_invite.access_valid_until
  );
end;
$$;

revoke all on function public.accept_inspector_invitation(text) from public;
grant execute on function public.accept_inspector_invitation(text) to authenticated;

create table if not exists public.platform_credit_control_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete restrict,
  status text not null default 'open' check (
    status in ('open', 'contacted', 'promise_to_pay', 'restricted', 'resolved', 'written_off')
  ),
  subscription_status text not null,
  payment_failed_at timestamptz,
  grace_ends_at timestamptz,
  access_restricted_at timestamptz,
  last_notified_stage text,
  last_contacted_at timestamptz,
  next_action_at timestamptz,
  internal_note text check (internal_note is null or char_length(internal_note) <= 2000),
  resolved_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create index if not exists platform_credit_control_queue_idx
  on public.platform_credit_control_cases (status, next_action_at, grace_ends_at);

alter table public.platform_credit_control_cases enable row level security;
revoke all on public.platform_credit_control_cases from public, anon, authenticated;
grant all on public.platform_credit_control_cases to service_role;

create or replace function public.sync_credit_control_case(
  p_organization_id uuid,
  p_subscription_status text,
  p_payment_failed_at timestamptz default null,
  p_grace_ends_at timestamptz default null,
  p_access_restricted_at timestamptz default null
)
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_stage text;
  v_title text;
  v_message text;
  v_severity text := 'warning';
  v_route text := '/app/billing';
  v_cycle text := coalesce(to_char(p_payment_failed_at at time zone 'UTC', 'YYYYMMDDHH24MISS'), 'unknown');
  v_previous_failed_at timestamptz;
  v_now timestamptz := clock_timestamp();
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;

  if p_subscription_status in ('active', 'trialing') then
    select coalesce(credit.payment_failed_at, credit.created_at) into v_previous_failed_at
      from public.platform_credit_control_cases credit
     where credit.organization_id = p_organization_id
       and credit.status <> 'resolved';
    if v_previous_failed_at is null then return 'none'; end if;
    v_cycle := to_char(v_previous_failed_at at time zone 'UTC', 'YYYYMMDDHH24MISS');
    update public.platform_credit_control_cases
       set status = 'resolved', subscription_status = p_subscription_status,
           access_restricted_at = null, resolved_at = v_now,
           next_action_at = null, updated_at = v_now
     where organization_id = p_organization_id
       and status <> 'resolved';
    v_stage := 'payment_restored';
    v_title := 'Payment received — Haccora access is active';
    v_message := 'Your payment status is current and any billing restriction has been removed.';
    v_severity := 'success';
  elsif p_subscription_status = 'past_due' then
    if p_payment_failed_at is null or p_grace_ends_at is null then
      raise exception 'payment and grace timestamps are required for a past-due case';
    end if;
    v_stage := case
      when v_now >= p_grace_ends_at then 'access_restricted'
      when v_now >= p_grace_ends_at - interval '1 day' then 'final_reminder'
      when v_now >= p_payment_failed_at + interval '3 days' then 'payment_reminder'
      else 'payment_failed'
    end;
    v_title := case v_stage
      when 'payment_failed' then 'Payment failed — update your billing details'
      when 'payment_reminder' then 'Reminder: payment is still overdue'
      when 'final_reminder' then 'Final reminder before Haccora access is restricted'
      else 'Haccora access restricted after missed payment'
    end;
    v_message := case v_stage
      when 'access_restricted' then
        'The seven-day payment grace period has ended. Your records are retained and access will return automatically after Stripe confirms payment.'
      else format(
        'Existing access continues until %s, but new users and premises are blocked. The tenant owner can update payment details in Billing.',
        to_char(p_grace_ends_at at time zone 'Europe/London', 'DD Mon YYYY HH24:MI')
      )
    end;
    if v_stage = 'access_restricted' then v_severity := 'critical'; end if;
    insert into public.platform_credit_control_cases (
      organization_id, status, subscription_status, payment_failed_at,
      grace_ends_at, access_restricted_at, next_action_at, updated_at
    ) values (
      p_organization_id,
      case when v_stage = 'access_restricted' then 'restricted' else 'open' end,
      p_subscription_status, p_payment_failed_at, p_grace_ends_at,
      p_access_restricted_at,
      case when v_stage = 'access_restricted' then v_now else least(p_grace_ends_at, v_now + interval '1 day') end,
      v_now
    ) on conflict (organization_id) do update set
      status = case
        when platform_credit_control_cases.payment_failed_at is distinct from excluded.payment_failed_at
          then excluded.status
        when excluded.status = 'restricted' then 'restricted'
        when platform_credit_control_cases.status in ('contacted', 'promise_to_pay')
          then platform_credit_control_cases.status
        else excluded.status
      end,
      subscription_status = excluded.subscription_status,
      payment_failed_at = excluded.payment_failed_at,
      grace_ends_at = excluded.grace_ends_at,
      access_restricted_at = excluded.access_restricted_at,
      resolved_at = null,
      next_action_at = case
        when platform_credit_control_cases.status = 'promise_to_pay'
          and platform_credit_control_cases.next_action_at is not null
          then platform_credit_control_cases.next_action_at
        else excluded.next_action_at
      end,
      updated_at = v_now;
  elsif p_subscription_status in ('canceled', 'unpaid', 'paused', 'incomplete_expired') then
    v_stage := 'access_restricted';
    v_title := 'Haccora subscription access is restricted';
    v_message := 'Your records are retained. The tenant owner can restore access by resolving payment in Billing.';
    v_severity := 'critical';
    insert into public.platform_credit_control_cases (
      organization_id, status, subscription_status, payment_failed_at,
      grace_ends_at, access_restricted_at, next_action_at, updated_at
    ) values (
      p_organization_id, 'restricted', p_subscription_status,
      p_payment_failed_at, p_grace_ends_at, coalesce(p_access_restricted_at, v_now), v_now, v_now
    ) on conflict (organization_id) do update set
      status = 'restricted', subscription_status = excluded.subscription_status,
      payment_failed_at = excluded.payment_failed_at, grace_ends_at = excluded.grace_ends_at,
      access_restricted_at = excluded.access_restricted_at, resolved_at = null,
      next_action_at = excluded.next_action_at, updated_at = v_now;
  else
    return 'none';
  end if;

  insert into public.notification_outbox (
    organization_id, recipient_id, channel, template, payload, idempotency_key
  )
  select p_organization_id, recipient.user_id, channel.name,
         'billing_' || v_stage,
         jsonb_build_object(
           'severity', v_severity, 'title', v_title, 'message', v_message,
           'route', v_route, 'nativeRoute', '/billing',
           'graceEndsAt', p_grace_ends_at, 'audience', recipient.audience
         ),
         'billing:' || v_cycle || ':' || v_stage || ':' || recipient.audience || ':' ||
           recipient.user_id::text || ':' || channel.name
    from (
      select membership.user_id, 'tenant_owner'::text as audience,
             coalesce(preference.push_enabled, true) as push_enabled
        from public.organization_memberships membership
        left join public.notification_preferences preference
          on preference.user_id = membership.user_id
         and preference.organization_id = membership.organization_id
       where membership.organization_id = p_organization_id
         and membership.role = 'owner' and membership.status = 'active'
      union all
      select operator.user_id, 'platform_credit_control'::text, false
        from public.platform_operators operator
       where operator.status = 'active'
         and operator.role in ('platform_owner', 'platform_support')
    ) recipient
    cross join (values ('in_app'), ('email'), ('push')) channel(name)
   where channel.name <> 'push' or recipient.push_enabled
  on conflict (idempotency_key) do nothing;

  update public.platform_credit_control_cases
     set last_notified_stage = v_stage, updated_at = v_now
   where organization_id = p_organization_id;
  return v_stage;
end;
$$;

revoke all on function public.sync_credit_control_case(uuid, text, timestamptz, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.sync_credit_control_case(uuid, text, timestamptz, timestamptz, timestamptz)
  to service_role;

create or replace function public.get_platform_credit_control_cases()
returns table (
  id uuid,
  organization_id uuid,
  organization_name text,
  status text,
  subscription_status text,
  payment_failed_at timestamptz,
  grace_ends_at timestamptz,
  access_restricted_at timestamptz,
  last_notified_stage text,
  last_contacted_at timestamptz,
  next_action_at timestamptz,
  internal_note text,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_platform_operator(
    auth.uid(), array['platform_owner', 'platform_support', 'platform_auditor']::public.platform_operator_role[]
  ) then raise exception 'platform operator access required' using errcode = '42501'; end if;
  insert into public.platform_audit_events (actor_id, event_type)
  values (auth.uid(), 'platform_credit_control_viewed');
  return query
  select credit.id, credit.organization_id, organization.name, credit.status,
         credit.subscription_status, credit.payment_failed_at, credit.grace_ends_at,
         credit.access_restricted_at, credit.last_notified_stage,
         credit.last_contacted_at, credit.next_action_at, credit.internal_note,
         credit.updated_at
    from public.platform_credit_control_cases credit
    join public.organizations organization on organization.id = credit.organization_id
   order by case credit.status when 'restricted' then 0 when 'open' then 1
            when 'promise_to_pay' then 2 when 'contacted' then 3 else 4 end,
            credit.next_action_at nulls last, credit.grace_ends_at nulls last;
end;
$$;

revoke all on function public.get_platform_credit_control_cases() from public;
grant execute on function public.get_platform_credit_control_cases() to authenticated;

create or replace function public.platform_manage_credit_control_case(
  p_case_id uuid,
  p_status text,
  p_note text,
  p_next_action_at timestamptz default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_case public.platform_credit_control_cases%rowtype;
begin
  if not public.is_platform_operator(
    v_actor, array['platform_owner', 'platform_support']::public.platform_operator_role[]
  ) then raise exception 'credit-control access required' using errcode = '42501'; end if;
  if coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then
    raise exception 'MFA step-up required' using errcode = '42501';
  end if;
  if p_status not in ('open', 'contacted', 'promise_to_pay', 'resolved', 'written_off') then
    raise exception 'invalid credit-control status';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) < 4 then raise exception 'auditable note required'; end if;
  select * into v_case from public.platform_credit_control_cases where id = p_case_id for update;
  if v_case.id is null then raise exception 'credit-control case not found'; end if;
  if p_status = 'resolved' and v_case.subscription_status not in ('active', 'trialing') then
    raise exception 'Stripe must confirm payment before this case can be resolved';
  end if;
  if p_status = 'written_off' and not public.is_platform_operator(
    v_actor, array['platform_owner']::public.platform_operator_role[]
  ) then raise exception 'platform owner access required to write off a case' using errcode = '42501'; end if;

  update public.platform_credit_control_cases
     set status = p_status, internal_note = btrim(p_note),
         last_contacted_at = case when p_status in ('contacted', 'promise_to_pay')
                                  then clock_timestamp() else last_contacted_at end,
         next_action_at = p_next_action_at,
         resolved_at = case when p_status in ('resolved', 'written_off')
                            then clock_timestamp() else null end,
         updated_at = clock_timestamp()
   where id = p_case_id;
  insert into public.platform_audit_events (actor_id, event_type, metadata)
  values (
    v_actor, 'platform_credit_control_updated',
    jsonb_build_object('case_id', p_case_id, 'organization_id', v_case.organization_id,
                       'from_status', v_case.status, 'to_status', p_status,
                       'note', btrim(p_note), 'next_action_at', p_next_action_at)
  );
end;
$$;

revoke all on function public.platform_manage_credit_control_case(uuid, text, text, timestamptz)
  from public;
grant execute on function public.platform_manage_credit_control_case(uuid, text, text, timestamptz)
  to authenticated;

create or replace function public.reconcile_billing_access()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_expired_trials integer := 0;
  v_expired_grace integer := 0;
  v_revoked_invites integer := 0;
  v_revoked_inspector_invites integer := 0;
  v_case record;
  v_credit_notifications integer := 0;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;

  with expired as (
    update public.subscriptions subscription
       set status = 'canceled', access_restricted_at = coalesce(access_restricted_at, clock_timestamp()),
           updated_at = clock_timestamp()
     where subscription.status = 'trialing'
       and subscription.trial_ends_at is not null
       and subscription.trial_ends_at <= clock_timestamp()
     returning subscription.organization_id
  ), frozen as (
    update public.organizations organization
       set service_status = 'frozen', frozen_at = clock_timestamp(),
           service_status_reason = '[billing] The approved trial has ended. The owner must contact Haccora or activate a paid plan.',
           updated_at = clock_timestamp()
     where organization.id in (select organization_id from expired)
       and organization.service_status = 'active'
     returning organization.id
  )
  select count(*) into v_expired_trials from frozen;

  with overdue as (
    update public.subscriptions subscription
       set access_restricted_at = coalesce(access_restricted_at, clock_timestamp()),
           updated_at = clock_timestamp()
     where subscription.status = 'past_due'
       and subscription.grace_ends_at is not null
       and subscription.grace_ends_at <= clock_timestamp()
     returning subscription.organization_id
  ), frozen as (
    update public.organizations organization
       set service_status = 'frozen', frozen_at = clock_timestamp(),
           service_status_reason = '[billing] Payment remains overdue after the seven-day grace period. The owner can restore access through billing.',
           updated_at = clock_timestamp()
     where organization.id in (select organization_id from overdue)
       and organization.service_status = 'active'
     returning organization.id
  )
  select count(*) into v_expired_grace from frozen;

  update public.subscription_entitlements entitlement
     set enabled = false, updated_at = clock_timestamp()
   where entitlement.organization_id in (
     select organization.id from public.organizations organization
      where organization.service_status = 'frozen'
        and organization.service_status_reason like '[billing]%'
   )
     and entitlement.enabled;

  update public.organization_invitations invitation
     set revoked_at = clock_timestamp()
   where invitation.accepted_at is null
     and invitation.revoked_at is null
     and invitation.organization_id in (
       select organization.id from public.organizations organization
        where organization.service_status = 'frozen'
          and organization.service_status_reason like '[billing]%'
     );
  get diagnostics v_revoked_invites = row_count;

  update public.inspector_access_invitations invitation
     set revoked_at = clock_timestamp()
   where invitation.accepted_at is null
     and invitation.revoked_at is null
     and invitation.organization_id in (
       select organization.id from public.organizations organization
        where organization.service_status = 'frozen'
          and organization.service_status_reason like '[billing]%'
     );
  get diagnostics v_revoked_inspector_invites = row_count;

  for v_case in
    select subscription.organization_id, subscription.status,
           subscription.payment_failed_at, subscription.grace_ends_at,
           subscription.access_restricted_at
      from public.subscriptions subscription
     where subscription.status in (
       'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'paused', 'incomplete_expired'
     )
       and (
         subscription.status not in ('active', 'trialing')
         or exists (
           select 1 from public.platform_credit_control_cases credit
            where credit.organization_id = subscription.organization_id
              and credit.status <> 'resolved'
         )
       )
  loop
    if public.sync_credit_control_case(
      v_case.organization_id, v_case.status, v_case.payment_failed_at,
      v_case.grace_ends_at, v_case.access_restricted_at
    ) <> 'none' then
      v_credit_notifications := v_credit_notifications + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'expired_trials_restricted', v_expired_trials,
    'payment_grace_restricted', v_expired_grace,
    'pending_invites_revoked', v_revoked_invites,
    'pending_inspector_invites_revoked', v_revoked_inspector_invites,
    'credit_control_cases_reconciled', v_credit_notifications
  );
end;
$$;

revoke all on function public.reconcile_billing_access() from public, anon, authenticated;
grant execute on function public.reconcile_billing_access() to service_role;

commit;