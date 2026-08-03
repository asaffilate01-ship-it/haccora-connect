# Production release evidence

Run the manual `Production release evidence` workflow against the deployed HTTPS candidate. It creates `release-evidence/release-manifest.json` and `.md` with the exact commit, gate results, per-file hashes and aggregate SHA-256 for the web artifact. Copy this human-approval template into the private release record. Link evidence; do not paste secrets, personal data or production database contents into GitHub.

## Candidate

- Commit SHA:
- Build artifact, `release-manifest.json` and aggregate digest:
- Release window:
- Release owner:
- Database owner:
- Rollback owner:
- On-call owner and monitoring window:

## Automated gates

- Production checks run:
- CodeQL run:
- Fresh database/RLS run:
- Production release evidence run:
- Deployed candidate smoke result and URL:
- Dependency audit results:
- Native export/store-preflight results and signed-build identifiers:

## Environment and providers

- `launch:preflight` result:
- Supabase ledger/backup/restore-drill evidence:
- Email, push, malware, Stripe and webhook test evidence:
- Uptime/error alert test and escalation evidence:
- TestFlight and Play internal-test evidence:

## Approvals

- Product:
- Security:
- Privacy/legal:
- Food-safety specialist:
- Operations:

## Decision

- Decision and timestamp:
- Known residual risks:
- Rollback threshold:
- Post-release result:
