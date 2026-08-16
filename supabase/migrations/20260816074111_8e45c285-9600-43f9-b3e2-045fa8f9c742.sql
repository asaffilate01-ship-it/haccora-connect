insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select '00000000-0000-0000-0000-000000000000', v.uid, 'authenticated', 'authenticated',
  v.email, extensions.crypt('HaccoraDemo!2026Uk', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('email_verified', true, 'full_name', v.name, 'haccora_demo', true),
  now(), now()
from (values
  ('d0000000-0000-4000-8000-000000000101'::uuid, 'saas-support@example.test', 'Sam Patel'),
  ('d0000000-0000-4000-8000-000000000102'::uuid, 'saas-auditor@example.test', 'Alex Doyle')
) as v(uid, email, name)
where not exists (select 1 from auth.users u where u.email = v.email);

insert into auth.identities (provider, provider_id, user_id, identity_data, created_at, updated_at, last_sign_in_at)
select 'email', u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', false, 'phone_verified', false),
  now(), now(), now()
from auth.users u
where u.email in ('saas-support@example.test','saas-auditor@example.test')
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

insert into public.platform_operators (user_id, role, status, display_name)
select u.id,
  case when u.email = 'saas-support@example.test' then 'platform_support'::public.platform_operator_role
       else 'platform_auditor'::public.platform_operator_role end,
  'active',
  case when u.email = 'saas-support@example.test' then 'Sam Patel' else 'Alex Doyle' end
from auth.users u
where u.email in ('saas-support@example.test','saas-auditor@example.test')
on conflict (user_id) do update set role = excluded.role, status = 'active';