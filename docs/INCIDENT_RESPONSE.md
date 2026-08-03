# Incident response

## Severity

- **SEV-1:** confirmed cross-tenant access, credential compromise, destructive data loss or complete production outage.
- **SEV-2:** material feature outage, provider failure or integrity risk with a safe containment path.
- **SEV-3:** limited degradation without known confidentiality or integrity impact.

## Response sequence

1. Open a private incident record and name the incident commander, technical lead and communications owner.
2. Record detection time, affected tenants, data classes, release/provider changes and current evidence. Keep secrets and customer data out of chat and public issues.
3. Contain first: revoke exposed credentials, disable the affected Edge Function/schedule/integration or roll back the application artifact as appropriate.
4. Preserve audit events, provider logs, deployment identifiers and database evidence before remediation changes erase context.
5. Validate recovery with health, tenant-isolation and affected-workflow tests. Monitor for recurrence.
6. Have the privacy/legal owner determine notification duties and timing; do not make unreviewed regulatory or customer statements.
7. Complete a blameless review with root cause, control failures, owner, deadline and verification evidence for every action.

Provider contacts, on-call routes, status-page credentials and data-protection contacts belong in the approved private operations system, not this repository.
