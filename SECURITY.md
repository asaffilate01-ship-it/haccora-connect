# Security policy

## Report a vulnerability

Do not open a public issue with exploit details, personal data or credentials. Use GitHub's private vulnerability reporting at <https://github.com/asaffilate01-ship-it/haccora-connect/security/advisories/new>.

Include the affected route, function or dependency; reproduction steps; impact; and a safe proof of concept when possible. Remove real customer data and secrets from all evidence.

The maintainers should acknowledge a report, assign severity and coordinate remediation and disclosure through the private advisory. No response-time promise is made until an accountable security owner and on-call rotation are recorded in the release evidence.

## Supported code

Security fixes target the production deployment and the current `main` branch. Older commits, local forks and unsigned native builds are not supported release channels.

Secrets belong in the hosting provider, GitHub environment or Supabase secret store. The repository and native clients may contain only documented publishable values. Production use also requires the staging RLS tests, CodeQL, an independent penetration test and every P0 gate in `docs/GO_LIVE_CHECKLIST.md`.
