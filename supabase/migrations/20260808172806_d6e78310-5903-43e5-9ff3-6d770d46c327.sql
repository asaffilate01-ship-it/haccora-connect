-- Restore the intended final policy state after the generated 20260808161318
-- reconciliation accidentally replaced tenant-owner billing access with
-- platform-operator access.

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

drop policy if exists subscriptions_owner_read on public.subscriptions;
create policy subscriptions_owner_read
on public.subscriptions for select to authenticated
using (public.has_org_role(organization_id, array['owner']::public.app_role[]));

drop policy if exists billing_events_owner_read on public.billing_events;
create policy billing_events_owner_read
on public.billing_events for select to authenticated
using (public.has_org_role(organization_id, array['owner']::public.app_role[]));

comment on policy subscriptions_owner_read on public.subscriptions is
  'Tenant subscription records are visible only to an active owner of that tenant.';
comment on policy billing_events_owner_read on public.billing_events is
  'Tenant billing event records are visible only to an active owner of that tenant.';

-- Phase 24: harden native evidence metadata and push-token ownership.
alter table public.documents
  drop constraint if exists documents_file_url_https;
alter table public.documents
  add constraint documents_file_url_https
  check (file_url is null or file_url ~ '^https://') not valid;

alter table public.documents
  drop constraint if exists documents_sha256_format;
alter table public.documents
  add constraint documents_sha256_format
  check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$') not valid;

create table if not exists public.expo_push_receipts (
  ticket_id text primary key check (char_length(ticket_id) between 8 and 200),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null check (char_length(token) between 20 and 4096),
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 10),
  next_attempt_at timestamptz not null default (now() + interval '15 minutes'),
  provider_error text check (char_length(provider_error) <= 500),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expo_push_receipts_pending_idx
  on public.expo_push_receipts (next_attempt_at, created_at)
  where status = 'pending';

alter table public.expo_push_receipts enable row level security;
revoke all on public.expo_push_receipts from anon, authenticated;
grant select, insert, update, delete on public.expo_push_receipts to service_role;

create or replace function public.register_my_push_token(
  p_token text,
  p_platform text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid := public.current_organization_id();
  v_token text := trim(p_token);
begin
  if v_user_id is null
     or v_org_id is null
     or not public.can_read_organization(v_org_id)
     or char_length(v_token) not between 20 and 4096
     or p_platform not in ('ios', 'android', 'web') then
    raise exception 'invalid push token';
  end if;

  insert into public.device_push_tokens (
    user_id,
    organization_id,
    token,
    platform,
    enabled
  ) values (
    v_user_id,
    v_org_id,
    v_token,
    p_platform,
    true
  )
  on conflict (token) do update set
    user_id = excluded.user_id,
    organization_id = excluded.organization_id,
    platform = excluded.platform,
    enabled = true,
    updated_at = now();
end;
$$;

revoke all on function public.register_my_push_token(text, text) from public;
grant execute on function public.register_my_push_token(text, text) to authenticated;

comment on function public.register_my_push_token(text, text) is
  'Registers a tenant-scoped push token and safely transfers a reused physical-device token to the current authenticated user.';

comment on table public.expo_push_receipts is
  'Service-only delivery evidence used to reconcile Expo push tickets with APNs/FCM receipts.';