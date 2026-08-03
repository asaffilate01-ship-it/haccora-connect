DROP FUNCTION IF EXISTS public.__setup_exec(text);
REVOKE ALL ON auth.users FROM sandbox_exec;
REVOKE USAGE ON SCHEMA auth FROM sandbox_exec;
REVOKE ALL ON storage.objects FROM sandbox_exec;
REVOKE ALL ON storage.buckets FROM sandbox_exec;
REVOKE USAGE ON SCHEMA storage FROM sandbox_exec;