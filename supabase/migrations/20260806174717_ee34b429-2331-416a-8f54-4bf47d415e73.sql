-- Phase 20: QR-addressable equipment with immutable, attributable history.

alter table public.assets
  add column if not exists asset_code text,
  add column if not exists qr_token uuid default gen_random_uuid(),
  add column if not exists manufacturer text,
  add column if not exists model text,
  add column if not exists purchase_date date,
  add column if not exists warranty_expires_at date,
  add column if not exists notes text,
  add column if not exists retired_at timestamptz;

update public.assets
set asset_code = 'HAC-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where asset_code is null;
update public.assets set qr_token = gen_random_uuid() where qr_token is null;

alter table public.assets alter column asset_code set not null;
alter table public.assets alter column qr_token set not null;
alter table public.assets drop constraint if exists assets_asset_code_format;
alter table public.assets add constraint assets_asset_code_format
  check (asset_code ~ '^[A-Z0-9][A-Z0-9-]{2,31}$');
alter table public.assets drop constraint if exists assets_notes_length;
alter table public.assets add constraint assets_notes_length
  check (notes is null or char_length(notes) <= 4000);

create unique index if not exists assets_org_asset_code_unique
  on public.assets(organization_id, asset_code);
create unique index if not exists assets_qr_token_unique on public.assets(qr_token);
create unique index if not exists assets_id_org_unique on public.assets(id, organization_id);

create table if not exists public.asset_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid references public.locations(id) on delete restrict,
  asset_id uuid not null,
  event_type text not null check (
    event_type in ('inspection','maintenance','repair','calibration','cleaning','issue','movement','service')
  ),
  outcome text not null check (outcome in ('pass','fail','monitoring','completed','open')),
  title text not null,
  notes text,
  measured_value numeric,
  measured_unit text,
  next_due_at timestamptz,
  recorded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  recorded_by_name text not null default 'Team member',
  recorded_at timestamptz not null default clock_timestamp(),
  idempotency_key uuid,
  created_at timestamptz not null default clock_timestamp(),
  constraint asset_events_title_length check (char_length(btrim(title)) between 2 and 160),
  constraint asset_events_notes_length check (notes is null or char_length(notes) <= 4000),
  constraint asset_events_unit_length check (measured_unit is null or char_length(measured_unit) <= 24),
  constraint asset_events_location_org foreign key (location_id, organization_id)
    references public.locations(id, organization_id) on delete restrict,
  constraint asset_events_asset_org foreign key (asset_id, organization_id)
    references public.assets(id, organization_id) on delete restrict,
  unique (organization_id, idempotency_key)
);

create index if not exists asset_events_asset_time_idx
  on public.asset_events(organization_id, asset_id, recorded_at desc);

create or replace function public.attribute_asset_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.recorded_by := auth.uid();
    select coalesce(nullif(btrim(p.full_name), ''), 'Team member')
      into new.recorded_by_name
      from public.profiles p
     where p.id = auth.uid();
  end if;
  if new.recorded_by is null then
    raise exception 'An attributable actor is required';
  end if;
  new.recorded_by_name := coalesce(new.recorded_by_name, 'Team member');
  new.recorded_at := clock_timestamp();
  new.created_at := new.recorded_at;
  return new;
end;
$$;

drop trigger if exists asset_events_attribute on public.asset_events;
create trigger asset_events_attribute before insert on public.asset_events
for each row execute function public.attribute_asset_event();

create or replace function public.apply_asset_event_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_type in ('maintenance','service','repair','calibration')
     and new.outcome in ('pass','completed') then
    update public.assets
    set last_service_at = new.recorded_at::date,
        next_service_at = coalesce(new.next_due_at::date, next_service_at),
        status = 'ok'
    where id = new.asset_id and organization_id = new.organization_id;
  elsif new.event_type = 'issue' or new.outcome in ('fail','open') then
    update public.assets
    set status = 'attention'
    where id = new.asset_id and organization_id = new.organization_id;
  end if;
  return new;
end;
$$;

drop trigger if exists asset_events_apply_status on public.asset_events;
create trigger asset_events_apply_status after insert on public.asset_events
for each row execute function public.apply_asset_event_status();

drop trigger if exists asset_events_audit on public.asset_events;
create trigger asset_events_audit after insert or update or delete on public.asset_events
for each row execute function public.capture_audit_event();

create or replace function public.reject_asset_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Equipment history is append-only';
end;
$$;
drop trigger if exists asset_events_immutable on public.asset_events;
create trigger asset_events_immutable before update or delete on public.asset_events
for each row execute function public.reject_asset_event_mutation();

alter table public.asset_events enable row level security;

drop policy if exists asset_events_read on public.asset_events;
create policy asset_events_read on public.asset_events for select to authenticated
using (
  public.can_read_organization(organization_id)
  or public.has_valid_inspector_grant(organization_id, 'equipment', location_id)
);

drop policy if exists asset_events_insert on public.asset_events;
create policy asset_events_insert on public.asset_events for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and recorded_by = auth.uid()
  and public.can_contribute_to_organization(organization_id)
  and (
    location_id is null
    or location_id = public.current_location_id()
    or public.is_manager_or_owner(auth.uid())
  )
  and exists (
    select 1 from public.assets a
    where a.id = asset_id
      and a.organization_id = asset_events.organization_id
      and (a.location_id is null or a.location_id = asset_events.location_id or public.is_manager_or_owner(auth.uid()))
      and a.retired_at is null
  )
);

drop policy if exists assets_inspector_equipment_read on public.assets;
create policy assets_inspector_equipment_read on public.assets for select to authenticated
using (public.has_valid_inspector_grant(organization_id, 'equipment', location_id));

revoke all on public.asset_events from anon;
grant select, insert on public.asset_events to authenticated;
grant all on public.asset_events to service_role;
revoke update, delete on public.asset_events from authenticated;

comment on table public.asset_events is
  'Append-only equipment inspections, maintenance, repairs, calibration, cleaning and issue evidence.';
comment on column public.assets.qr_token is
  'Non-sequential lookup token encoded in the printed Haccora equipment QR label; authentication and RLS still apply.';