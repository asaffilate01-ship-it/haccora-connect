-- Emergency remediation for the two fixed-password platform identities that
-- were published in 20260816074111. Preserve the applied ledger entry, but
-- revoke every privilege and sign-in path before browser authentication is
-- enabled in a hosted environment.

BEGIN;

UPDATE public.platform_operators
SET status = 'revoked',
    updated_at = clock_timestamp()
WHERE user_id IN (
  'd0000000-0000-4000-8000-000000000101'::uuid,
  'd0000000-0000-4000-8000-000000000102'::uuid
);

DELETE FROM auth.sessions
WHERE user_id IN (
  'd0000000-0000-4000-8000-000000000101'::uuid,
  'd0000000-0000-4000-8000-000000000102'::uuid
);

DELETE FROM auth.refresh_tokens
WHERE user_id IN (
  'd0000000-0000-4000-8000-000000000101',
  'd0000000-0000-4000-8000-000000000102'
);

DELETE FROM auth.identities
WHERE user_id IN (
  'd0000000-0000-4000-8000-000000000101'::uuid,
  'd0000000-0000-4000-8000-000000000102'::uuid
);

UPDATE auth.users
SET encrypted_password = extensions.crypt(
      encode(extensions.gen_random_bytes(48), 'hex'),
      extensions.gen_salt('bf')
    ),
    banned_until = 'infinity'::timestamptz,
    raw_app_meta_data = '{}'::jsonb,
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || '{"haccora_demo_revoked":true}'::jsonb,
    updated_at = clock_timestamp()
WHERE id IN (
  'd0000000-0000-4000-8000-000000000101'::uuid,
  'd0000000-0000-4000-8000-000000000102'::uuid
);

COMMIT;
