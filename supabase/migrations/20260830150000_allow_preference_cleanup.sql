begin;

-- The self-service RLS policy already limits every mutation to the signed-in
-- user's row and an organisation they can read. Complete the CRUD contract so
-- users (and the staging persistence harness) can reset their own preferences.
grant delete on table public.user_experience_preferences to authenticated;

comment on table public.user_experience_preferences is
  'Per-user workspace accessibility and interaction preferences. Authenticated users may manage only their own tenant-scoped row.';

commit;
