-- Phase 17: configurable cleaning schedules and immutable completion evidence.

create table if not exists public.cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  area text not null,
  instruction text not null,
  chemical text,
  contact_minutes integer,
  frequency text not null default 'daily' check (frequency in ('each_shift','daily','weekly','monthly','as_needed')),
  colour_code text,
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cleaning_task_area_length check (char_length(btrim(area)) between 2 and 160),
  constraint cleaning_task_instruction_length check (char_length(btrim(instruction)) between 3 and 2000),
  constraint cleaning_task_contact_time check (contact_minutes is null or contact_minutes between 0 and 1440),
  constraint cleaning_task_location_org foreign key (location_id, organization_id)
    references public.locations(id, organization_id) on delete cascade,
  unique (id, organization_id)
);

create table if not exists public.cleaning_completions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete restrict,
  task_id uuid references public.cleaning_tasks(id) on delete restrict,
  task_area_snapshot text not null,
  completed_by uuid not null references auth.users(id) on delete restrict,
  completed_at timestamptz not null default now(),
  result text not null default 'satisfactory' check (result in ('satisfactory','recleaned','issue_reported')),
  notes text,
  idempotency_key uuid,
  created_at timestamptz not null default now(),
  constraint cleaning_completion_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint cleaning_completion_location_org foreign key (location_id, organization_id)
    references public.locations(id, organization_id) on delete restrict,
  constraint cleaning_completion_task_org foreign key (task_id, organization_id)
    references public.cleaning_tasks(id, organization_id) on delete restrict,
  unique (organization_id, idempotency_key)
);

create index if not exists cleaning_tasks_location_active_idx on public.cleaning_tasks(organization_id, location_id, active);
create index if not exists cleaning_completions_task_time_idx on public.cleaning_completions(organization_id, task_id, completed_at desc);

drop trigger if exists cleaning_tasks_touch on public.cleaning_tasks;
create trigger cleaning_tasks_touch before update on public.cleaning_tasks
for each row execute function public.touch_updated_at();

alter table public.cleaning_tasks enable row level security;
alter table public.cleaning_completions enable row level security;

drop policy if exists cleaning_tasks_read on public.cleaning_tasks;
create policy cleaning_tasks_read on public.cleaning_tasks for select to authenticated
using (public.can_read_organization(organization_id));
drop policy if exists cleaning_tasks_insert on public.cleaning_tasks;
create policy cleaning_tasks_insert on public.cleaning_tasks for insert to authenticated
with check (public.can_manage_organization(organization_id) and created_by = auth.uid());
drop policy if exists cleaning_tasks_update on public.cleaning_tasks;
create policy cleaning_tasks_update on public.cleaning_tasks for update to authenticated
using (public.can_manage_organization(organization_id))
with check (public.can_manage_organization(organization_id));
drop policy if exists cleaning_tasks_delete on public.cleaning_tasks;
create policy cleaning_tasks_delete on public.cleaning_tasks for delete to authenticated
using (public.can_manage_organization(organization_id));

drop policy if exists cleaning_completions_read on public.cleaning_completions;
create policy cleaning_completions_read on public.cleaning_completions for select to authenticated
using (public.can_read_organization(organization_id));
drop policy if exists cleaning_completions_insert on public.cleaning_completions;
create policy cleaning_completions_insert on public.cleaning_completions for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and completed_by = auth.uid()
  and public.can_contribute_to_organization(organization_id)
  and (location_id is null or location_id = public.current_location_id() or public.is_manager_or_owner(auth.uid()))
);

revoke all on public.cleaning_tasks, public.cleaning_completions from anon;
grant select, insert, update, delete on public.cleaning_tasks to authenticated;
grant all on public.cleaning_tasks to service_role;
grant select, insert on public.cleaning_completions to authenticated;
grant all on public.cleaning_completions to service_role;
revoke update, delete on public.cleaning_completions from authenticated;

comment on table public.cleaning_tasks is 'Business-configured cleaning schedule for a UK food premises.';
comment on table public.cleaning_completions is 'Immutable, attributable cleaning completion evidence with task snapshot.';