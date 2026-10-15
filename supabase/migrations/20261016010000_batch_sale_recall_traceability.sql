-- Haccora UK Phase 58: batch-to-sale evidence and recall impact.
-- Manually attributed orders are NOT a complete or independently verified
-- Dishbee sales history. Scope and decision authority are enforced in SQL.
begin;

create table public.traceability_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  location_id uuid not null,
  ingredient_id uuid not null,
  goods_in_id uuid references public.goods_in_logs(id) on delete restrict,
  supplier_name text not null check (length(btrim(supplier_name)) between 2 and 160),
  batch_code text not null check (length(btrim(batch_code)) between 1 and 120),
  product_name text not null check (length(btrim(product_name)) between 2 and 200),
  delivery_reference text not null check (length(btrim(delivery_reference)) between 4 and 200),
  received_at timestamptz not null,
  use_by date,
  quantity numeric(14,3) check (quantity > 0),
  unit text check (unit is null or length(btrim(unit)) between 1 and 30),
  status text not null default 'available' check (status in ('available', 'quarantined')),
  captured_by uuid not null default auth.uid() references auth.users(id),
  captured_at timestamptz not null default now(),
  unique (id, organization_id, location_id),
  foreign key (organization_id, location_id)
    references public.locations(organization_id, id) on delete cascade,
  foreign key (ingredient_id, organization_id)
    references public.ingredients(id, organization_id) on delete restrict
);

create unique index traceability_batches_goods_receipt_once
  on public.traceability_batches(organization_id, location_id, goods_in_id)
  where goods_in_id is not null;
create index traceability_batches_lookup
  on public.traceability_batches(organization_id, location_id, batch_code);

create table public.traceability_sale_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  location_id uuid not null,
  batch_id uuid not null,
  order_source text not null check (order_source in ('dishbee', 'manual', 'other')),
  order_reference text not null check (length(btrim(order_reference)) between 3 and 160),
  item_name text not null check (length(btrim(item_name)) between 2 and 200),
  portions integer not null default 1 check (portions between 1 and 10000),
  evidence_note text not null check (length(btrim(evidence_note)) between 12 and 1000),
  attribution text not null default 'manual' check (attribution = 'manual'),
  occurred_at timestamptz not null,
  captured_by uuid not null default auth.uid() references auth.users(id),
  captured_at timestamptz not null default now(),
  foreign key (batch_id, organization_id, location_id)
    references public.traceability_batches(id, organization_id, location_id) on delete restrict,
  foreign key (organization_id, location_id)
    references public.locations(organization_id, id) on delete cascade,
  unique (organization_id, location_id, batch_id, order_source, order_reference, item_name)
);
create index traceability_sale_allocations_batch
  on public.traceability_sale_allocations (organization_id, location_id, batch_id, occurred_at desc);
create index traceability_sale_allocations_order
  on public.traceability_sale_allocations (organization_id, location_id, order_source, order_reference);

create table public.traceability_batch_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  location_id uuid not null,
  batch_id uuid not null,
  recall_id uuid references public.recalls(id) on delete restrict,
  event_type text not null check (event_type in ('quarantined', 'released')),
  reason text not null check (length(btrim(reason)) between 12 and 2000),
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now(),
  foreign key (batch_id, organization_id, location_id)
    references public.traceability_batches(id, organization_id, location_id) on delete restrict
);
create index traceability_batch_events_timeline
  on public.traceability_batch_events(organization_id, location_id, batch_id, recorded_at desc);

-- The optional goods-in reference is checked against its exact tenant/site
-- and the original acceptance record. Never treat a rejected receipt as stock.
create or replace function public.validate_traceability_batch()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_receipt public.goods_in_logs%rowtype;
begin
  if new.status <> 'available' or new.captured_by is distinct from auth.uid()
    or new.received_at > now() + interval '5 minutes' then
    raise exception 'A new batch must be attributed to its signed-in recorder';
  end if;
  if new.goods_in_id is not null then
    select * into v_receipt from public.goods_in_logs where id=new.goods_in_id;
    if not found or v_receipt.received_at > now() + interval '5 minutes'
      or v_receipt.organization_id is distinct from new.organization_id
      or v_receipt.location_id is distinct from new.location_id
      or v_receipt.status <> 'accepted'
      or nullif(btrim(coalesce(v_receipt.batch_lot,'')),'') is null
      or btrim(v_receipt.batch_lot) <> btrim(new.batch_code) then
      raise exception 'Goods-in receipt is not an accepted matching premises batch';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.validate_traceability_batch() from public, anon, authenticated;
create trigger validate_traceability_batch_insert
before insert on public.traceability_batches
for each row execute function public.validate_traceability_batch();

-- Sales attribution is evidence only, not an official Dishbee connector
-- receipt. It must be made while the lot is still available.
create or replace function public.validate_traceability_sale_allocation()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_batch public.traceability_batches%rowtype;
begin
  if new.captured_by is distinct from auth.uid() or new.attribution <> 'manual' then
    raise exception 'Only attributable manual batch allocations are supported';
  end if;
  select * into v_batch from public.traceability_batches
  where id=new.batch_id and organization_id=new.organization_id
    and location_id=new.location_id for share;
  if not found or v_batch.status <> 'available' then
    raise exception 'Cannot attribute a new sale to an unavailable or quarantined batch';
  end if;
  if new.occurred_at > now() + interval '5 minutes'
    or new.occurred_at < v_batch.received_at then
    raise exception 'Sale timestamp is outside the defensible batch timeline';
  end if;
  return new;
end $$;
revoke all on function public.validate_traceability_sale_allocation() from public, anon, authenticated;
create trigger validate_traceability_sale_allocation_insert
before insert on public.traceability_sale_allocations
for each row execute function public.validate_traceability_sale_allocation();

-- Only this locked, audited manager operation can alter quarantine status.
create or replace function public.set_traceability_batch_hold(
  p_batch_id uuid, p_quarantine boolean, p_reason text, p_recall_id uuid default null
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_batch public.traceability_batches%rowtype;
  v_recall public.recalls%rowtype;
  v_next text;
begin
  if auth.uid() is null or p_quarantine is null
    or length(btrim(coalesce(p_reason,''))) < 12 then
    raise exception 'An authenticated manager decision with a reason is required';
  end if;
  select * into v_batch from public.traceability_batches
    where id=p_batch_id for update;
  if not found or not public.can_manage_organization(v_batch.organization_id)
    or not public.can_operate_record(auth.uid(), v_batch.location_id, v_batch.organization_id) then
    raise exception 'Batch is not available to this manager and premises';
  end if;
  v_next := case when p_quarantine then 'quarantined' else 'available' end;
  if v_batch.status = v_next then
    raise exception 'Batch is already in the requested state';
  end if;
  if p_recall_id is not null then
    select * into v_recall from public.recalls where id=p_recall_id;
    if not found or v_recall.organization_id is distinct from v_batch.organization_id
      or (v_recall.location_id is not null
          and v_recall.location_id is distinct from v_batch.location_id) then
      raise exception 'Recall does not belong to this premises';
    end if;
  end if;
  -- An associated active recall requires a documented case closure before release.
  if not p_quarantine and exists (
    select 1 from public.traceability_batch_events e
      join public.recalls r on r.id=e.recall_id
    where e.batch_id=p_batch_id and e.event_type='quarantined'
      and r.status <> 'closed'
  ) then
    raise exception 'Batch cannot be released while a linked recall is active';
  end if;
  update public.traceability_batches set status=v_next where id=p_batch_id;
  insert into public.traceability_batch_events(
    organization_id,location_id,batch_id,recall_id,event_type,reason,recorded_by
  ) values (
    v_batch.organization_id,v_batch.location_id,p_batch_id,p_recall_id,
    case when p_quarantine then 'quarantined' else 'released' end,
    btrim(p_reason),auth.uid()
  );
  return jsonb_build_object('batch_id',p_batch_id,'status',v_next);
end $$;
revoke all on function public.set_traceability_batch_hold(uuid,boolean,text,uuid)
  from public,anon;
grant execute on function public.set_traceability_batch_hold(uuid,boolean,text,uuid)
  to authenticated;

alter table public.traceability_batches enable row level security;
alter table public.traceability_sale_allocations enable row level security;
alter table public.traceability_batch_events enable row level security;

create policy traceability_batches_read on public.traceability_batches
  for select to authenticated using (
    public.can_manage_organization(organization_id)
    and public.can_operate_record(auth.uid(), location_id, organization_id)
  );
create policy traceability_batches_insert on public.traceability_batches
  for insert to authenticated with check (
    public.can_manage_organization(organization_id)
    and public.can_operate_record(auth.uid(), location_id, organization_id)
    and captured_by=auth.uid() and status='available'
  );

create policy traceability_sale_allocations_read on public.traceability_sale_allocations
  for select to authenticated using (
    public.can_manage_organization(organization_id)
    and public.can_operate_record(auth.uid(), location_id, organization_id)
  );
create policy traceability_sale_allocations_insert on public.traceability_sale_allocations
  for insert to authenticated with check (
    public.can_manage_organization(organization_id)
    and public.can_operate_record(auth.uid(), location_id, organization_id)
    and captured_by=auth.uid() and attribution='manual'
  );
create policy traceability_batch_events_read on public.traceability_batch_events
  for select to authenticated using (
    public.can_manage_organization(organization_id)
    and public.can_operate_record(auth.uid(), location_id, organization_id)
  );

revoke all on public.traceability_batches, public.traceability_sale_allocations,
  public.traceability_batch_events from public,anon,authenticated;
grant select,insert on public.traceability_batches to authenticated;
grant select,insert on public.traceability_sale_allocations to authenticated;
grant select on public.traceability_batch_events to authenticated;
commit;
