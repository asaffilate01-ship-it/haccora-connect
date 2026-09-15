begin;
select plan(14);
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
  ),
  (
    '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
    'staff-a@example.test', '', now(), '{"provider":"email","providers":["email"]}',
    '{}', now(), now()
  );

insert into public.organizations (
  id, name, slug, created_by, access_approved_at, access_approval_type
) values
  (
    'a0000000-0000-0000-0000-000000000001',
    'Tenant A',
    'tenant-a-test',
    '10000000-0000-0000-0000-000000000001',
    now(),
    'paid'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Tenant B',
    'tenant-b-test',
    '20000000-0000-0000-0000-000000000002',
    now(),
    'paid'
  );

insert into public.subscriptions (organization_id, plan, status, seats, currency) values
  (
    'a0000000-0000-0000-0000-000000000001',
    'complete',
    'active',
    5,
    'gbp'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'complete',
    'active',
    5,
    'gbp'
  );

insert into public.locations (id, organization_id, name) values
  (
    'a0000000-0000-0000-0000-000000000011',
    'a0000000-0000-0000-0000-000000000001',
    'Tenant A kitchen'
  ),
  (
    'a0000000-0000-0000-0000-000000000012',
    'a0000000-0000-0000-0000-000000000001',
    'Tenant A second site'
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
  ),
  (
    'a0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    'staff',
    'active',
    now()
  );

update public.organization_memberships
set default_location_id = 'a0000000-0000-0000-0000-000000000011'
where organization_id = 'a0000000-0000-0000-0000-000000000001'
  and user_id in (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003'
  );
update public.profiles
set current_organization_id = 'a0000000-0000-0000-0000-000000000001',
    current_location_id = 'a0000000-0000-0000-0000-000000000011'
where id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003'
);


set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"email":"owner-a@example.test","role":"authenticated","sub":"10000000-0000-0000-0000-000000000001"}', true);
select throws_ok($$select public.request_business_service('taxnuvia', 'Payroll for eight staff', false, false)$$, 'P0001', 'contact_consent_required', 'contact consent is required');
select throws_ok($$select public.request_business_service('fake', 'Payroll for eight staff', true, false)$$, 'P0001', 'unknown_business_service', 'unknown services are rejected');
select lives_ok($$select public.request_business_service('taxnuvia', 'Payroll for eight staff', true, true)$$, 'owner can request a service');
select is((select count(*) from public.get_my_business_service_requests()), 1::bigint, 'request persists');
select lives_ok($$select public.request_business_service('taxnuvia', 'Retry the same request', true, true)$$, 'retry returns the existing request');
select is((select count(*) from public.get_my_business_service_requests()), 1::bigint, 'retry does not duplicate');
select is((select count(*) from public.support_case_messages where body like '%multi-service offers: yes'), 1::bigint, 'quote preference and consent are recorded in the case');
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"email":"owner-b@example.test","role":"authenticated","sub":"20000000-0000-0000-0000-000000000002"}', true);
select is((select count(*) from public.get_my_business_service_requests()), 0::bigint, 'another owner cannot read the request');
select lives_ok($$select public.request_business_service('taxnuvia', 'Bookkeeping for another business', true, false)$$, 'another tenant can request the same service');
select is((select count(*) from public.get_my_business_service_requests()), 1::bigint, 'another tenant sees only its own request');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"email":"staff-a@example.test","role":"authenticated","sub":"10000000-0000-0000-0000-000000000003"}', true);
select throws_ok($$select public.request_business_service('taxnuvia', 'Payroll for eight staff', true, false)$$, '42501', 'business_owner_required', 'staff cannot request owner services');
select throws_ok($$select public.get_my_business_service_requests()$$, '42501', 'business_owner_required', 'staff cannot use owner service listing');
reset role;
select ok(not has_function_privilege('anon', 'public.request_business_service(text,text,boolean,boolean)', 'EXECUTE'), 'anonymous callers cannot request services');
select ok(not has_function_privilege('anon', 'public.get_my_business_service_requests()', 'EXECUTE'), 'anonymous callers cannot list service requests');
select * from finish();
rollback;
