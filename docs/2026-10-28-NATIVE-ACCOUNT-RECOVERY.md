# Native account isolation and recovery — 28 October 2026

## Delivered

- Workspace caches use a versioned per-account key and an envelope containing the account ID. Unscoped legacy records are never restored; malformed or mismatched records are rejected.
- Account transitions clear previous workspace state. A request generation guard prevents late RPC/cache responses from restoring an earlier account or overwriting the current workspace.
- Storage failures do not turn a successful live lookup into an endless loader. Failed lookups without a valid same-account cache show a recovery state instead of treating the account as a new workspace.
- Native sign-in catches thrown and returned errors, releases its busy state, prevents duplicate concurrent submissions and gives a safe retry message without exposing raw provider errors. Input labels and button state support assistive technology.

UK: native onboarding no longer calls the revoked self-service bootstrap function. It explains approval/invitation access, supports rechecking membership and offers retryable sign-out. Offline tenant context remains a UI hint; cached platform roles are not restored. Live server authorization remains authoritative.

## Validation and limits

Behavioural regression tests exercise the actual native session provider and sign-in components with isolated auth/storage adapters. Coverage includes account-bound offline restoration, late responses, sign-out, storage failure, rejected RPCs, duplicate taps and setup recovery. Full web quality, native typecheck/export and fresh GitHub browser/security/database checks are merge gates.

The cache migration intentionally requires one successful online workspace lookup before offline restoration can work on an upgraded installation. No runtime secrets, schema changes, production deployment or signed store release are included.

## Next acceptance gaps

1. Test account A → sign-out → account B on physical devices, including offline startup, interrupted storage, token refresh and background/resume. Validate queued evidence ownership separately; this change concerns workspace context.
2. Complete German operational-form and error translations, with large-text and screen-reader device review.
3. Rehearse approved UK owner/team invitations against deployed staging; preserve existing approval rules rather than enabling self-service creation.
4. Continue the prior phase's scheduled-work totals, connected supplier/recall/Dishbee integration tests and provider/restore evidence.
5. Produce signed iOS/Android builds only after device and staging acceptance. Export success alone is not release acceptance.
