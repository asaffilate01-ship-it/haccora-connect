-- Phase 22: recurring QR equipment checks and role/location RLS hardening.

create table if not exists public.asset_check_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid references public.locations(id) on delete restrict,
  asset_id uuid not null,
  name text not null,
  instructions text,
  event_type text not null default 'inspection' check (
    event_type in ('inspection','maintenance','calibration','cleaning','service')
  ),
  frequency_days integer not null check (frequency_days between 1 and 3660),
  measured_unit text,
  minimum_value numeric,
  maximum_value numeric,
  last_completed_at timestamptz,
  next_due_at timestamptz not null,
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint asset_check_schedules_name_length check (char_length(btrim(name)) between 2 and 120),
  constraint asset_check_schedules_instructions_length check (
    instructions is null or char_length(instructions) <= 2000
  ),
  constraint asset_check_schedules_unit_length check (
    measured_unit is null or char_length(measured_unit) <= 24
  ),
  constraint asset_check_schedules_range check (
    minimum_value is null or maximum_value is null or minimum_value <= maximum_value
  ),
  constraint asset_check_schedules_location_org foreign key (location_id, organization_id)
    references public.locations(id, organization_id) on delete restrict,
  constraint asset_check_schedules_asset_org foreign key (asset_id, organization_id)
    references public.assets(id, organization_id) on delete restrict,
  unique (id, organization_id)
);

create index if not exists asset_check_schedules_due_idx
  on public.asset_check_schedules(organization_id, location_id, next_due_at)
  where active;
create unique index if not exists asset_check_schedules_active_name_unique
  on public.asset_check_schedules(asset_id, lower(name)) where active;

alter table public.asset_events
  add column if not exists schedule_id uuid,
  add column if not exists corrective_action text;

alter table public.asset_events drop constraint if exists asset_events_schedule_org;
alter table public.asset_events add constraint asset_events_schedule_org
  foreign key (schedule_id, organization_id)
  references public.asset_check_schedules(id, organization_id) on delete restrict;
alter table public.asset_events drop constraint if exists asset_events_corrective_action_length;
alter table public.asset_events add constraint asset_events_corrective_action_length
  check (corrective_action is null or char_length(corrective_action) <= 4000);

create or replace function public.attribute_asset_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.assets%rowtype;
  v_schedule public.asset_check_schedules%rowtype;
begin
  select * into v_asset from public.assets where id = new.asset_id;
  if v_asset.id is null or v_asset.organization_id is null or v_asset.retired_at is not null then
    raise exception 'Equipment is unavailable or retired';
  end if;

  -- Tenant and site are authoritative properties of the QR asset, never client claims.
  new.organization_id := v_asset.organization_id;
  new.location_id := v_asset.location_id;

  if new.schedule_id is not null then
    select * into v_schedule
      from public.asset_check_schedules
     where id = new.schedule_id
       and asset_id = new.asset_id
       and organization_id = new.organization_id
       and active;
    if v_schedule.id is null then
      raise exception 'The recurring equipment check is unavailable';
    end if;
    new.event_type := v_schedule.event_type;
    new.measured_unit := coalesce(new.measured_unit, v_schedule.measured_unit);
    new.next_due_at := coalesce(
      new.next_due_at,
      clock_timestamp() + make_interval(days => v_schedule.frequency_days)
    );
    if (v_schedule.minimum_value is not null or v_schedule.maximum_value is not null)
       and new.measured_value is null then
      raise exception 'A reading is required for this recurring equipment check';
    end if;
    if (v_schedule.minimum_value is not null and new.measured_value < v_schedule.minimum_value)
       or (v_schedule.maximum_value is not null and new.measured_value > v_schedule.maximum_value) then
      new.outcome := 'fail';
    end if;
  end if;

  if new.outcome in ('fail','open')
     and char_length(btrim(coalesce(new.corrective_action, ''))) < 2 then
    raise exception 'A corrective action is required for failed or open equipment records';
  end if;

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

create or replace function public.apply_asset_check_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.schedule_id is not null then
    update public.asset_check_schedules
       set last_completed_at = new.recorded_at,
           next_due_at = coalesce(
             new.next_due_at,
             new.recorded_at + make_interval(days => frequency_days)
           ),
           updated_at = clock_timestamp()
     where id = new.schedule_id and organization_id = new.organization_id;
  end if;
  return new;
end;
$$;

drop trigger if exists asset_events_apply_check_completion on public.asset_events;
create trigger asset_events_apply_check_completion after insert on public.asset_events
for each row execute function public.apply_asset_check_completion();

create or replace function public.sync_asset_schedule_due_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset_id uuid := coalesce(new.asset_id, old.asset_id);
  v_organization_id uuid := coalesce(new.organization_id, old.organization_id);
begin
  update public.assets a
     set next_service_at = (
       select min(s.next_due_at)::date
         from public.asset_check_schedules s
        where s.asset_id = v_asset_id
          and s.organization_id = v_organization_id
          and s.active
     )
   where a.id = v_asset_id and a.organization_id = v_organization_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists asset_check_schedules_touch on public.asset_check_schedules;
create trigger asset_check_schedules_touch before update on public.asset_check_schedules
for each row execute function public.touch_updated_at();
drop trigger if exists asset_check_schedules_sync_due on public.asset_check_schedules;
create trigger asset_check_schedules_sync_due after insert or update or delete
on public.asset_check_schedules for each row execute function public.sync_asset_schedule_due_date();
drop trigger if exists asset_check_schedules_audit on public.asset_check_schedules;
create trigger asset_check_schedules_audit after insert or update or delete
on public.asset_check_schedules for each row execute function public.capture_audit_event();

alter table public.asset_check_schedules enable row level security;

-- Equipment master records are manager-owned; operators only append evidence.
drop policy if exists tenant_read on public.assets;
drop policy if exists tenant_insert on public.assets;
drop policy if exists tenant_update on public.assets;
drop policy if exists tenant_delete_admin on public.assets;
drop policy if exists assets_inspector_equipment_read on public.assets;

create policy assets_role_location_read on public.assets for select to authenticated
using (
  public.can_manage_organization(organization_id)
  or (
    public.can_contribute_to_organization(organization_id)
    and (location_id is null or location_id = public.current_location_id())
  )
  or public.has_valid_inspector_grant(organization_id, 'equipment', location_id)
);
create policy assets_manager_insert on public.assets for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and public.can_manage_organization(organization_id)
  and (location_id is null or location_id = public.current_location_id() or public.is_manager_or_owner(auth.uid()))
);
create policy assets_manager_update on public.assets for update to authenticated
using (public.can_manage_organization(organization_id))
with check (
  organization_id = public.current_organization_id()
  and public.can_manage_organization(organization_id)
);
create policy assets_manager_delete on public.assets for delete to authenticated
using (public.can_manage_organization(organization_id));

drop policy if exists asset_events_read on public.asset_events;
drop policy if exists asset_events_insert on public.asset_events;
create policy asset_events_role_location_read on public.asset_events for select to authenticated
using (
  public.can_manage_organization(organization_id)
  or (
    public.can_contribute_to_organization(organization_id)
    and (location_id is null or location_id = public.current_location_id())
  )
  or public.has_valid_inspector_grant(organization_id, 'equipment', location_id)
);
create policy asset_events_role_location_insert on public.asset_events for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and recorded_by = auth.uid()
  and public.can_contribute_to_organization(organization_id)
  and (
    public.can_manage_organization(organization_id)
    or location_id is null
    or location_id = public.current_location_id()
  )
);

create policy asset_check_schedules_role_location_read
on public.asset_check_schedules for select to authenticated
using (
  public.can_manage_organization(organization_id)
  or (
    public.can_contribute_to_organization(organization_id)
    and (location_id is null or location_id = public.current_location_id())
  )
  or public.has_valid_inspector_grant(organization_id, 'equipment', location_id)
);
create policy asset_check_schedules_manager_insert
on public.asset_check_schedules for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and created_by = auth.uid()
  and public.can_manage_organization(organization_id)
);
create policy asset_check_schedules_manager_update
on public.asset_check_schedules for update to authenticated
using (public.can_manage_organization(organization_id))
with check (
  organization_id = public.current_organization_id()
  and public.can_manage_organization(organization_id)
);
create policy asset_check_schedules_manager_delete
on public.asset_check_schedules for delete to authenticated
using (public.can_manage_organization(organization_id));

revoke all on public.asset_check_schedules from anon;
grant select, insert, update, delete on public.asset_check_schedules to authenticated;

comment on table public.asset_check_schedules is
  'Recurring manager-defined checks attached to a protected printable equipment QR record.';
comment on column public.asset_events.corrective_action is
  'Required append-only action evidence when an equipment result is failed or left open.';
