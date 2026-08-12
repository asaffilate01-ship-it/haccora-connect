# Phase 42 — secret column protection

Row-level security already restricted _which rows_ an organisation manager can read. It did not restrict _which columns_, so hashed secrets and invitation tokens were technically selectable by any signed-in manager through the Data API.

## Delivered

- Table-wide `SELECT` for `authenticated` revoked on `api_clients`, `webhook_endpoints`, `sensor_devices`, `organization_invitations` and `inspector_access_invitations`.
- Column-level `SELECT` grants replace it, excluding `secret_hash`, `signing_secret_hash`, `encrypted_signing_secret` and `token_hash`.
- `service_role` retains full access, so provisioning, invitation and dispatch Edge Functions are unchanged.
- `tests/phase42-secret-column-protection.test.mjs` fails the build if a future migration re-grants a secret column or the integrations screen requests one.

## Impact on the app

No client screen read those columns; the integrations screen already selects an explicit non-secret column list. Any future client query using `select("*")` on these tables will now fail, which is the intended fail-closed behaviour.

## Verification

- `npm run quality`
- Backend security scan: no active findings.
