begin;

select plan(14);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.platform_operators'::regclass),
  'platform operators have row-level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.platform_audit_events'::regclass),
  'platform audit events have row-level security enabled'
);
select ok(
  not has_function_privilege('anon', 'public.get_platform_overview()', 'EXECUTE'),
  'anonymous clients cannot execute the platform overview'
);
select ok(
  not has_function_privilege('anon', 'public.get_platform_customers()', 'EXECUTE'),
  'anonymous clients cannot execute the platform customer directory'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
    'owner-a@example.test', '', now(), '{"provider":"email","providers":["email"]}',
    '{}', now(), now()
  ),
  (
    '30000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
    'platform-owner@example.test', '', now(), '{"provider":"email","providers":["email"]}',
    '{}', now(), now()
  ),
  (
    '30000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
    'manager-a@example.test', '', now(), '{"provider":"email","providers":["email"]}',
    '{}', now(), now()
  );

insert into public.organizations (
  id, name, slug, created_by, country_code, timezone,
  access_approved_at, access_approval_type
)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Tenant A',
  'tenant-a-platform-test',
  '10000000-0000-0000-0000-000000000001',
  'GB',
  'Europe/London',
  now(),
  'paid'
);

insert into public.subscriptions (organization_id, plan, status, seats, currency)
values (
  'a0000000-0000-0000-0000-000000000001',
  'complete',
  'active',
  5,
  'gbp'
);

insert into public.platform_operators (user_id, role, status, display_name, created_by)
values (
  '30000000-0000-0000-0000-000000000001',
  'platform_owner',
  'active',
  'Platform owner test',
  '30000000-0000-0000-0000-000000000001'
);

insert into public.organization_memberships (
  organization_id, user_id, role, status, accepted_at
) values (
  'a0000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'owner',
  'active',
  now()
), (
  'a0000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  'manager',
  'active',
  now()
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  'select public.get_platform_overview()',
  '42501',
  'platform operator access required',
  'tenant owners cannot execute the SaaS operator overview'
);
select throws_ok(
  'select public.get_platform_customers()',
  '42501',
  'platform operator access required',
  'tenant owners cannot execute the SaaS customer directory'
);
select is(
  (select count(*) from public.subscriptions),
  1::bigint,
  'tenant owner can read its subscription'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select count(*) from public.subscriptions),
  0::bigint,
  'tenant manager cannot read subscription data'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (public.get_my_platform_context()->>'role'),
  'platform_owner',
  'platform owner receives its separately governed context'
);
select is(
  (select count(*) from public.organizations),
  0::bigint,
  'platform status does not bypass tenant organization RLS'
);
select lives_ok(
  'select public.get_platform_overview()',
  'platform owner can execute the aggregate overview'
);
select lives_ok(
  'select public.get_platform_customers()',
  'platform owner can execute the audited customer directory'
);
select is(
  (select count(*) from public.platform_audit_events where event_type = 'platform_overview_viewed'),
  1::bigint,
  'platform overview access creates an audit event'
);
select is(
  (select count(*) from public.temperature_logs),
  0::bigint,
  'platform owner cannot read tenant food-safety evidence'
);

reset role;
select * from finish();
rollback;
