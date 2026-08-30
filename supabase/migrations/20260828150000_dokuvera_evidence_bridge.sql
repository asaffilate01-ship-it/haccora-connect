-- Private, tenant-scoped evidence imported from Dokuvera.
-- Dokuvera projects are mapped to one Haccora premises. Only the service role
-- can ingest or mutate evidence; tenant members and explicitly scoped
-- inspectors receive read-only access.
--
-- Lovable applied the schema under 20260828112146 before this named package
-- migration reached main. Preserve both ledger entries while keeping this
-- named convergence migration safe to replay on fresh databases.

begin;

create table if not exists public.dokuvera_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid not null,
  dokuvera_project_id uuid not null unique,
  project_label text not null check (char_length(btrim(project_label)) between 2 and 120),
  enabled boolean not null default true,
  disabled_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (id, organization_id),
  unique (organization_id, dokuvera_project_id),
  foreign key (location_id, organization_id)
    references public.locations(id, organization_id) on delete restrict,
  check ((enabled and disabled_at is null) or (not enabled))
);

create index if not exists dokuvera_connections_org_location_idx
  on public.dokuvera_connections (organization_id, location_id, enabled);

create table if not exists public.dokuvera_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique,
  connection_id uuid references public.dokuvera_connections(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete restrict,
  event_type text not null check (event_type in ('evidence.captured', 'evidence.updated')),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'processing'
    check (status in ('processing', 'delivered', 'rejected', 'failed')),
  failure_reason text check (failure_reason is null or char_length(failure_reason) <= 500),
  source_timestamp timestamptz not null,
  attempts integer not null default 1 check (attempts between 1 and 1000),
  processed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create index if not exists dokuvera_webhook_events_org_created_idx
  on public.dokuvera_webhook_events (organization_id, created_at desc);

create table if not exists public.dokuvera_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid not null,
  connection_id uuid not null,
  source_event_id uuid not null references public.dokuvera_webhook_events(event_id) on delete restrict,
  source_media_id uuid not null unique,
  source_project_id uuid not null,
  source_user_id uuid,
  media_type text not null check (media_type in ('image', 'video', 'audio')),
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  mime_type text not null check (
    mime_type like 'image/%' or mime_type like 'video/%' or mime_type like 'audio/%'
  ),
  file_size bigint not null check (file_size between 1 and 52428800),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  source_original_sha256 text check (
    source_original_sha256 is null or source_original_sha256 ~ '^[0-9a-f]{64}$'
  ),
  voice_storage_path text unique check (
    voice_storage_path is null or voice_storage_path !~ '(^|/)\.\.(/|$)'
  ),
  voice_mime_type text check (voice_mime_type is null or voice_mime_type like 'audio/%'),
  voice_file_size bigint check (voice_file_size is null or voice_file_size between 1 and 15728640),
  voice_sha256 text check (voice_sha256 is null or voice_sha256 ~ '^[0-9a-f]{64}$'),
  captured_at timestamptz not null,
  received_at timestamptz not null default clock_timestamp(),
  gps_lat double precision check (gps_lat is null or gps_lat between -90 and 90),
  gps_lng double precision check (gps_lng is null or gps_lng between -180 and 180),
  gps_accuracy_m double precision check (gps_accuracy_m is null or gps_accuracy_m between 0 and 100000),
  location_label text check (location_label is null or char_length(location_label) <= 250),
  text_notes text check (text_notes is null or char_length(text_notes) <= 10000),
  voice_transcript text check (voice_transcript is null or char_length(voice_transcript) <= 20000),
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (id, organization_id),
  foreign key (location_id, organization_id)
    references public.locations(id, organization_id) on delete restrict,
  foreign key (connection_id, organization_id)
    references public.dokuvera_connections(id, organization_id) on delete restrict
);

create index if not exists dokuvera_evidence_org_captured_idx
  on public.dokuvera_evidence (organization_id, captured_at desc);
create index if not exists dokuvera_evidence_location_captured_idx
  on public.dokuvera_evidence (organization_id, location_id, captured_at desc);

alter table public.dokuvera_connections enable row level security;
alter table public.dokuvera_webhook_events enable row level security;
alter table public.dokuvera_evidence enable row level security;

grant select on public.dokuvera_connections to authenticated;
grant select on public.dokuvera_evidence to authenticated;
grant all on public.dokuvera_connections, public.dokuvera_webhook_events,
  public.dokuvera_evidence to service_role;
revoke all on public.dokuvera_webhook_events from anon, authenticated;
revoke insert, update, delete on public.dokuvera_connections,
  public.dokuvera_evidence from anon, authenticated;

drop policy if exists dokuvera_connections_manage_read on public.dokuvera_connections;
create policy dokuvera_connections_manage_read
  on public.dokuvera_connections for select to authenticated
  using (public.can_manage_organization(organization_id));

drop policy if exists dokuvera_evidence_tenant_read on public.dokuvera_evidence;
create policy dokuvera_evidence_tenant_read
  on public.dokuvera_evidence for select to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','manager','chef']::public.app_role[]
    )
    or (
      public.has_org_role(organization_id, array['staff']::public.app_role[])
      and location_id = public.current_location_id()
    )
    or public.has_valid_inspector_grant(organization_id, 'documents', location_id)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dokuvera-evidence',
  'dokuvera-evidence',
  false,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists dokuvera_evidence_storage_read on storage.objects;
create policy dokuvera_evidence_storage_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dokuvera-evidence'
    and exists (
      select 1
        from public.dokuvera_evidence evidence
       where (evidence.storage_path = name
         or evidence.voice_storage_path = name)
         and (
           public.has_org_role(
             evidence.organization_id,
             array['owner','manager','chef']::public.app_role[]
           )
           or (
             public.has_org_role(
               evidence.organization_id,
               array['staff']::public.app_role[]
             )
             and evidence.location_id = public.current_location_id()
           )
           or public.has_valid_inspector_grant(
             evidence.organization_id, 'documents', evidence.location_id
           )
         )
    )
  );

comment on table public.dokuvera_evidence is
  'Immutable-source evidence copied from signed Dokuvera webhook deliveries into private Haccora storage.';
comment on column public.dokuvera_evidence.captured_at is
  'Client capture time reported by Dokuvera; received_at is the independent Haccora server receipt time.';

commit;
