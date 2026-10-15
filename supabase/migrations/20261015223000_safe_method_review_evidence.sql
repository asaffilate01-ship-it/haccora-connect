-- Append-only site-safe-method review history for UK Haccora.
-- Existing site_safe_methods remains the current materialized state.
-- Every change is captured by a server-owned trigger, including prior state.
begin;

create table public.site_safe_method_review_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  location_id uuid not null,
  template_id text not null references public.safe_method_templates(id),
  event_action text not null check (event_action in ('created', 'revised')),
  previous_state jsonb,
  current_state jsonb not null check (jsonb_typeof(current_state) = 'object'),
  actor_id uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  foreign key (organization_id, location_id)
    references public.locations(organization_id, id) on delete cascade
);

create index site_safe_method_review_events_timeline
  on public.site_safe_method_review_events
  (organization_id, location_id, template_id, recorded_at desc);

alter table public.site_safe_method_review_events enable row level security;

create policy site_safe_method_review_events_read
on public.site_safe_method_review_events
for select to authenticated
using (public.can_manage_organization(organization_id));

revoke all on public.site_safe_method_review_events from public, anon, authenticated;
grant select on public.site_safe_method_review_events to authenticated;

create or replace function public.capture_safe_method_review()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into public.site_safe_method_review_events (
      organization_id, location_id, template_id, event_action,
      previous_state, current_state, actor_id
    ) values (
      new.organization_id, new.location_id, new.template_id, 'created',
      null, to_jsonb(new), auth.uid()
    );
  elsif to_jsonb(new) is distinct from to_jsonb(old) then
    insert into public.site_safe_method_review_events (
      organization_id, location_id, template_id, event_action,
      previous_state, current_state, actor_id
    ) values (
      new.organization_id, new.location_id, new.template_id, 'revised',
      to_jsonb(old), to_jsonb(new), auth.uid()
    );
  end if;
  return new;
end $$;

revoke all on function public.capture_safe_method_review() from public, anon, authenticated;

create trigger capture_site_safe_method_review
after insert or update on public.site_safe_methods
for each row execute function public.capture_safe_method_review();

-- Forbid modification of captured history, even when client write grants drift.
create or replace function public.block_safe_method_review_mutation()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  raise exception 'Safe method review history is append only';
end $$;

revoke all on function public.block_safe_method_review_mutation()
from public, anon, authenticated;

create trigger block_site_safe_method_review_update
before update or delete on public.site_safe_method_review_events
for each row execute function public.block_safe_method_review_mutation();

-- Fail closed at the database boundary; clients must not self-certify a
-- blank or mismatched active method by bypassing the guided form.
create or replace function public.validate_site_safe_method_activation()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_prompts jsonb;
  v_version text;
  v_jurisdiction text;
  v_answers jsonb;
  v_position integer;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select version, prompts into v_version, v_prompts
  from public.safe_method_templates
  where id = new.template_id;

  select jurisdiction into v_jurisdiction
  from public.site_compliance_profiles
  where organization_id = new.organization_id
    and location_id = new.location_id;

  if v_jurisdiction is null
    or v_version is null
    or jsonb_typeof(v_prompts) <> 'array'
    or jsonb_array_length(v_prompts) = 0
    or new.controls->>'jurisdiction' is distinct from v_jurisdiction
    or new.controls->>'templateVersion' is distinct from v_version
    or new.controls->>'managementConfirmed' is distinct from 'true'
    or new.controls->>'reviewedBy' is distinct from auth.uid()::text
    or new.adopted_by is distinct from auth.uid()
    or new.adopted_at is null
    or new.review_due_at is null
    or new.review_due_at < current_date
  then
    raise exception 'Premises-specific management review required';
  end if;

  v_answers := new.controls->'answers';
  if jsonb_typeof(v_answers) <> 'object' then
    raise exception 'Safe method control answers required';
  end if;

  for v_position in 0..jsonb_array_length(v_prompts) - 1 loop
    if length(btrim(coalesce(v_answers->>v_position::text, ''))) < 12 then
      raise exception 'Every safe method prompt requires an actual site procedure';
    end if;
  end loop;
  return new;
end $$;

revoke all on function public.validate_site_safe_method_activation()
from public, anon, authenticated;

create trigger validate_site_safe_method_activation
before insert or update on public.site_safe_methods
for each row execute function public.validate_site_safe_method_activation();

commit;
