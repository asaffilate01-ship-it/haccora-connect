-- Phase 15: UK food-handler fitness-to-work reporting and controlled clearance.
-- Health records stay private to the employee and organisation leaders.

alter table public.health_register
  add column if not exists reported_by uuid references auth.users(id) on delete restrict,
  add column if not exists cleared_by uuid references auth.users(id) on delete restrict,
  add column if not exists clearance_note text,
  add column if not exists cleared_at timestamptz;

update public.health_register set reported_by = user_id where reported_by is null;
alter table public.health_register alter column reported_by set default auth.uid();
alter table public.health_register alter column reported_by set not null;

alter table public.health_register drop constraint if exists health_clearance_note_length;
alter table public.health_register
  add constraint health_clearance_note_length
  check (clearance_note is null or char_length(clearance_note) <= 2000);

do $$
declare p record;
begin
  for p in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'health_register'
  loop execute format('drop policy if exists %I on public.health_register', p.policyname); end loop;
end;
$$;

drop policy if exists health_read_private on public.health_register;
create policy health_read_private on public.health_register for select to authenticated
using (
  organization_id = public.current_organization_id()
  and (user_id = auth.uid() or public.is_manager_or_owner(auth.uid()))
);

create policy health_report_self_or_leader on public.health_register for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and reported_by = auth.uid()
  and (
    public.is_manager_or_owner(auth.uid())
    or (
      user_id = auth.uid()
      and kind in ('sick_leave', 'exclusion')
      and status = 'excluded'
      and cleared_by is null
      and cleared_at is null
      and fitness_cleared_on is null
    )
  )
  and (location_id is null or location_id = public.current_location_id() or public.is_manager_or_owner(auth.uid()))
);

revoke update, delete on public.health_register from authenticated;
grant select, insert on public.health_register to authenticated;

create or replace function public.clear_health_exclusion(
  p_record_id uuid,
  p_clearance_note text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare v_cleared_at timestamptz;
begin
  if not public.is_manager_or_owner(auth.uid()) then
    raise exception 'Manager or owner access required';
  end if;
  if char_length(coalesce(p_clearance_note, '')) > 2000 then
    raise exception 'Clearance note is too long';
  end if;

  update public.health_register
  set status = 'cleared',
      fitness_cleared_on = current_date,
      cleared_at = now(),
      cleared_by = auth.uid(),
      clearance_note = nullif(btrim(p_clearance_note), '')
  where id = p_record_id
    and organization_id = public.current_organization_id()
    and status = 'excluded'
  returning cleared_at into v_cleared_at;

  if v_cleared_at is null then
    raise exception 'Active exclusion not found';
  end if;
  return v_cleared_at;
end;
$$;

revoke all on function public.clear_health_exclusion(uuid, text) from public, anon;
grant execute on function public.clear_health_exclusion(uuid, text) to authenticated;

comment on function public.clear_health_exclusion(uuid, text) is
  'Manager-only return-to-work clearance with attributable server timestamp.';
