BEGIN;
CREATE TABLE IF NOT EXISTS public.omniqora_connections (
 organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
 omniqora_tenant_id uuid NOT NULL UNIQUE,
 mode text NOT NULL CHECK(mode IN('standalone','dishbee-addon')),
 country_code text NOT NULL CHECK(country_code IN('GB','DE')),
 control_plane_url text CHECK(control_plane_url IS NULL OR control_plane_url ~ '^https://'),
 intelligence_url text CHECK(intelligence_url IS NULL OR intelligence_url ~ '^https://'),
 encrypted_control_plane_key text,
 entitlement_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
 snapshot_generated_at timestamptz,
 status text NOT NULL DEFAULT 'provisioned' CHECK(status IN('provisioned','connected','degraded','disabled','failed')),
 last_error text,last_synced_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.omniqora_projection_inbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 source_product text NOT NULL CHECK(source_product='dishbee'),
 source_event_id text NOT NULL CHECK(char_length(source_event_id) BETWEEN 1 AND 160),
 entity_type text NOT NULL CHECK(entity_type IN('location','user','menu_item','recipe','ingredient','supplier','equipment')),
 external_id text NOT NULL CHECK(char_length(external_id) BETWEEN 1 AND 200),
 operation text NOT NULL CHECK(operation IN('upsert','archive')),
 source_revision integer NOT NULL DEFAULT 1 CHECK(source_revision>0),
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'received' CHECK(status IN('received','reviewed','applied','rejected','superseded')),
 reviewed_at timestamptz,applied_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,source_product,source_event_id)
);
CREATE INDEX IF NOT EXISTS omniqora_projection_review_idx ON public.omniqora_projection_inbox(organization_id,status,created_at);
CREATE TABLE IF NOT EXISTS public.omniqora_entity_links (
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 source_product text NOT NULL CHECK(source_product='dishbee'),entity_type text NOT NULL,external_id text NOT NULL,
 local_id text,source_revision integer NOT NULL DEFAULT 1 CHECK(source_revision>0),metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(organization_id,source_product,entity_type,external_id)
);
CREATE TABLE IF NOT EXISTS public.omniqora_ai_runs (
 omniqora_run_id uuid PRIMARY KEY,organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_kind text NOT NULL CHECK(request_kind IN('compliance_question','inspection_readiness','allergen_review','corrective_action_review','haccp_review','regulatory_question')),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN('queued','running','waiting_review','completed','failed','cancelled','stale')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz
);
ALTER TABLE public.omniqora_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omniqora_projection_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omniqora_entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omniqora_ai_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.omniqora_connections FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.omniqora_projection_inbox FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.omniqora_entity_links FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.omniqora_ai_runs FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.omniqora_connections,public.omniqora_projection_inbox,public.omniqora_entity_links,public.omniqora_ai_runs TO service_role;
COMMENT ON TABLE public.omniqora_connections IS 'Server-only Haccora binding to one Omniqora tenant. Connector credentials are encrypted and never exposed to browser clients.';
COMMENT ON TABLE public.omniqora_projection_inbox IS 'Review-gated Dishbee operational projections. Receiving data never mutates approved Haccora compliance evidence automatically.';
COMMENT ON TABLE public.omniqora_ai_runs IS 'Local authorization map for tenant-scoped governed Omniqora AI runs. Model output remains review-required.';
COMMIT;
