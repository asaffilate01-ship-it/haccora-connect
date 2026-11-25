-- Test-only migration candidate. The outer transaction rolls back functions and fixtures.
-- Do not deploy from this directory; promote the candidate via the Supabase migration workflow
-- after isolated SQL, privilege and concurrency acceptance, then wire the browser to the RPCs.
begin;

-- BEGIN MIGRATION CANDIDATE
create or replace function public.create_workflow_draft_v2(
  p_organization_id uuid, p_location_id uuid, p_name text, p_steps text[]
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_template uuid;
  v_version uuid;
begin
  if auth.uid() is null
     or p_organization_id is null
     or p_location_id is null
     or p_organization_id is distinct from public.current_organization_id()
     or p_location_id is distinct from public.current_location_id()
     or not coalesce(public.can_manage_organization(p_organization_id), false)
     or not exists (
       select 1 from public.locations l
       where l.id = p_location_id and l.organization_id = p_organization_id and l.is_active
     ) then
    raise exception 'workflow access denied' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 2 and 160
     or coalesce(cardinality(p_steps), 0) not between 1 and 50
     or coalesce(array_ndims(p_steps), 0) <> 1
     or exists (
       select 1 from unnest(p_steps) s(title)
       where title is null or char_length(btrim(title)) not between 2 and 240
     ) then
    raise exception 'invalid workflow draft' using errcode = '23514';
  end if;

  insert into public.workflow_templates
    (organization_id, location_id, name, category, recurrence, created_by)
  values (p_organization_id, p_location_id, btrim(p_name), 'operations', '{}', auth.uid())
  returning id into v_template;
  insert into public.workflow_template_versions
    (organization_id, template_id, version, status, change_summary, created_by)
  values (p_organization_id, v_template, 1, 'draft', 'Initial version', auth.uid())
  returning id into v_version;
  insert into public.workflow_steps
    (organization_id, version_id, position, title, required, input_type)
  select p_organization_id, v_version, s.position::integer, btrim(s.title), true, 'confirmation'
  from unnest(p_steps) with ordinality as s(title, position);
  return v_template;
end;
$$;

create or replace function public.publish_workflow_version_v2(
  p_organization_id uuid, p_location_id uuid, p_template_id uuid,
  p_version_id uuid, p_expected_steps jsonb
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_template public.workflow_templates%rowtype;
  v_version public.workflow_template_versions%rowtype;
  v_steps jsonb;
  v_required bigint;
  v_now timestamptz := now();
begin
  if auth.uid() is null
     or p_organization_id is null
     or p_location_id is null
     or p_organization_id is distinct from public.current_organization_id()
     or p_location_id is distinct from public.current_location_id()
     or not coalesce(public.can_manage_organization(p_organization_id), false)
     or not exists (
       select 1 from public.locations l
       where l.id = p_location_id and l.organization_id = p_organization_id and l.is_active
     ) then
    raise exception 'workflow access denied' using errcode = '42501';
  end if;

  -- Use a consistent parent-to-child locking order.
  select * into v_template from public.workflow_templates t
  where t.id = p_template_id and t.organization_id = p_organization_id
    and (t.location_id is null or t.location_id = p_location_id)
    and t.is_active
  for update;
  if not found then raise exception 'workflow unavailable' using errcode = '42501'; end if;
  if v_template.active_version_id is not null
     and v_template.active_version_id is distinct from p_version_id then
    raise exception 'workflow changed; reload before publishing' using errcode = '40001';
  end if;

  select * into v_version from public.workflow_template_versions v
  where v.id = p_version_id and v.template_id = v_template.id
    and v.organization_id = p_organization_id
    and v.status in ('draft', 'approved')
  for update;
  if not found then raise exception 'workflow version unavailable' using errcode = '42501'; end if;

  perform 1 from public.workflow_steps s
  where s.version_id = v_version.id
  order by s.position for update;
  select jsonb_agg(to_jsonb(s) - 'created_at' order by s.position),
         count(*) filter (where s.required)
    into v_steps, v_required
  from public.workflow_steps s
  where s.version_id = v_version.id and s.organization_id = p_organization_id;
  if v_required = 0 or exists (
    select 1 from public.workflow_steps s
    where s.version_id = v_version.id and s.organization_id <> p_organization_id
  ) then
    raise exception 'required workflow steps unavailable' using errcode = '23514';
  end if;
  if v_steps is distinct from p_expected_steps then
    raise exception 'workflow steps changed; review again' using errcode = '40001';
  end if;

  if v_template.active_version_id = v_version.id
     and v_version.status = 'approved' and v_version.published_at is not null then
    return v_version.id;
  end if;
  update public.workflow_template_versions
  set status = 'approved', approved_by = auth.uid(),
      approved_at = v_now, published_at = coalesce(published_at, v_now)
  where id = v_version.id and organization_id = p_organization_id;
  if not found then raise exception 'workflow approval denied' using errcode = '42501'; end if;
  update public.workflow_templates
  set active_version_id = v_version.id, updated_at = v_now
  where id = v_template.id and organization_id = p_organization_id;
  if not found then raise exception 'workflow activation denied' using errcode = '42501'; end if;
  return v_version.id;
end;
$$;

revoke all on function public.create_workflow_draft_v2(uuid,uuid,text,text[]) from public, anon, authenticated;
revoke all on function public.publish_workflow_version_v2(uuid,uuid,uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.create_workflow_draft_v2(uuid,uuid,text,text[]) to authenticated;
grant execute on function public.publish_workflow_version_v2(uuid,uuid,uuid,uuid,jsonb) to authenticated;
-- END MIGRATION CANDIDATE

select no_plan();

select ok(not has_function_privilege('anon',
  'public.create_workflow_draft_v2(uuid,uuid,text,text[])','EXECUTE'), 'anonymous draft creation denied');
select ok(not has_function_privilege('anon',
  'public.publish_workflow_version_v2(uuid,uuid,uuid,uuid,jsonb)','EXECUTE'), 'anonymous publication denied');
select ok(not (select prosecdef from pg_proc where oid =
  'public.create_workflow_draft_v2(uuid,uuid,text,text[])'::regprocedure), 'draft creation preserves caller RLS');
select ok(not (select prosecdef from pg_proc where oid =
  'public.publish_workflow_version_v2(uuid,uuid,uuid,uuid,jsonb)'::regprocedure), 'publication preserves caller RLS');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
('71000000-0000-0000-0000-000000000001','authenticated','authenticated','workflow-owner@example.test','',now(),'{}','{}',now(),now()),
('71000000-0000-0000-0000-000000000002','authenticated','authenticated','workflow-staff@example.test','',now(),'{}','{}',now(),now()),
('71000000-0000-0000-0000-000000000003','authenticated','authenticated','workflow-other@example.test','',now(),'{}','{}',now(),now());

insert into public.organizations (id,name,slug,created_by,access_approved_at,access_approval_type) values
('72000000-0000-0000-0000-000000000001','Workflow tenant A','workflow-test-a','71000000-0000-0000-0000-000000000001',now(),'paid'),
('72000000-0000-0000-0000-000000000002','Workflow tenant B','workflow-test-b','71000000-0000-0000-0000-000000000003',now(),'paid');
insert into public.subscriptions (organization_id,plan,status,seats,currency) values
('72000000-0000-0000-0000-000000000001','complete','active',5,'gbp'),
('72000000-0000-0000-0000-000000000002','complete','active',5,'gbp');
insert into public.locations (id,organization_id,name) values
('73000000-0000-0000-0000-000000000001','72000000-0000-0000-0000-000000000001','Workflow A kitchen'),
('73000000-0000-0000-0000-000000000002','72000000-0000-0000-0000-000000000002','Workflow B kitchen');
insert into public.organization_memberships (organization_id,user_id,role,status,accepted_at,default_location_id) values
('72000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001','owner','active',now(),'73000000-0000-0000-0000-000000000001'),
('72000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000002','staff','active',now(),'73000000-0000-0000-0000-000000000001'),
('72000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000003','owner','active',now(),'73000000-0000-0000-0000-000000000002');
update public.profiles set current_organization_id='72000000-0000-0000-0000-000000000001',
  current_location_id='73000000-0000-0000-0000-000000000001'
where id in ('71000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000002');
update public.profiles set current_organization_id='72000000-0000-0000-0000-000000000002',
  current_location_id='73000000-0000-0000-0000-000000000002'
where id='71000000-0000-0000-0000-000000000003';

set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select throws_ok($$select public.create_workflow_draft_v2('72000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001','Bad draft',array['x'])$$,
  '23514','invalid workflow draft','invalid step is rejected before inserting');
select throws_ok($$select public.create_workflow_draft_v2('72000000-0000-0000-0000-000000000002','73000000-0000-0000-0000-000000000002','Forged draft',array['Opening check'])$$,
  '42501','workflow access denied','owner cannot create another tenant workflow');
select set_config('test.workflow_id', public.create_workflow_draft_v2(
  '72000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001',
  'Opening checklist',array['Check fridge','Wash hands'])::text,true);
select set_config('test.workflow_version',(
  select id::text from public.workflow_template_versions where template_id=current_setting('test.workflow_id')::uuid
),true);
select set_config('test.workflow_steps',(
  select jsonb_agg(to_jsonb(s) - 'created_at' order by s.position)::text
  from public.workflow_steps s where version_id=current_setting('test.workflow_version')::uuid
),true);
select is((select count(*) from public.workflow_steps where version_id=current_setting('test.workflow_version')::uuid),2::bigint,'two required steps saved');
select throws_ok($$select public.publish_workflow_version_v2('72000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001',current_setting('test.workflow_id')::uuid,current_setting('test.workflow_version')::uuid,'[]'::jsonb)$$,
  '40001','workflow steps changed; review again','stale reviewed steps block publication');

reset role;
create function public.test_reject_workflow_steps() returns trigger language plpgsql as $$
begin raise exception 'simulated step failure'; end;
$$;
create trigger test_workflow_steps_failure before insert on public.workflow_steps
for each row execute function public.test_reject_workflow_steps();
set local role authenticated;
select throws_ok($$select public.create_workflow_draft_v2('72000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001','Rollback draft',array['Check fridge'])$$,
  'P0001','simulated step failure','late step write failure is surfaced');
reset role;
select is((select count(*) from public.workflow_templates where name='Rollback draft'),0::bigint,'late failure rolls back template');
drop trigger test_workflow_steps_failure on public.workflow_steps;

create function public.test_reject_workflow_activation() returns trigger language plpgsql as $$
begin raise exception 'simulated activation failure'; end;
$$;
create trigger test_workflow_activation_failure before update of active_version_id on public.workflow_templates
for each row execute function public.test_reject_workflow_activation();
set local role authenticated;
select throws_ok($$select public.publish_workflow_version_v2('72000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001',current_setting('test.workflow_id')::uuid,current_setting('test.workflow_version')::uuid,current_setting('test.workflow_steps')::jsonb)$$,
  'P0001','simulated activation failure','late activation failure is surfaced');
reset role;
select is((select status from public.workflow_template_versions where id=current_setting('test.workflow_version')::uuid),'draft','failed activation rolls back approval');
select is((select published_at from public.workflow_template_versions where id=current_setting('test.workflow_version')::uuid),null::timestamptz,'failed activation rolls back publication timestamp');
drop trigger test_workflow_activation_failure on public.workflow_templates;

set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000002',true);
select throws_ok($$select public.publish_workflow_version_v2('72000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001',current_setting('test.workflow_id')::uuid,current_setting('test.workflow_version')::uuid,current_setting('test.workflow_steps')::jsonb)$$,
  '42501','workflow access denied','staff cannot publish');
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.publish_workflow_version_v2('72000000-0000-0000-0000-000000000002','73000000-0000-0000-0000-000000000002',current_setting('test.workflow_id')::uuid,current_setting('test.workflow_version')::uuid,current_setting('test.workflow_steps')::jsonb)$$,
  '42501','workflow unavailable','other tenant cannot publish by guessing an id');
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
select is(public.publish_workflow_version_v2('72000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001',current_setting('test.workflow_id')::uuid,current_setting('test.workflow_version')::uuid,current_setting('test.workflow_steps')::jsonb),
  current_setting('test.workflow_version')::uuid,'owner publishes reviewed version');
select is((select active_version_id from public.workflow_templates where id=current_setting('test.workflow_id')::uuid),
  current_setting('test.workflow_version')::uuid,'active pointer matches the published version');
select ok((select published_at is not null and status='approved' from public.workflow_template_versions where id=current_setting('test.workflow_version')::uuid),'publication evidence is committed with activation');
select is(public.publish_workflow_version_v2('72000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001',current_setting('test.workflow_id')::uuid,current_setting('test.workflow_version')::uuid,current_setting('test.workflow_steps')::jsonb),
  current_setting('test.workflow_version')::uuid,'identical publication retry returns same version');
reset role;
select * from finish();
rollback;
