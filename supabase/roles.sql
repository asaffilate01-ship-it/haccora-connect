-- Compatibility-only role required by historic Lovable setup migrations.
-- It cannot sign in, inherit privileges, bypass RLS or administer the database.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'CREATE ROLE sandbox_exec NOLOGIN NOINHERIT';
  END IF;
END
$$;

ALTER ROLE sandbox_exec
  NOLOGIN
  NOINHERIT
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;

COMMENT ON ROLE sandbox_exec IS
  'Compatibility-only role for replaying historic Haccora migrations; must retain no login or runtime privileges.';
