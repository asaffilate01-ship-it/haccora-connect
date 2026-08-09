create or replace function public.__setup_exec(sql text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  execute sql;
end;
$$;
revoke all on function public.__setup_exec(text) from public;
grant execute on function public.__setup_exec(text) to postgres;