-- Recall decisions are consequential compliance records. Require a reason,
-- enforce an optimistic status check, and retain an immutable decision log.
begin;

create table public.recall_status_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid not null,
  recall_id uuid not null references public.recalls(id) on delete restrict,
  previous_status text not null check (previous_status in ('open', 'quarantined')),
  next_status text not null check (next_status in ('open', 'quarantined', 'closed')),
  decision_note text not null check (char_length(btrim(decision_note)) between 12 and 2000),
  decided_by uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  constraint recall_status_events_location_org_fk
    foreign key (location_id, organization_id)
    references public.locations(id, organization_id) on delete restrict
);

create index recall_status_events_recall_time_idx
  on public.recall_status_events (recall_id, decided_at desc);

alter table public.recall_status_events enable row level security;
create policy recall_status_events_read on public.recall_status_events
  for select to authenticated using (
    public.can_operate_record(organization_id, auth.uid(), location_id)
  );

revoke all on public.recall_status_events from public, anon, authenticated;
grant select on public.recall_status_events to authenticated;
grant all on public.recall_status_events to service_role;

-- Keep recall reports insertable under existing tenant policies, but require
-- all status changes to go through the audited transition below.
revoke update, delete on public.recalls from public, anon, authenticated;

create or replace function public.transition_recall_status(
  p_recall_id uuid,
  p_expected_status text,
  p_next_status text,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recall public.recalls%rowtype;
  v_location_id uuid;
  v_event_id uuid;
begin
  if auth.uid() is null then
    raise exception 'An authenticated manager is required';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 12 and 2000 then
    raise exception 'A decision reason between 12 and 2000 characters is required';
  end if;
  if p_expected_status is null or p_next_status is null
    or p_expected_status not in ('open', 'quarantined')
    or p_next_status not in ('open', 'quarantined', 'closed')
    or p_expected_status = p_next_status then
    raise exception 'Invalid recall status transition';
  end if;

  select * into v_recall
  from public.recalls
  where id = p_recall_id
  for update;

  if not found or v_recall.organization_id is null then
    raise exception 'Recall not found in an active organization';
  end if;
  if not public.can_manage_organization(v_recall.organization_id) then
    raise exception 'Only an organization owner or manager can change recall status';
  end if;
  if v_recall.status <> p_expected_status then
    raise exception 'Recall status changed; refresh and review the current status';
  end if;
  if v_recall.status = 'closed' then
    raise exception 'Closed recalls cannot be reopened';
  end if;

  v_location_id := coalesce(v_recall.location_id, public.current_location_id());
  if v_location_id is null
    or not public.can_operate_record(v_recall.organization_id, auth.uid(), v_location_id) then
    raise exception 'Select an authorized location for this recall';
  end if;

  update public.recalls
  set status = p_next_status
  where id = v_recall.id;

  insert into public.recall_status_events (
    organization_id, location_id, recall_id, previous_status, next_status,
    decision_note, decided_by
  ) values (
    v_recall.organization_id, v_location_id, v_recall.id, v_recall.status,
    p_next_status, btrim(p_reason), auth.uid()
  ) returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.transition_recall_status(uuid, text, text, text)
  from public, anon;
grant execute on function public.transition_recall_status(uuid, text, text, text)
  to authenticated;

commit;
