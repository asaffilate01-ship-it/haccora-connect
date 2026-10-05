-- Tenant-owner setup for the optional high-fidelity Dishbee operational sync.
-- The raw bearer token is generated client-side and is never stored by Haccora;
-- only its SHA-256 hash is persisted. MFA and owner role are required.

create or replace function public.configure_my_dishbee_runtime(
  p_organization uuid,
  p_dishbee_tenant uuid,
  p_token_hash text,
  p_locations jsonb,
  p_status text default 'live'
) returns uuid
language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare
  v_connection uuid;
  v_row jsonb;
  v_location uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
    raise exception 'MFA required' using errcode='42501';
  end if;
  if not public.has_org_role(p_organization,array['owner']::public.app_role[]) then
    raise exception 'organization owner required' using errcode='42501';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid token hash'; end if;
  if p_status not in ('testing','live','paused','revoked') then raise exception 'invalid connection status'; end if;
  if jsonb_typeof(coalesce(p_locations,'[]'::jsonb))<>'array' then
    raise exception 'location mappings must be an array';
  end if;
  if jsonb_array_length(coalesce(p_locations,'[]'::jsonb))>100 then
    raise exception 'too many location mappings';
  end if;

  insert into public.dishbee_runtime_connections(
    organization_id,dishbee_tenant_id,token_hash,actor_user_id,status,metadata
  ) values(
    p_organization,p_dishbee_tenant,p_token_hash,auth.uid(),p_status,
    jsonb_build_object('configuredBy','tenant_owner','configuredAt',now())
  )
  on conflict(organization_id) do update set
    dishbee_tenant_id=excluded.dishbee_tenant_id,
    token_hash=excluded.token_hash,
    actor_user_id=excluded.actor_user_id,
    status=excluded.status,
    metadata=public.dishbee_runtime_connections.metadata||excluded.metadata,
    last_error=null,
    updated_at=now()
  returning id into v_connection;

  delete from public.dishbee_runtime_locations where connection_id=v_connection;

  for v_row in select * from jsonb_array_elements(coalesce(p_locations,'[]'::jsonb))
  loop
    if nullif(v_row->>'dishbeeLocationId','') is null
       or nullif(v_row->>'haccoraLocationId','') is null then
      raise exception 'both Dishbee and Haccora location IDs are required';
    end if;
    v_location:=(v_row->>'haccoraLocationId')::uuid;
    if not exists(
      select 1 from public.locations
      where id=v_location and organization_id=p_organization
    ) then raise exception 'Haccora location does not belong to organization'; end if;

    insert into public.dishbee_runtime_locations(
      connection_id,organization_id,dishbee_location_id,haccora_location_id,active
    ) values(
      v_connection,p_organization,(v_row->>'dishbeeLocationId')::uuid,v_location,
      coalesce((v_row->>'active')::boolean,true)
    );
  end loop;

  insert into public.audit_events(
    organization_id,actor_id,action,entity,entity_id,before_data,after_data,
    location_id,occurred_at,record_hash,previous_hash
  )
  select
    p_organization,auth.uid(),'integration.configure','dishbee_runtime_connection',
    v_connection::text,null,
    jsonb_build_object(
      'dishbeeTenantId',p_dishbee_tenant,
      'locationCount',jsonb_array_length(coalesce(p_locations,'[]'::jsonb)),
      'status',p_status
    ),
    null,now(),
    encode(digest(
      p_organization::text||':'||v_connection::text||':'||clock_timestamp()::text,
      'sha256'
    ),'hex'),
    (
      select record_hash from public.audit_events
      where organization_id=p_organization
      order by occurred_at desc,id desc limit 1
    );

  return v_connection;
end $$;

revoke all on function public.configure_my_dishbee_runtime(uuid,uuid,text,jsonb,text)
from public,anon;
grant execute on function public.configure_my_dishbee_runtime(uuid,uuid,text,jsonb,text)
to authenticated;

create or replace function public.get_my_dishbee_runtime(p_organization uuid)
returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not public.has_org_role(p_organization,array['owner','manager']::public.app_role[]) then
    raise exception 'forbidden' using errcode='42501';
  end if;

  select jsonb_build_object(
    'connectionId',c.id,
    'dishbeeTenantId',c.dishbee_tenant_id,
    'status',c.status,
    'lastEventAt',c.last_event_at,
    'lastError',c.last_error,
    'updatedAt',c.updated_at,
    'locations',coalesce((
      select jsonb_agg(jsonb_build_object(
        'dishbeeLocationId',l.dishbee_location_id,
        'haccoraLocationId',l.haccora_location_id,
        'active',l.active
      ) order by l.haccora_location_id)
      from public.dishbee_runtime_locations l
      where l.connection_id=c.id
    ),'[]'::jsonb)
  )
  into v_result
  from public.dishbee_runtime_connections c
  where c.organization_id=p_organization;

  return coalesce(v_result,'{}'::jsonb);
end $$;

revoke all on function public.get_my_dishbee_runtime(uuid) from public,anon;
grant execute on function public.get_my_dishbee_runtime(uuid) to authenticated;
