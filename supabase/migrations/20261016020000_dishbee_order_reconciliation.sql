-- Phase 59: authenticated Dishbee order receipts plus staff-reviewed batch allocation.
-- A received order does NOT establish which supplier lots were used.
-- Only dedicated service_role event ingestion may create source order evidence.
begin;

create table public.dishbee_trace_orders (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.dishbee_runtime_connections(id) on delete restrict,
  organization_id uuid not null,
  location_id uuid not null,
  event_key text not null check (length(btrim(event_key)) between 3 and 240),
  order_reference text not null check (length(btrim(order_reference)) between 3 and 160),
  event_hash text not null check (event_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  source_status text not null default 'received' check (source_status = 'received'),
  unique (connection_id, event_key),
  unique (connection_id, order_reference),
  unique (id, organization_id, location_id),
  foreign key (organization_id, location_id)
    references public.locations(organization_id, id) on delete restrict
);
create index dishbee_trace_orders_site_time
  on public.dishbee_trace_orders (organization_id, location_id, occurred_at desc);

create table public.dishbee_trace_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  organization_id uuid not null,
  location_id uuid not null,
  source_line_id text not null check (length(btrim(source_line_id)) between 1 and 160),
  menu_item_id text check (menu_item_id is null or length(menu_item_id) between 1 and 160),
  item_name text not null check (length(btrim(item_name)) between 2 and 200),
  quantity integer not null check (quantity between 1 and 10000),
  unique (order_id, source_line_id),
  unique (id, organization_id, location_id),
  foreign key (order_id, organization_id, location_id)
    references public.dishbee_trace_orders(id, organization_id, location_id) on delete restrict
);
create index dishbee_trace_order_lines_site
  on public.dishbee_trace_order_lines(organization_id, location_id, order_id);

-- This link is a retrospective HUMAN assertion, even if the order itself
-- arrived from authenticated Dishbee. No automatic lot inference.
create table public.dishbee_trace_batch_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  location_id uuid not null,
  order_line_id uuid not null,
  batch_id uuid not null,
  evidence_note text not null check (length(btrim(evidence_note)) between 12 and 1000),
  attribution text not null default 'manager_reviewed'
    check (attribution = 'manager_reviewed'),
  reviewed_by uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  unique (order_line_id, batch_id),
  foreign key (order_line_id, organization_id, location_id)
    references public.dishbee_trace_order_lines(id, organization_id, location_id) on delete restrict,
  foreign key (batch_id, organization_id, location_id)
    references public.traceability_batches(id, organization_id, location_id) on delete restrict
);
create index dishbee_trace_batch_links_batch
  on public.dishbee_trace_batch_links(organization_id, location_id, batch_id);

alter table public.dishbee_trace_orders enable row level security;
alter table public.dishbee_trace_order_lines enable row level security;
alter table public.dishbee_trace_batch_links enable row level security;

create policy dishbee_trace_orders_manager_read on public.dishbee_trace_orders
for select to authenticated using (
  public.can_manage_organization(organization_id)
  and public.can_operate_record(auth.uid(),location_id,organization_id)
);
create policy dishbee_trace_order_lines_manager_read on public.dishbee_trace_order_lines
for select to authenticated using (
  public.can_manage_organization(organization_id)
  and public.can_operate_record(auth.uid(),location_id,organization_id)
);
create policy dishbee_trace_batch_links_manager_read on public.dishbee_trace_batch_links
for select to authenticated using (
  public.can_manage_organization(organization_id)
  and public.can_operate_record(auth.uid(),location_id,organization_id)
);

revoke all on public.dishbee_trace_orders,public.dishbee_trace_order_lines,
  public.dishbee_trace_batch_links from public,anon,authenticated;
grant select on public.dishbee_trace_orders,public.dishbee_trace_order_lines,
  public.dishbee_trace_batch_links to authenticated;
grant select,insert on public.dishbee_trace_orders,public.dishbee_trace_order_lines
  to service_role;

-- Each event is ingested atomically, deduplicated on event key and source
-- order reference. The event hash must agree on any duplicate/replay.
-- Called only by server-side service_role after Bearer SHA256 and tenant/site
-- mapping have been checked at the HTTP boundary.
create or replace function public.ingest_dishbee_trace_order(
  p_connection uuid,
  p_location uuid,
  p_event_key text,
  p_order_reference text,
  p_occurred_at timestamptz,
  p_event_hash text,
  p_items jsonb
) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_connection public.dishbee_runtime_connections%rowtype;
  v_org uuid;
  v_order public.dishbee_trace_orders%rowtype;
  v_item jsonb;
  v_count integer;
begin
  select * into v_connection from public.dishbee_runtime_connections
    where id=p_connection and status='live';
  if not found then raise exception 'Dishbee runtime connection is not live'; end if;
  v_org := v_connection.organization_id;
  if not exists (
    select 1 from public.dishbee_runtime_locations
    where connection_id=p_connection and organization_id=v_org
      and haccora_location_id=p_location and active=true
  ) then raise exception 'Dishbee premises mapping is inactive'; end if;
  if p_event_key is null or length(btrim(p_event_key)) not between 3 and 240
    or p_order_reference is null or length(btrim(p_order_reference)) not between 3 and 160
    or p_event_hash !~ '^[0-9a-f]{64}$'
    or p_occurred_at is null
    or p_occurred_at > now() + interval '5 minutes'
    or p_occurred_at < now() - interval '180 days'
    or jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) not between 1 and 100
  then raise exception 'Invalid Dishbee order event contract'; end if;

  -- Protect against races on both the event idempotency and the order key.
  insert into public.dishbee_trace_orders(
    connection_id,organization_id,location_id,event_key,order_reference,
    occurred_at,event_hash
  ) values(
    p_connection,v_org,p_location,btrim(p_event_key),btrim(p_order_reference),
    p_occurred_at,p_event_hash
  ) on conflict do nothing returning * into v_order;
  if not found then
    select * into v_order from public.dishbee_trace_orders
      where connection_id=p_connection and
        (event_key=btrim(p_event_key) or order_reference=btrim(p_order_reference))
      for update;
    if not found or v_order.location_id is distinct from p_location
      or v_order.event_key is distinct from btrim(p_event_key)
      or v_order.event_hash is distinct from p_event_hash
      or v_order.order_reference is distinct from btrim(p_order_reference) then
      raise exception 'Conflicting Dishbee order replay or duplicate reference';
    end if;
    return jsonb_build_object('orderId',v_order.id,'duplicate',true);
  end if;

  v_count := 0;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
      or length(btrim(coalesce(v_item->>'lineId',''))) not between 1 and 160
      or length(btrim(coalesce(v_item->>'name',''))) not between 2 and 200
      or (v_item->>'quantity') !~ '^[1-9][0-9]{0,3}$'
      or (v_item ? 'menuItemId' and length(coalesce(v_item->>'menuItemId','')) not between 1 and 160)
    then raise exception 'Invalid Dishbee order item'; end if;
    insert into public.dishbee_trace_order_lines(
      order_id,organization_id,location_id,source_line_id,menu_item_id,item_name,quantity
    ) values (
      v_order.id,v_org,p_location,btrim(v_item->>'lineId'),
      nullif(btrim(coalesce(v_item->>'menuItemId','')),''),
      btrim(v_item->>'name'),(v_item->>'quantity')::integer
    );
    v_count := v_count + 1;
  end loop;
  return jsonb_build_object('orderId',v_order.id,'duplicate',false,'itemCount',v_count);
end $$;
revoke all on function public.ingest_dishbee_trace_order(
  uuid,uuid,text,text,timestamptz,text,jsonb
) from public,anon,authenticated;
grant execute on function public.ingest_dishbee_trace_order(
  uuid,uuid,text,text,timestamptz,text,jsonb
) to service_role;

create or replace function public.link_dishbee_trace_batch(
  p_line_id uuid, p_batch_id uuid, p_evidence_note text
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_line public.dishbee_trace_order_lines%rowtype;
  v_order public.dishbee_trace_orders%rowtype;
  v_batch public.traceability_batches%rowtype;
  v_id uuid;
begin
  if auth.uid() is null or length(btrim(coalesce(p_evidence_note,''))) < 12 then
    raise exception 'Manager identity and batch allocation evidence required';
  end if;
  select * into v_line from public.dishbee_trace_order_lines where id=p_line_id;
  if not found or not public.can_manage_organization(v_line.organization_id)
    or not public.can_operate_record(auth.uid(),v_line.location_id,v_line.organization_id) then
    raise exception 'Order line is not available to this manager';
  end if;
  select * into v_order from public.dishbee_trace_orders
    where id=v_line.order_id and organization_id=v_line.organization_id
      and location_id=v_line.location_id;
  if not found then raise exception 'Source order is unavailable'; end if;
  select * into v_batch from public.traceability_batches
    where id=p_batch_id and organization_id=v_line.organization_id
      and location_id=v_line.location_id for share;
  if not found or v_batch.received_at > v_order.occurred_at then
    raise exception 'Batch does not belong to this order or was received after sale';
  end if;
  -- Deliberately permit retrospective investigation of quarantined lots.
  -- Linking a lot is NOT evidence that all ingredients are accounted for.
  insert into public.dishbee_trace_batch_links(
    organization_id,location_id,order_line_id,batch_id,evidence_note,
    reviewed_by
  ) values (
    v_line.organization_id,v_line.location_id,p_line_id,p_batch_id,
    btrim(p_evidence_note),auth.uid()
  ) returning id into v_id;
  return jsonb_build_object('linkId',v_id,'status','manager_reviewed_not_complete');
end $$;
revoke all on function public.link_dishbee_trace_batch(uuid,uuid,text)
  from public,anon;
grant execute on function public.link_dishbee_trace_batch(uuid,uuid,text)
  to authenticated;

commit;
