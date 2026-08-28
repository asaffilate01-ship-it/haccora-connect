# Dokuvera evidence bridge

Haccora receives signed Dokuvera photo, video and voice evidence into the
private `dokuvera-evidence` bucket. A Dokuvera project must first be mapped to a
single Haccora premises by a tenant owner or manager. The tenant must have an
integrations-enabled plan or the platform-issued `dokuvera_bridge` entitlement.

## Server secrets

Set these on Haccora's Supabase project only:

| Secret                    | Value                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `DOKUVERA_BRIDGE_SECRET`  | A random shared value of at least 32 bytes; use the same value for Dokuvera's `HACCORA_BRIDGE_SECRET` |
| `DOKUVERA_STORAGE_ORIGIN` | `https://savomurohcdhrlzapupd.supabase.co`                                                            |

Generate the shared secret outside the repository, for example with
`openssl rand -hex 32`. Never use a `VITE_` or `EXPO_PUBLIC_` prefix.

## Deploy

1. Apply migration `20260828150000_dokuvera_evidence_bridge.sql`.
2. Set the two Haccora secrets.
3. Deploy `dokuvera-admin` and `dokuvera-webhook`.
4. In **Haccora → Integrations**, map the Dokuvera project UUID to the correct
   premises and copy the displayed callback URL.
5. Set Dokuvera's `HACCORA_EVIDENCE_WEBHOOK_URL`, `HACCORA_BRIDGE_SECRET` and
   separate `CRON_SECRET`, then deploy its dispatcher and one-minute schedule.
6. Capture one photo, one short video and one voice note. Confirm all three in
   **Documents → Dokuvera records** on desktop and native mobile.

## Security and lifecycle

- Requests use HMAC-SHA256 over the exact timestamp and body, with a five-minute
  freshness window and event replay protection.
- Signed source URLs must use the configured Dokuvera Storage origin and are
  never persisted in Haccora.
- Haccora checks the source bytes against the supplied SHA-256 value before it
  stores a private copy.
- Owners, managers and chefs can read tenant evidence; staff are limited to
  their selected premises; inspectors need an active `documents` scope grant
  for that premises.
- A frozen tenant or removed integration entitlement stops new imports while
  keeping already-imported evidence. Dokuvera retains its delivery snapshots
  for billing recovery.
- Disabling a project mapping stops new imports without deleting evidence.

These changes prepare the bridge for deployment but do not make it live until
both projects' migrations, Edge Functions, secrets and the Dokuvera schedule
are applied.
