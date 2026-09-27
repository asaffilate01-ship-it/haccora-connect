begin;
select no_plan();

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('90000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'operator@setup.test', now(), '{}', '{}', now(), now()),
('90000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'owner-a@setup.test', now(), '{}', '{}', now(), now()),
('90000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'owner-b@setup.test', now(), '{}', '{}', now(), now()),
('90000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'pending@setup.test', null, '{}', '{}', now(), now()),
('90000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'support@setup.test', now(), '{}', '{}', now(), now());

insert into public.platform_operators(user_id, role, status, display_name)
values ('90000000-0000-0000-0000-000000000001', 'platform_owner', 'active', 'Setup owner'),
('90000000-0000-0000-0000-000000000005', 'platform_support', 'active', 'Setup support');

select ok((select relrowsecurity from pg_class where oid = 'public.platform_tenant_setups'::regclass), 'setup data has RLS');
select ok(not has_table_privilege('authenticated', 'public.platform_tenant_setups', 'INSERT'), 'direct setup creation is denied');
select ok(not has_table_privilege('authenticated', 'public.platform_tenant_setups', 'UPDATE'), 'direct setup modification is denied');
select ok(not has_function_privilege('anon', 'public.platform_launch_tenant_setup(uuid,integer,text)', 'EXECUTE'), 'anonymous approval is denied');
select ok(not has_function_privilege('anon', 'public.platform_get_tenant_setups()', 'EXECUTE'), 'anonymous listing is denied');

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"90000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select throws_ok('select public.platform_get_tenant_setups()', '42501', 'platform owner MFA required', 'operator must complete MFA');
select throws_ok($$select public.platform_launch_tenant_setup(gen_random_uuid(), 1, 'Approved')$$, '42501', 'platform owner MFA required', 'approval requires MFA in the database');
select set_config('request.jwt.claims', '{"sub":"90000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);

select set_config('test.setup_a', public.platform_save_tenant_setup(null, 0, 'Tenant A', 'setup-tenant-a', 'owner-a@setup.test', 'Kitchen A', '1 Example Street', 'LU1 1AA', 'enterprise', array['veyumo','insure360','omni-intelligence'])::text, true);
select set_config('test.setup_b', public.platform_save_tenant_setup(null, 0, 'Tenant B', 'setup-tenant-b', 'owner-b@setup.test', 'Kitchen B', '2 Example Street', 'AL1 1AA', 'solo', '{}')::text, true);
select set_config('test.setup_pending', public.platform_save_tenant_setup(null, 0, 'Pending', 'setup-pending', 'pending@setup.test', 'Kitchen C', '3 Example Street', 'LU1 1AA', 'trial', '{}')::text, true);
select is(jsonb_array_length(public.platform_get_tenant_setups()), 3, 'operator can list saved drafts');
select is((select count(*) from public.platform_tenant_setups), 0::bigint, 'operator does not gain direct tenant data access');
select throws_ok($$select public.platform_save_tenant_setup(null, 0, 'Bad addons', 'bad-addons', 'owner-a@setup.test', 'Kitchen', '1 Example Street', 'LU1 1AA', 'trial', array['admin-unlock'])$$, '23514', null, 'unknown add-on cannot enter the catalogue');
select throws_ok($$select public.platform_launch_tenant_setup(current_setting('test.setup_pending')::uuid, 1, 'Approved trial')$$, '23514', 'owner must verify their account before approval', 'unverified owner cannot launch');
select throws_ok($$select public.platform_launch_tenant_setup(current_setting('test.setup_a')::uuid, 99, 'Approved trial')$$, '40001', 'setup changed; reload before approval', 'stale approval cannot launch a changed setup');
select throws_ok($$select public.platform_launch_tenant_setup(current_setting('test.setup_a')::uuid, 1, '')$$, '23514', 'approval reason required', 'approval must be auditable');
select lives_ok($$select public.platform_save_tenant_setup(current_setting('test.setup_b')::uuid, 1, 'Tenant B', 'setup-tenant-b', 'owner-b@setup.test', 'Kitchen B', '22 Example Street', 'AL1 1AA', 'group', '{}')$$, 'draft can be revised');
select throws_ok($$select public.platform_save_tenant_setup(current_setting('test.setup_b')::uuid, 1, 'Tenant B', 'setup-tenant-b', 'owner-b@setup.test', 'Kitchen B', '22 Example Street', 'AL1 1AA', 'group', '{}')$$, '40001', 'setup changed; reload before saving', 'stale save is rejected');

select set_config('test.org_a', public.platform_launch_tenant_setup(current_setting('test.setup_a')::uuid, 1, 'Approved 60-day trial')::text, true);
select is(public.platform_launch_tenant_setup(current_setting('test.setup_a')::uuid, 1, 'Retry approval')::text, current_setting('test.org_a'), 'retries return the same tenant');
select set_config('test.org_b', public.platform_launch_tenant_setup(current_setting('test.setup_b')::uuid, 2, 'Approved 60-day trial')::text, true);
select throws_ok($$select public.platform_save_tenant_setup(current_setting('test.setup_a')::uuid, 1, 'Changed', 'setup-tenant-a', 'owner-a@setup.test', 'Kitchen', '1 Example Street', 'LU1 1AA', 'trial', '{}')$$, '23514', 'launched setup is immutable', 'draft editing cannot change a live tenant');

reset role;
select is((select count(*) from public.organizations where slug in ('setup-tenant-a','setup-tenant-b')), 2::bigint, 'one organization per setup');
select is((select count(*) from public.organizations where slug = 'setup-pending'), 0::bigint, 'failed verification creates no organization');
select is((select plan from public.subscriptions where organization_id = current_setting('test.org_a')::uuid), 'trial', 'intended enterprise plan does not grant paid access');
select is((select contract_mrr_pence from public.subscriptions where organization_id = current_setting('test.org_a')::uuid), 0, 'trial does not fabricate paid revenue');
select ok((select trial_ends_at between now() + interval '59 days' and now() + interval '61 days' from public.subscriptions where organization_id = current_setting('test.org_a')::uuid), 'trial expires after 60 days');
select is((select count(*) from public.subscription_entitlements where organization_id = current_setting('test.org_a')::uuid and enabled), 0::bigint, 'cross-sell interests grant no add-on entitlements');
select is((select address->>'line1' from public.locations where organization_id = current_setting('test.org_b')::uuid), '22 Example Street', 'latest saved details populate the premises');
select is((select count(*) from public.platform_audit_events where event_type = 'platform_tenant_created' and metadata->>'setup_id' = current_setting('test.setup_a')), 1::bigint, 'retry creates no duplicate launch audit');

-- Force a failure after organization/subscription/location writes to prove rollback.
create function public.test_reject_setup_membership() returns trigger language plpgsql as $$
begin raise exception 'simulated membership failure'; end;
$$;
create trigger test_setup_failure before insert on public.organization_memberships
for each row execute function public.test_reject_setup_membership();
update auth.users set email_confirmed_at = now() where id = '90000000-0000-0000-0000-000000000004';
set local role authenticated;
select throws_ok($$select public.platform_launch_tenant_setup(current_setting('test.setup_pending')::uuid, 1, 'Approved trial')$$, 'P0001', 'simulated membership failure', 'late provisioning failure is surfaced');
reset role;
select is((select count(*) from public.organizations where slug = 'setup-pending'), 0::bigint, 'late provisioning failure rolls back organization');
select is((select organization_id from public.platform_tenant_setups where id = current_setting('test.setup_pending')::uuid), null::uuid, 'failed setup remains retryable');
drop trigger test_setup_failure on public.organization_memberships;

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"90000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}', true);
select is((select count(*) from public.platform_tenant_setups), 1::bigint, 'owner A sees only its own launched configuration');
select is((select count(*) from public.platform_tenant_setups where id = current_setting('test.setup_b')::uuid), 0::bigint, 'owner A cannot select owner B setup');
select is((select count(*) from public.locations where organization_id = current_setting('test.org_b')::uuid), 0::bigint, 'new tenant cannot read another tenant premises');
select throws_ok('select public.platform_get_tenant_setups()', '42501', 'platform owner MFA required', 'tenant owner cannot enumerate drafts');
select throws_ok($$select public.platform_launch_tenant_setup(current_setting('test.setup_pending')::uuid, 1, 'Forged approval')$$, '42501', 'platform owner MFA required', 'tenant owner cannot approve tenants');
select throws_ok($$select public.platform_save_tenant_setup(null, 0, 'Forged', 'forged', 'owner-a@setup.test', 'Kitchen', '1 Example Street', 'LU1 1AA', 'trial', '{}')$$, '42501', 'platform owner MFA required', 'tenant owner cannot save platform setups');
select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000005', true);
select set_config('request.jwt.claims', '{"sub":"90000000-0000-0000-0000-000000000005","role":"authenticated","aal":"aal2"}', true);
select throws_ok('select public.platform_get_tenant_setups()', '42501', 'platform owner MFA required', 'support operator cannot enumerate setup contact data');
reset role;
select * from finish();
rollback;
