# Production release evidence

Before production, run the `Protected staging rehearsal` workflow in `verify-only` mode and then, after reviewing the migration plan, in `apply-and-test` mode. Retain `staging-release-manifest.json`, the remote ledger, Edge Function inventory, hosted smoke output and demo-role/RLS output. Phase 25 setup is documented in `PHASE-25-STAGING-RELEASE-AUTOMATION.md`.

Complete `launch-acceptance.example.json` in the approved private release system and store the one-line JSON as the protected production Environment secret `LAUNCH_ACCEPTANCE_JSON`. It must name the accountable approvers and private evidence references for the exact release commit; never commit the completed record.

Run the manual `Production release evidence` workflow against the deployed `haccora.co.uk` HTTPS candidate. It creates `release-evidence/release-manifest.json` and `.md` with the exact commit, automated gate results, the non-sensitive launch-acceptance digest, per-file hashes and aggregate SHA-256 for the web artifact. Link evidence; do not paste secrets, personal data or production database contents into GitHub.

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
- Protected launch-acceptance result and SHA-256:
- Deployed candidate smoke result and URL:
- Dependency audit results:
- Temporary audit-exception review and expiry confirmation:
- Scheduler heartbeat and dead-letter health result:
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
