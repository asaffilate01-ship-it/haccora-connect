# Haccora v2 — file 1: security, privacy and launch controls

This cumulative release adds authenticated TOTP management, device-session records, privacy requests, two-person sensitive approvals, immutable security events, tenant retention rules, legal holds, file quarantine/scanning, replay nonces, database-backed rate limits and backup-restore evidence.

## Deployment

1. Apply `20260802090000_v2_security_privacy_launch.sql` to a separate staging project.
2. Set `MALWARE_SCAN_URL` and `MALWARE_SCAN_TOKEN` to a production malware-scanning service that accepts the file body and returns `{ "clean": true|false }`. The document bucket now fails closed: stored files cannot be downloaded until the scan job is clean.
3. Deploy `privacy-requests`, `security-center` and `file-scan` along with the existing functions.
4. Schedule `file-scan` using POST and `x-cron-secret` at least every five minutes. Alert on failed and dead-letter scan jobs.
5. Test MFA enrolment/recovery, other-session sign-out, each privacy request type and two-person approval using separate manager accounts.
6. Run a staging restore drill and record measured recovery point and recovery time in the security centre database.

## External acceptance gates

- Select and contract the malware scanner.
- Confirm retention periods and deletion handling with qualified privacy/legal advisers.
- Configure Supabase MFA policy, Auth rate limits and recovery procedures.
- Complete the real multi-tenant RLS/storage test matrix and independent penetration test.
- Store production backup evidence outside the primary Supabase project.
