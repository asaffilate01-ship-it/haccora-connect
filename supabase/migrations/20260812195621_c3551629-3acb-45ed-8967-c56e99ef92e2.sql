DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.oid::regclass AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND has_table_privilege('anon', c.oid, 'SELECT')
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename = c.relname
          AND (p.roles::text LIKE '%anon%' OR p.roles::text = '{public}')
      )
  LOOP
    EXECUTE format('REVOKE SELECT, INSERT, UPDATE, DELETE ON %s FROM anon', r.tbl);
  END LOOP;
END $$;