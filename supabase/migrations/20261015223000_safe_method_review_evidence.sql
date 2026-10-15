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

commit;
