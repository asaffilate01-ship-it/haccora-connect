-- api_clients: hide secret_hash
REVOKE SELECT ON public.api_clients FROM authenticated;
GRANT SELECT (id, organization_id, name, public_key, scopes, last_used_at, expires_at, revoked_at, created_by, created_at) ON public.api_clients TO authenticated;

-- webhook_endpoints: hide signing_secret_hash and encrypted_signing_secret
REVOKE SELECT ON public.webhook_endpoints FROM authenticated;
GRANT SELECT (id, organization_id, name, url, event_types, enabled, failure_count, disabled_at, created_by, created_at, updated_at) ON public.webhook_endpoints TO authenticated;

-- sensor_devices: hide secret_hash
REVOKE SELECT ON public.sensor_devices FROM authenticated;
GRANT SELECT (id, organization_id, location_id, name, external_device_id, target_min, target_max, last_seen_at, is_active, created_by, created_at) ON public.sensor_devices TO authenticated;

-- organization_invitations: hide token_hash
REVOKE SELECT ON public.organization_invitations FROM authenticated;
GRANT SELECT (id, organization_id, email, role, invited_by, expires_at, accepted_at, revoked_at, created_at, role_profile_id) ON public.organization_invitations TO authenticated;

-- inspector_access_invitations: hide token_hash
REVOKE SELECT ON public.inspector_access_invitations FROM authenticated;
GRANT SELECT (id, organization_id, email, location_ids, evidence_scopes, access_valid_until, invited_by, reason, expires_at, accepted_at, revoked_at, created_at) ON public.inspector_access_invitations TO authenticated;

GRANT ALL ON public.api_clients TO service_role;
GRANT ALL ON public.webhook_endpoints TO service_role;
GRANT ALL ON public.sensor_devices TO service_role;
GRANT ALL ON public.organization_invitations TO service_role;
GRANT ALL ON public.inspector_access_invitations TO service_role;