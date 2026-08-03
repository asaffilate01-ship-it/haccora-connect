# Haccora V2 — File 3: complete cumulative source

This is the complete cumulative source package. It contains every change from Files 1 and 2 plus the UI/UX, native mobile, commercial and integration work below.

## Added in File 3

- Server-owned subscription entitlements, usage counters and immutable provider event IDs.
- Stripe Checkout and Billing Portal flows; webhook signatures are checked against the raw body with a five-minute replay window.
- HTTPS-only outbound webhooks with one-time secrets, SHA-256 hashes, AES-GCM encrypted recovery material, HMAC signatures, idempotency keys, backoff and dead-letter state.
- Safe browser column grants that never expose encrypted webhook secrets.
- Persistent per-user glove mode, high contrast and reduced-motion preferences.
- An explicit offline banner that never claims a write is saved before server confirmation.
- Web billing, integration delivery, accessibility and endpoint-secret UX.
- Expanded native iOS/Android flows for corrective actions, camera evidence, document upload, incidents, biometric app lock, privacy export/deletion and secure queue visibility.
- iOS privacy strings and Android camera permission scoped to user-initiated evidence capture.
- Persistent sync-conflict records for cases that cannot be resolved by idempotent insertion.

## Deployment sequence

1. Apply the three dated migrations in order.
2. Configure every variable in `.env.example`; use production Stripe keys only in production secrets.
3. Deploy every Supabase Edge Function.
4. Register the `billing` webhook URL in Stripe and subscribe only to the event types the application handles.
5. Schedule `file-scan`, `operations-dispatch`, `notification-dispatch` and `integration-dispatch`; alert on dead-letter growth and missed runs.
6. Deploy the web build after staging RLS tests.
7. Replace the EAS project placeholder, configure Apple/Google signing, run EAS production builds, test on real supported devices, and submit the signed artifacts through the store review processes.

## Required security/operational validation

- Run cross-tenant RLS tests for every new table and verify secret columns cannot be selected by authenticated users.
- Complete Stripe test-clock scenarios: checkout, renewal, failed payment, cancellation, duplicate event and out-of-order event.
- Verify webhook signatures in a receiver, retry a 500 response, replay an event and inspect dead-letter/automatic disable behaviour.
- Put Edge Function egress behind a firewall/proxy that blocks private and metadata networks; the application also rejects private/localhost URL forms.
- Rotate `INTEGRATION_ENCRYPTION_KEY` only with a documented re-encryption migration.
- Validate camera/document permission denial and biometric fallback on representative iOS and Android devices.
- Verify uploaded evidence remains inaccessible until the malware scanner records `clean`.
- Exercise offline capture, app termination, reconnect, duplicate retry and unresolved conflict review.
- Run accessibility testing with keyboard, screen readers, 200% zoom, reduced motion, high contrast and glove-sized targets.

## What remains outside source code

No source ZIP can truthfully certify a live system or create signed App Store/Play Store binaries. Go-live still depends on a real staging/production Supabase project, applied migrations, secret management, scanner/email/push/Stripe accounts, database backups and a restore drill, monitoring and incident response, penetration testing, data-processing agreements, legal/privacy approval, qualified food-safety review, signed native builds, real-device QA and Apple/Google approval.

The generated code should be treated as a release candidate until those external gates are recorded as complete.
