-- Dishbee -> Haccora compliance runtime.
-- One explicit Haccora organization maps to one Dishbee tenant; locations are
-- mapped separately. The bearer token is stored only as a SHA-256 hash.

begin;

create table if not exists public.dishbee_runtime_connections(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dishbee_tenant_id uuid not null,
  token_hash text not null check(token_hash ~ '^[0-9a-f]{64}$'),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'testing'
    check(status in ('testing','live','paused','revoked')),
  metadata jsonb not null default '{}'::jsonb,
  last_event_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id),
  unique(dishbee_tenant_id)
);

create table if not exists public.dishbee_runtime_locations(
  connection_id uuid not null references public.dishbee_runtime_connections(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dishbee_location_id uuid not null,
  haccora_location_id uuid not null references public.locations(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(connection_id,dishbee_location_id),
  unique(connection_id,haccora_location_id)
);

create table if not exists public.dishbee_runtime_entity_maps(
  connection_id uuid not null references public.dishbee_runtime_connections(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dishbee_entity_type text not null,
  dishbee_entity_id text not null,
  haccora_entity_type text not null,
  haccora_entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(connection_id,dishbee_entity_type,dishbee_entity_id)
);

create table if not exists public.dishbee_runtime_events(
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.dishbee_runtime_connections(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  haccora_location_id uuid references public.locations(id) on delete set null,
  event_key text not null,
  event_type text not null,
  subject_type text not null,
  subject_id text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received'
    check(status in ('received','processed','ignored','failed')),
  target_table text,
  target_id uuid,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(connection_id,event_key)
);
create index if not exists dishbee_runtime_events_status_idx
  on public.dishbee_runtime_events(organization_id,status,received_at desc);

alter table public.dishbee_runtime_connections enable row level security;
alter table public.dishbee_runtime_locations enable row level security;
alter table public.dishbee_runtime_entity_maps enable row level security;
alter table public.dishbee_runtime_events enable row level security;

revoke all on public.dishbee_runtime_connections from public,anon,authenticated;
revoke all on public.dishbee_runtime_locations from public,anon,authenticated;
revoke all on public.dishbee_runtime_entity_maps from public,anon,authenticated;
revoke all on public.dishbee_runtime_events from public,anon,authenticated;

grant select on public.dishbee_runtime_connections to authenticated;
grant select on public.dishbee_runtime_locations to authenticated;
grant select on public.dishbee_runtime_entity_maps to authenticated;
grant select on public.dishbee_runtime_events to authenticated;
grant all on public.dishbee_runtime_connections to service_role;
grant all on public.dishbee_runtime_locations to service_role;
grant all on public.dishbee_runtime_entity_maps to service_role;
grant all on public.dishbee_runtime_events to service_role;

create policy dishbee_runtime_connection_org_read on public.dishbee_runtime_connections
for select to authenticated using(public.has_org_role(organization_id,array['owner','manager']::public.app_role[]));
create policy dishbee_runtime_location_org_read on public.dishbee_runtime_locations
for select to authenticated using(public.has_org_role(organization_id,array['owner','manager']::public.app_role[]));
create policy dishbee_runtime_map_org_read on public.dishbee_runtime_entity_maps
for select to authenticated using(public.has_org_role(organization_id,array['owner','manager']::public.app_role[]));
create policy dishbee_runtime_event_org_read on public.dishbee_runtime_events
for select to authenticated using(public.has_org_role(organization_id,array['owner','manager']::public.app_role[]));

create or replace function public.platform_configure_dishbee_runtime(
  p_organization uuid,
  p_dishbee_tenant uuid,
  p_token_hash text,
  p_actor_user uuid,
  p_locations jsonb,
  p_status text default 'testing'
) returns uuid
language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare
  v_connection uuid;
  v_row jsonb;
  v_location uuid;
begin
  perform public.require_tenant_setup_operator();
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid token hash'; end if;
  if p_status not in ('testing','live','paused','revoked') then raise exception 'invalid connection status'; end if;
  if not exists(
    select 1 from public.organization_memberships
    where organization_id=p_organization and user_id=p_actor_user and status='active'
  ) then raise exception 'integration actor must be an active organization member'; end if;

  insert into public.dishbee_runtime_connections(
    organization_id,dishbee_tenant_id,token_hash,actor_user_id,status,metadata
  ) values(
    p_organization,p_dishbee_tenant,p_token_hash,p_actor_user,p_status,
    jsonb_build_object('configuredBy',auth.uid(),'configuredAt',now())
  )
  on conflict(organization_id) do update set
    dishbee_tenant_id=excluded.dishbee_tenant_id,
    token_hash=excluded.token_hash,
    actor_user_id=excluded.actor_user_id,
    status=excluded.status,
    metadata=public.dishbee_runtime_connections.metadata||excluded.metadata,
    updated_at=now()
  returning id into v_connection;

  delete from public.dishbee_runtime_locations where connection_id=v_connection;
  for v_row in select * from jsonb_array_elements(coalesce(p_locations,'[]'::jsonb))
  loop
    v_location:=(v_row->>'haccoraLocationId')::uuid;
    if not exists(
      select 1 from public.locations where id=v_location and organization_id=p_organization
    ) then raise exception 'Haccora location does not belong to organization'; end if;
    insert into public.dishbee_runtime_locations(
      connection_id,organization_id,dishbee_location_id,haccora_location_id,active
    ) values(
      v_connection,p_organization,(v_row->>'dishbeeLocationId')::uuid,v_location,
      coalesce((v_row->>'active')::boolean,true)
    );
  end loop;

  insert into public.platform_audit_events(actor_id,event_type,metadata)
  values(auth.uid(),'dishbee_runtime_configured',jsonb_build_object(
    'organization_id',p_organization,'connection_id',v_connection,
    'dishbee_tenant_id',p_dishbee_tenant,'location_count',jsonb_array_length(coalesce(p_locations,'[]'::jsonb))
  ));

  return v_connection;
end $$;

revoke all on function public.platform_configure_dishbee_runtime(uuid,uuid,text,uuid,jsonb,text)
from public,anon;
grant execute on function public.platform_configure_dishbee_runtime(uuid,uuid,text,uuid,jsonb,text)
to authenticated;

create or replace function public.platform_map_dishbee_entity(
  p_connection uuid,
  p_dishbee_type text,
  p_dishbee_id text,
  p_haccora_type text,
  p_haccora_id uuid,
  p_metadata jsonb default '{}'::jsonb
) returns boolean
language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare c public.dishbee_runtime_connections%rowtype;
begin
  perform public.require_tenant_setup_operator();
  select * into c from public.dishbee_runtime_connections where id=p_connection;
  if not found then raise exception 'Dishbee runtime connection not found'; end if;
  insert into public.dishbee_runtime_entity_maps(
    connection_id,organization_id,dishbee_entity_type,dishbee_entity_id,
    haccora_entity_type,haccora_entity_id,metadata
  ) values(
    c.id,c.organization_id,p_dishbee_type,p_dishbee_id,p_haccora_type,p_haccora_id,coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict(connection_id,dishbee_entity_type,dishbee_entity_id) do update set
    haccora_entity_type=excluded.haccora_entity_type,
    haccora_entity_id=excluded.haccora_entity_id,
    metadata=excluded.metadata,
    updated_at=now();
  return true;
end $$;

revoke all on function public.platform_map_dishbee_entity(uuid,text,text,text,uuid,jsonb)
from public,anon;
grant execute on function public.platform_map_dishbee_entity(uuid,text,text,text,uuid,jsonb)
to authenticated;

commit;
