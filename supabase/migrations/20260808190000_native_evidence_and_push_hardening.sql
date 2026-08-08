-- Phase 24: harden native evidence metadata and push-token ownership.

begin;

-- New evidence records may only point to encrypted HTTPS destinations and
-- supplied file digests must be canonical SHA-256 values. NOT VALID keeps the
-- forward migration safe when a legacy deployment contains older records,
-- while still enforcing the constraints for every new or changed row.
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

-- Expo tickets only confirm that a message was accepted for delivery. Persist
-- their receipt ids so the dispatcher can later verify the APNs/FCM hand-off
-- and retire device tokens rejected by the provider.
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

-- Expo can return the same physical-device token after a different Haccora
-- user signs in. Transfer that token to the authenticated tenant instead of
-- silently leaving it enabled for the previous account.
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

commit;
