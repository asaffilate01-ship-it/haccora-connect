## Release scope

Describe the user-visible change, affected data paths and rollback boundary.

## Evidence

- [ ] `npm ci && npm run quality` passes
- [ ] `npm audit --omit=dev --audit-level=high` passes
- [ ] Native install, audit, typecheck and `npm run export:check` pass
- [ ] Edge Function format, lint and typecheck pass
- [ ] Fresh-database/RLS and browser E2E checks pass when applicable
- [ ] Migration and environment-file changes have been reviewed explicitly
- [ ] Screenshots or recordings are attached for UI changes
- [ ] Rollback owner and monitoring window are recorded

## Risk and rollback

State the highest plausible failure, how it will be detected and the exact rollback action.
