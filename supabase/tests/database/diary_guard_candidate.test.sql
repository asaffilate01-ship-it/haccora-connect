-- Test-only database protection candidate. The outer transaction rolls back
-- the trigger, grants and fixtures. Promote only through reviewed migrations
-- after retention, authenticated workflow and concurrency acceptance.
begin;
select no_plan();

-- BEGIN MIGRATION CANDIDATE
create or replace function public.guard_daily_diary_write_v2()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_actor is null
     or new.organization_id is distinct from public.current_organization_id()
     or new.location_id is distinct from public.current_location_id()
     or not coalesce(public.can_contribute_to_organization(new.organization_id), false)
     or not exists (
       select 1 from public.locations l
       where l.id = new.location_id and l.organization_id = new.organization_id and l.is_active
     ) then
    raise exception 'diary access denied' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if old.signed_off_at is not null or old.signed_off_by is not null then
      raise exception 'signed diary is read only' using errcode = '23514';
    end if;
    if new.id is distinct from old.id
       or new.organization_id is distinct from old.organization_id
       or new.location_id is distinct from old.location_id
       or new.diary_date is distinct from old.diary_date
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at then
      raise exception 'diary identity cannot change' using errcode = '23514';
    end if;
    v_now := greatest(v_now, old.updated_at + interval '1 microsecond');
  else
    new.created_by := v_actor;
    new.created_at := v_now;
  end if;

  if new.diary_date is null
     or new.diary_date > (v_now at time zone 'Europe/London')::date
     or jsonb_typeof(new.opening_checks) is distinct from 'object'
     or jsonb_typeof(new.closing_checks) is distinct from 'object'
     or new.problems is null or new.corrective_actions is null
     or char_length(new.problems) > 10000
     or char_length(new.corrective_actions) > 10000
     or (btrim(new.problems) <> '' and btrim(new.corrective_actions) = '') then
    raise exception 'invalid diary evidence' using errcode = '23514';
  end if;

  if new.signed_off_at is not null or new.signed_off_by is not null then
    if not coalesce(public.can_manage_organization(new.organization_id), false) then
      raise exception 'manager sign-off required' using errcode = '42501';
    end if;
    if new.signed_off_at is null or new.signed_off_by is distinct from v_actor
       or new.opening_checks->'completed' is distinct from 'true'::jsonb
       or new.closing_checks->'completed' is distinct from 'true'::jsonb then
      raise exception 'incomplete diary sign-off' using errcode = '23514';
    end if;
    new.signed_off_by := v_actor;
    new.signed_off_at := v_now;
  end if;
  new.updated_at := v_now;
  return new;
end;
$$;

revoke all on function public.guard_daily_diary_write_v2() from public, anon, authenticated;
drop trigger guard_daily_diary_signoff on public.daily_diary_entries;
create trigger guard_daily_diary_write_v2
before insert or update on public.daily_diary_entries
for each row execute function public.guard_daily_diary_write_v2();

-- API clients cannot delete draft or signed records; retention is a separate
-- privileged process, not a hidden application action.
revoke delete on public.daily_diary_entries from public, anon, authenticated;
-- END MIGRATION CANDIDATE

select ok(not (select prosecdef from pg_proc where oid =
  'public.guard_daily_diary_write_v2()'::regprocedure),
  'diary trigger runs with caller privileges');
select ok(not has_function_privilege('authenticated',
  'public.guard_daily_diary_write_v2()','EXECUTE'),
  'trigger is not directly callable by authenticated users');
select ok(not has_table_privilege('authenticated',
  'public.daily_diary_entries','DELETE'),
  'authenticated clients cannot delete diary evidence');
select ok(not has_table_privilege('anon',
  'public.daily_diary_entries','INSERT'),
  'anonymous clients cannot write diary evidence');
select ok((select relrowsecurity from pg_class where oid='public.daily_diary_entries'::regclass),
  'existing diary RLS remains enabled');

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('81000000-0000-0000-0000-000000000001','authenticated','authenticated','diary-owner@example.test','',now(),'{}','{}',now(),now()),
('81000000-0000-0000-0000-000000000002','authenticated','authenticated','diary-staff@example.test','',now(),'{}','{}',now(),now()),
('81000000-0000-0000-0000-000000000003','authenticated','authenticated','diary-other@example.test','',now(),'{}','{}',now(),now());

insert into public.organizations (id,name,slug,created_by,access_approved_at,access_approval_type) values
('82000000-0000-0000-0000-000000000001','Diary tenant A','diary-test-a','81000000-0000-0000-0000-000000000001',now(),'paid'),
('82000000-0000-0000-0000-000000000002','Diary tenant B','diary-test-b','81000000-0000-0000-0000-000000000003',now(),'paid');
insert into public.subscriptions (organization_id,plan,status,seats,currency) values
('82000000-0000-0000-0000-000000000001','complete','active',5,'gbp'),
('82000000-0000-0000-0000-000000000002','complete','active',5,'gbp');
insert into public.locations (id,organization_id,name) values
('83000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','Diary A kitchen'),
('83000000-0000-0000-0000-000000000002','82000000-0000-0000-0000-000000000002','Diary B kitchen'),
('83000000-0000-0000-0000-000000000003','82000000-0000-0000-0000-000000000001','Diary A second kitchen');
insert into public.organization_memberships
  (organization_id,user_id,role,status,accepted_at,default_location_id) values
('82000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','owner','active',now(),'83000000-0000-0000-0000-000000000001'),
('82000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000002','staff','active',now(),'83000000-0000-0000-0000-000000000001'),
('82000000-0000-0000-0000-000000000002','81000000-0000-0000-0000-000000000003','owner','active',now(),'83000000-0000-0000-0000-000000000002');
update public.profiles
set current_organization_id='82000000-0000-0000-0000-000000000001',
    current_location_id='83000000-0000-0000-0000-000000000001'
where id in ('81000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000002');
update public.profiles
set current_organization_id='82000000-0000-0000-0000-000000000002',
    current_location_id='83000000-0000-0000-0000-000000000002'
where id='81000000-0000-0000-0000-000000000003';

set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);
select lives_ok($$
  insert into public.daily_diary_entries
  (id,organization_id,location_id,diary_date,opening_checks,closing_checks,created_by)
  values ('84000000-0000-0000-0000-000000000001',
    '82000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001',
    '2026-01-01','{"completed":true}','{"completed":false}',
    '81000000-0000-0000-0000-000000000001')
$$,'staff can create an unsigned draft at the selected premises');
select is((select created_by from public.daily_diary_entries
  where id='84000000-0000-0000-0000-000000000001'),
  '81000000-0000-0000-0000-000000000002'::uuid,'creator is derived from authenticated actor');
select set_config('test.diary_version',(select updated_at::text from public.daily_diary_entries
  where id='84000000-0000-0000-0000-000000000001'),true);
select lives_ok($$
  update public.daily_diary_entries
  set problems='Recorded exception',corrective_actions='Reviewed and corrected',
      updated_at='2000-01-01'
  where id='84000000-0000-0000-0000-000000000001'
$$,'staff can save draft evidence');
select ok((select updated_at > current_setting('test.diary_version')::timestamptz
  from public.daily_diary_entries where id='84000000-0000-0000-0000-000000000001'),
  'server advances the conflict token regardless of a client timestamp');

select throws_ok($$update public.daily_diary_entries
  set corrective_actions='  ' where id='84000000-0000-0000-0000-000000000001'$$,
  '23514','invalid diary evidence','whitespace is not corrective-action evidence');
select throws_ok($$update public.daily_diary_entries
  set diary_date='2026-01-02' where id='84000000-0000-0000-0000-000000000001'$$,
  '23514','diary identity cannot change','existing evidence cannot move to another date');
select throws_ok($$update public.daily_diary_entries
  set created_by='81000000-0000-0000-0000-000000000001'
  where id='84000000-0000-0000-0000-000000000001'$$,
  '23514','diary identity cannot change','draft creator cannot be reassigned');
select throws_ok($$update public.daily_diary_entries
  set signed_off_at=now(),signed_off_by=auth.uid(),closing_checks='{"completed":true}'
  where id='84000000-0000-0000-0000-000000000001'$$,
  '42501','manager sign-off required','staff cannot sign off a diary');
select throws_ok($$insert into public.daily_diary_entries
  (organization_id,location_id,diary_date)
  values ('82000000-0000-0000-0000-000000000001',
    '83000000-0000-0000-0000-000000000003','2026-01-01')$$,
  '42501','diary access denied','staff cannot create evidence at another premises');

select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000001',true);
select throws_ok($$update public.daily_diary_entries
  set signed_off_at=now(),signed_off_by=auth.uid()
  where id='84000000-0000-0000-0000-000000000001'$$,
  '23514','incomplete diary sign-off','owner cannot sign before closing checks are complete');
select throws_ok($$update public.daily_diary_entries
  set signed_off_by=auth.uid()
  where id='84000000-0000-0000-0000-000000000001'$$,
  '23514','incomplete diary sign-off','a partial signature is rejected');
select throws_ok($$update public.daily_diary_entries
  set closing_checks='{"completed":"true"}',signed_off_at=now(),signed_off_by=auth.uid()
  where id='84000000-0000-0000-0000-000000000001'$$,
  '23514','incomplete diary sign-off','text is not a completed-check boolean');
select throws_ok($$update public.daily_diary_entries
  set closing_checks='{"completed":true}',signed_off_at=now(),
      signed_off_by='81000000-0000-0000-0000-000000000002'
  where id='84000000-0000-0000-0000-000000000001'$$,
  '23514','incomplete diary sign-off','owner cannot forge another signatory');
select lives_ok($$update public.daily_diary_entries
  set closing_checks='{"completed":true}',signed_off_at='2000-01-01',signed_off_by=auth.uid()
  where id='84000000-0000-0000-0000-000000000001'$$,
  'owner signs the complete diary');
select ok((select signed_off_by=auth.uid() and signed_off_at=updated_at
  and signed_off_at>'2000-01-01'::timestamptz
  from public.daily_diary_entries where id='84000000-0000-0000-0000-000000000001'),
  'signature records the actual actor and server time');
select throws_ok($$update public.daily_diary_entries
  set problems='Rewritten evidence' where id='84000000-0000-0000-0000-000000000001'$$,
  '23514','signed diary is read only','owner cannot rewrite signed evidence');
select throws_ok($$update public.daily_diary_entries
  set signed_off_at=null,signed_off_by=null where id='84000000-0000-0000-0000-000000000001'$$,
  '23514','signed diary is read only','owner cannot remove a signature');
select throws_ok($$delete from public.daily_diary_entries
  where id='84000000-0000-0000-0000-000000000001'$$,
  '42501',null,'owner cannot delete signed evidence directly');

select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000003',true);
select is((select count(*) from public.daily_diary_entries
  where id='84000000-0000-0000-0000-000000000001'),0::bigint,
  'other tenant cannot read the signed diary');
select throws_ok($$insert into public.daily_diary_entries
  (organization_id,location_id,diary_date)
  values ('82000000-0000-0000-0000-000000000001',
    '83000000-0000-0000-0000-000000000001','2026-01-02')$$,
  '42501',null,'other tenant cannot insert diary evidence');
reset role;
select is((select problems from public.daily_diary_entries
  where id='84000000-0000-0000-0000-000000000001'),'Recorded exception',
  'signed evidence remains unchanged');

select * from finish();
rollback;
