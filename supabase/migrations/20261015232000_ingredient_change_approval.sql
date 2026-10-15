-- Controlled UK ingredient specification revisions.
-- Manager requests are immutable; a scoped SECURITY DEFINER review function
-- locks the ingredient and request, verifies the original version and applies
-- an approved change atomically, leaving stale PPDS labels detectable.
begin;

create table public.ingredient_change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ingredient_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  expected_version text not null default '',
  proposed_version text not null check (length(btrim(proposed_version)) between 1 and 80),
  proposed_statement text not null check (length(btrim(proposed_statement)) between 3 and 4000),
  proposed_allergens text[] not null default '{}' check (cardinality(proposed_allergens) <= 14),
  proposed_may_contain text[] not null default '{}' check (cardinality(proposed_may_contain) <= 14),
  evidence_reference text not null check (length(btrim(evidence_reference)) between 8 and 500),
  reason text not null check (length(btrim(reason)) between 12 and 1000),
  requested_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  previous_snapshot jsonb,
  applied_snapshot jsonb,
  constraint ingredient_change_requests_ingredient_fk
    foreign key (ingredient_id, organization_id)
    references public.ingredients(id, organization_id) on delete cascade,
  constraint ingredient_change_requests_decision_consistency
    check (
      (status = 'pending' and reviewed_at is null and reviewed_by is null)
      or (status <> 'pending' and reviewed_at is not null and reviewed_by is not null)
    )
);

create unique index ingredient_change_requests_one_pending
  on public.ingredient_change_requests(organization_id, ingredient_id)
  where status = 'pending';

create index ingredient_change_requests_org_queue
  on public.ingredient_change_requests(organization_id, status, requested_at desc);

alter table public.ingredient_change_requests enable row level security;

create policy ingredient_change_requests_read on public.ingredient_change_requests
for select to authenticated
using (public.can_manage_organization(organization_id));

create policy ingredient_change_requests_propose on public.ingredient_change_requests
for insert to authenticated
with check (
  public.can_manage_organization(organization_id)
  and requested_by = auth.uid()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and previous_snapshot is null
  and applied_snapshot is null
  and reviewed_by is null
);

revoke all on public.ingredient_change_requests from public, anon, authenticated;
grant select, insert on public.ingredient_change_requests to authenticated;

create or replace function public.review_ingredient_change(
  p_request_id uuid,
  p_approve boolean,
  p_review_note text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.ingredient_change_requests%rowtype;
  v_ingredient public.ingredients%rowtype;
  v_previous jsonb;
  v_current jsonb;
  v_status text;
begin
  if auth.uid() is null or length(btrim(coalesce(p_review_note, ''))) < 12 then
    raise exception 'Authenticated review with a reason of at least 12 characters required';
  end if;

  select * into v_request
  from public.ingredient_change_requests
  where id = p_request_id
  for update;
  if not found or not public.can_manage_organization(v_request.organization_id) then
    raise exception 'Ingredient change request unavailable';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'Ingredient change request was already reviewed';
  end if;

  select * into v_ingredient
  from public.ingredients
  where id = v_request.ingredient_id
    and organization_id = v_request.organization_id
  for update;
  if not found then
    raise exception 'Ingredient no longer exists in this organization';
  end if;

  v_previous := jsonb_build_object(
    'ingredient_statement', v_ingredient.ingredient_statement,
    'allergens', v_ingredient.allergens,
    'may_contain', v_ingredient.may_contain,
    'specification_version', v_ingredient.specification_version,
    'reviewed_at', v_ingredient.reviewed_at
  );

  if p_approve then
    if coalesce(v_ingredient.specification_version, '') <> v_request.expected_version then
      raise exception 'Supplier specification changed since the proposal; create a new review';
    end if;
    if v_request.proposed_version = coalesce(v_ingredient.specification_version, '') then
      raise exception 'New supplier specification version must differ from current version';
    end if;

    update public.ingredients
    set ingredient_statement = btrim(v_request.proposed_statement),
        allergens = v_request.proposed_allergens,
        may_contain = v_request.proposed_may_contain,
        specification_version = btrim(v_request.proposed_version),
        reviewed_at = now(),
        updated_at = now()
    where id = v_request.ingredient_id
      and organization_id = v_request.organization_id
    returning * into v_ingredient;

    v_current := jsonb_build_object(
      'ingredient_statement', v_ingredient.ingredient_statement,
      'allergens', v_ingredient.allergens,
      'may_contain', v_ingredient.may_contain,
      'specification_version', v_ingredient.specification_version,
      'reviewed_at', v_ingredient.reviewed_at
    );
    v_status := 'approved';
  else
    v_current := null;
    v_status := 'rejected';
  end if;

  update public.ingredient_change_requests
  set status = v_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = btrim(p_review_note),
      previous_snapshot = v_previous,
      applied_snapshot = v_current
  where id = p_request_id;

  return jsonb_build_object(
    'id', p_request_id,
    'status', v_status,
    'ingredient_id', v_request.ingredient_id
  );
end;
$$;

revoke all on function public.review_ingredient_change(uuid, boolean, text)
from public, anon;
grant execute on function public.review_ingredient_change(uuid, boolean, text)
to authenticated;

commit;
