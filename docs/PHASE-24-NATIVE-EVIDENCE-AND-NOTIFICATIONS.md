# Phase 24 — native evidence and notification hardening

## Delivered

- Native evidence uploads now record a canonical MIME type, byte size and SHA-256 digest.
- Native uploads accept only PDF, JPG, PNG, WebP and CSV files up to 10 MB.
- Stored evidence no longer duplicates a private storage path into the external URL field.
- The native evidence library excludes archived records, checks malware-scan status before opening a file and uses a five-minute signed URL only after a clean result.
- HTTPS evidence links created on the web can be opened safely in the native app.
- Owners, managers and record creators can archive evidence without deleting the retained audit record.
- Push permission is requested only after an explicit user action. Session refreshes re-register an already-authorised device only when the tenant preference remains enabled.
- A reused physical-device push token is transferred to the currently authenticated user and tenant, preventing notifications remaining attached to the previous account.
- Expo ticket ids are stored in a service-only receipt ledger. The scheduled dispatcher checks receipts, records delivery outcomes and disables tokens rejected as `DeviceNotRegistered`.

## Automated proof

- Migration lineage requires the Phase 24 forward migration.
- Regression tests cover evidence hashing, scan-gated downloads, HTTPS enforcement, archive retention, permission behaviour, token ownership and receipt reconciliation.
- The normal production verification, security, formatting, web build and native export gates cover the new code.

## Deployment evidence still required

- Apply the full migration chain to a linked staging project and regenerate database types from that exact schema.
- Configure the real EAS project, APNs/FCM credentials, Expo enhanced push security and `EXPO_ACCESS_TOKEN`.
- Run the notification dispatcher on its intended schedule and retain evidence of ticket and receipt processing.
- Verify permission denial, account switching, token rotation, app reinstall, deep links and notification delivery on physical iOS and Android devices.
- Configure and test the malware scanner before allowing protected evidence downloads in production.
