BEGIN;
SELECT plan(3);

SELECT is(
  (SELECT count(*)::integer
     FROM public.platform_operators
    WHERE user_id IN (
      'd0000000-0000-4000-8000-000000000101'::uuid,
      'd0000000-0000-4000-8000-000000000102'::uuid
    )
      AND status = 'active'),
  0,
  'fixed demo identities have no active platform operator grants'
);

SELECT is(
  (SELECT count(*)::integer
     FROM auth.identities
    WHERE user_id IN (
      'd0000000-0000-4000-8000-000000000101'::uuid,
      'd0000000-0000-4000-8000-000000000102'::uuid
    )),
  0,
  'fixed demo identities have no sign-in identities'
);

SELECT is(
  (SELECT count(*)::integer
     FROM auth.users
    WHERE id IN (
      'd0000000-0000-4000-8000-000000000101'::uuid,
      'd0000000-0000-4000-8000-000000000102'::uuid
    )
      AND banned_until = 'infinity'::timestamptz
      AND raw_user_meta_data->>'haccora_demo_revoked' = 'true'),
  2,
  'both fixed demo identities are banned and marked as revoked'
);

SELECT * FROM finish();
ROLLBACK;
