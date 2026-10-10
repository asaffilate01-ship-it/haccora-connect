# Phases 48–50 — release and native stabilisation

Date: 25 September 2026
Baseline: `6f817057476c1197c9a7d534279f22c087caa43e`

## Phase 48: reproducible web release

Synchronise the npm lockfile with the declared Lovable build package 2.23.1. The earlier mismatch
stopped `npm ci`, preventing the web build and dependent browser checks from running.

## Phase 49: native evidence integrity

- Temperature and daily checks use the already established local session to capture evidence without
  a network user lookup. Server authorisation still runs when records sync.
- Blank, malformed and out-of-range temperature values are rejected; an explicit zero remains valid.
- Successful encrypted persistence is acknowledged independently of network replay.
- Replay and queue counts are scoped to the signed-in actor. Requests use a captured access token,
  so switching accounts cannot submit another user's evidence as the new account.
- A unique conflict is considered a successful retry only after the matching idempotency record,
  tenant and actor are confirmed. Other errors retain the evidence.
- Cached workspace context is bound to its user. Older unbound cache entries are ignored; users
  should sign in online once after upgrading before relying on offline workspace access.

The existing secure queue is preserved; this release does not delete queued evidence or change
database migrations. Network reconnect and account-switch tests on physical devices remain required.

## Phase 50: native password recovery

Adds a reset-email request screen and a dedicated password-update screen. The app accepts only
recovery tokens delivered to `haccora://reset-password`, verifies the session with Supabase, checks
password confirmation and signs out locally after a successful change. Invalid and expired links
offer a new email request. Login handles connection errors without leaving the submit button busy.

### Provider setup before accepting recovery

1. Add the exact `haccora://reset-password` redirect to the Supabase Auth allowlist.
2. Verify the recovery email template preserves the requested redirect (the standard confirmation
   URL flow returns recovery tokens). This app flow uses Supabase's implicit mobile recovery flow.
3. Test an email link with the signed app closed, open, and already signed in; also test expired,
   reused and wrong-type links, network loss and rejected passwords.
4. Verify delivery from the configured transactional email provider on a designated test account.

Do not use Expo Go as evidence of production deep-link handling; install the signed application
with its registered `haccora` scheme.

## Remaining launch dependencies

The public deployment observed during review reports `publicWebReady: false`: marketing origin,
legal identity/approval, support/status URLs and live payment configuration need completion.
The scheduled GitHub dispatcher lacks repository-level `SUPABASE_URL` and `CRON_SECRET`; protected
provider configuration must be supplied without committing credentials. See
`github-production-configuration.md` for setup and acceptance order.

After this branch passes CI, deploy the approved commit, run protected production acceptance and
record the real results. Native typecheck/export verifies source bundles; signed EAS builds,
TestFlight/Play testing, provider delivery and physical-device acceptance remain separate gates.
