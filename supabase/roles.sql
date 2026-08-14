-- Compatibility-only role required by historic Lovable setup migrations.
-- It cannot sign in, inherit privileges, bypass RLS or administer the database.
--
-- Supabase local development may pre-create sandbox_exec as a platform-managed
-- superuser. Project migrations must never try to alter a provider-owned
-- superuser because the migration runner is intentionally not a superuser.
DO $$
DECLARE
  target_is_superuser boolean;
BEGIN
  SELECT rolsuper
  INTO target_is_superuser
  FROM pg_roles
  WHERE rolname = 'sandbox_exec';

  IF NOT FOUND THEN
    CREATE ROLE sandbox_exec
      NOLOGIN
      NOINHERIT
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;

    COMMENT ON ROLE sandbox_exec IS
      'Compatibility-only role for replaying historic Haccora migrations; must retain no login or runtime privileges.';
  ELSIF NOT target_is_superuser THEN
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
  END IF;
END
$$;
