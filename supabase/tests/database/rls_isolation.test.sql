begin;

select plan(9);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.organizations'::regclass),
  'organizations has row-level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.temperature_logs'::regclass),
  'temperature logs has row-level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.webhook_endpoints'::regclass),
  'webhook endpoints has row-level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.subscription_entitlements'::regclass),
  'subscription entitlements has row-level security enabled'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.webhook_endpoints',
    'encrypted_signing_secret',
    'SELECT'
  ),
  'authenticated clients cannot read encrypted webhook secrets'
);
select ok(
  not has_function_privilege('anon', 'public.get_my_context()', 'EXECUTE'),
  'anonymous clients cannot execute the authenticated context function'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.claim_webhook_deliveries(integer)',
    'EXECUTE'
  ),
  'only the service path can claim webhook delivery jobs'
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
    '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
    'owner-b@example.test', '', now(), '{"provider":"email","providers":["email"]}',
    '{}', now(), now()
  );

insert into public.organizations (id, name, slug, created_by) values
  (
    'a0000000-0000-0000-0000-000000000001',
    'Tenant A',
    'tenant-a-test',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Tenant B',
    'tenant-b-test',
    '20000000-0000-0000-0000-000000000002'
  );

insert into public.organization_memberships (
  organization_id, user_id, role, status, accepted_at
) values
  (
    'a0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    now()
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'owner',
    'active',
    now()
  );

insert into public.temperature_logs (
  id, user_id, organization_id, location, reading, status
) values (
  'a1000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Tenant A fridge',
  4.2,
  'ok'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select count(*) from public.temperature_logs),
  1::bigint,
  'Tenant A owner can read Tenant A temperature evidence'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select count(*) from public.temperature_logs),
  0::bigint,
  'Tenant B owner cannot read Tenant A temperature evidence'
);

reset role;
select * from finish();
rollback;
