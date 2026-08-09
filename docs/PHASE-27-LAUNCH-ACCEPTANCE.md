# Phase 27 — fail-closed launch acceptance

## Delivered

- Reconciled the duplicate Phase 26 heartbeat migration that was published by Lovable before the canonical package timestamp. Both ledger entries remain immutable; only that exact idempotent function replay is allow-listed.
- Added a protected, machine-validated launch acceptance record tied to the exact 40-character release commit and exact `haccora.co.uk` production URL.
- Production release now requires five named approvals, twelve operational acceptance results, measured restore targets, zero open high/critical penetration-test findings, signed iOS/Android internal-test evidence and explicit UK privacy/food-safety evidence references.
- Active dependency exceptions require an exact, dated risk acceptance. Removing the underlying exception automatically removes the acceptance requirement.
- The public release artifact receives only a non-sensitive SHA-256 acceptance summary; approver names and private evidence references stay in the protected GitHub Environment secret.
- Every third-party GitHub Action is pinned to an immutable 40-character commit SHA, with a repository gate preventing mutable tags from returning.
- Corrected the private vulnerability-reporting link to the `haccora-connect` repository.

## Configure the protected acceptance record

1. Copy `docs/launch-acceptance.example.json` into the approved private release system.
2. Replace every placeholder only after the corresponding test or approval has completed.
3. Set `releaseSha` to the exact commit being deployed and `productionUrl` to the exact HTTPS candidate.
4. Keep the complete JSON as the `LAUNCH_ACCEPTANCE_JSON` secret in the protected GitHub `production` Environment. Do not commit the completed record because it contains names and private evidence references.
5. Require production Environment reviewers and run the `Production release evidence` workflow from the exact approved commit.

The validator fails closed on missing, stale, placeholder or mismatched evidence. It also rejects restore results that exceed approved RPO/RTO targets, untested native candidates and any high/critical penetration-test finding.

## What remains external

Phase 27 turns the remaining evidence into an enforceable release gate; it does not invent that evidence. The launch team must still configure production providers, complete the tests and reviews, supply the EAS project/signing accounts and approve the protected Environment run.
