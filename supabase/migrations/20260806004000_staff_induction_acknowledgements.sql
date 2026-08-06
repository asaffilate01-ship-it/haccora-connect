-- Phase 14: attributable staff induction and policy acknowledgements.
-- Acknowledgement is intentionally performed through a narrow RPC so staff
-- cannot alter the instruction, due date or attribution they are confirming.

create table if not exists public.staff_induction_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid,
  user_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  instructions text,
  due_at timestamptz,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  acknowledgement_version text not null default 'v1',
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_induction_title_length check (char_length(btrim(title)) between 2 and 160),
  constraint staff_induction_instructions_length check (instructions is null or char_length(instructions) <= 5000),
  constraint staff_induction_location_org_fk foreign key (organization_id, location_id)
    references public.locations(organization_id, id) on delete restrict,
  constraint staff_induction_member_fk foreign key (organization_id, user_id)
    references public.organization_memberships(organization_id, user_id) on delete restrict
);

create index if not exists staff_induction_user_due_idx
  on public.staff_induction_assignments (organization_id, user_id, acknowledged_at, due_at);

drop trigger if exists staff_induction_touch_updated_at on public.staff_induction_assignments;
create trigger staff_induction_touch_updated_at
before update on public.staff_induction_assignments
for each row execute function public.touch_updated_at();

alter table public.staff_induction_assignments enable row level security;

drop policy if exists "Staff read own inductions; leaders read organisation" on public.staff_induction_assignments;
create policy "Staff read own inductions; leaders read organisation"
on public.staff_induction_assignments for select to authenticated
using (
  organization_id = public.current_organization_id()
  and (
    user_id = auth.uid()
    or public.is_manager_or_owner(auth.uid())
    or public.is_inspector(auth.uid())
  )
);

drop policy if exists "Leaders assign inductions" on public.staff_induction_assignments;
create policy "Leaders assign inductions"
on public.staff_induction_assignments for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and assigned_by = auth.uid()
  and public.is_manager_or_owner(auth.uid())
);

drop policy if exists "Leaders remove unacknowledged inductions" on public.staff_induction_assignments;
create policy "Leaders remove unacknowledged inductions"
on public.staff_induction_assignments for delete to authenticated
using (
  organization_id = public.current_organization_id()
  and acknowledged_at is null
  and public.is_manager_or_owner(auth.uid())
);

revoke all on public.staff_induction_assignments from anon;
revoke update on public.staff_induction_assignments from authenticated;
grant select, insert, delete on public.staff_induction_assignments to authenticated;

create or replace function public.acknowledge_my_induction(p_assignment_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acknowledged_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.staff_induction_assignments
  set acknowledged_at = coalesce(acknowledged_at, now())
  where id = p_assignment_id
    and organization_id = public.current_organization_id()
    and user_id = auth.uid()
  returning acknowledged_at into v_acknowledged_at;

  if v_acknowledged_at is null then
    raise exception 'Induction not found or not assigned to the current user';
  end if;
  return v_acknowledged_at;
end;
$$;

revoke all on function public.acknowledge_my_induction(uuid) from public, anon;
grant execute on function public.acknowledge_my_induction(uuid) to authenticated;

comment on table public.staff_induction_assignments is
  'Versioned induction or policy instructions assigned to named staff, with attributable acknowledgement evidence.';
comment on column public.staff_induction_assignments.acknowledged_at is
  'Server timestamp set only by acknowledge_my_induction; managers cannot acknowledge for another person.';
