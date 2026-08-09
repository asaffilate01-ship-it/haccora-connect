-- Phase 26: monitored production schedulers and aggregate operations health.

begin;

create table if not exists public.service_job_heartbeats (
  job_name text primary key check (job_name in (
    'file-scan',
    'operations-dispatch',
    'integration-dispatch',
    'notification-dispatch'
  )),
  last_status text not null check (last_status in ('started', 'succeeded', 'failed')),
  last_started_at timestamptz not null,
  last_succeeded_at timestamptz,
  last_failed_at timestamptz,
  last_duration_ms integer check (last_duration_ms is null or last_duration_ms between 0 and 86400000),
  last_result jsonb not null default '{}'::jsonb check (jsonb_typeof(last_result) = 'object'),
  updated_at timestamptz not null default clock_timestamp()
);

alter table public.service_job_heartbeats enable row level security;
revoke all on public.service_job_heartbeats from public, anon, authenticated;
grant all on public.service_job_heartbeats to service_role;

create or replace function public.record_service_job_heartbeat(
  p_job_name text,
  p_status text,
  p_started_at timestamptz,
  p_result jsonb default '{}'::jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_duration integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_job_name not in (
    'file-scan', 'operations-dispatch', 'integration-dispatch', 'notification-dispatch'
  ) then
    raise exception 'unsupported service job';
  end if;
  if p_status not in ('started', 'succeeded', 'failed') then
    raise exception 'unsupported heartbeat status';
  end if;
  if p_started_at > v_now + interval '1 minute'
     or p_started_at < v_now - interval '24 hours' then
    raise exception 'invalid service job start time';
  end if;
  if jsonb_typeof(coalesce(p_result, '{}'::jsonb)) <> 'object' then
    raise exception 'service job result must be an object';
  end if;

  v_duration := greatest(0, floor(extract(epoch from (v_now - p_started_at)) * 1000)::integer);

  insert into public.service_job_heartbeats (
    job_name,
    last_status,
    last_started_at,
    last_succeeded_at,
    last_failed_at,
    last_duration_ms,
    last_result,
    updated_at
  ) values (
    p_job_name,
    p_status,
    p_started_at,
    case when p_status = 'succeeded' then v_now end,
    case when p_status = 'failed' then v_now end,
    case when p_status = 'started' then null else v_duration end,
    coalesce(p_result, '{}'::jsonb),
    v_now
  )
  on conflict (job_name) do update set
    last_status = excluded.last_status,
    last_started_at = excluded.last_started_at,
    last_succeeded_at = case
      when excluded.last_status = 'succeeded' then v_now
      else service_job_heartbeats.last_succeeded_at
    end,
    last_failed_at = case
      when excluded.last_status = 'failed' then v_now
      else service_job_heartbeats.last_failed_at
    end,
    last_duration_ms = excluded.last_duration_ms,
    last_result = excluded.last_result,
    updated_at = v_now;
end;
$$;

revoke all on function public.record_service_job_heartbeat(text, text, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_service_job_heartbeat(text, text, timestamptz, jsonb)
  to service_role;

comment on table public.service_job_heartbeats is
  'Service-role-only scheduler liveness and outcome metadata. Contains no tenant records or provider secrets.';
comment on function public.record_service_job_heartbeat(text, text, timestamptz, jsonb) is
  'Records a bounded scheduler heartbeat. Callable only by the service role.';

commit;
