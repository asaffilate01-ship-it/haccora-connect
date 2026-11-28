# UK Lovable reconciliation — 2026-11-28

This candidate joins GitHub main (9169194035076cfa5fe84b7b05636aa5244b4d81) and the Lovable editor revision (183bd71e8e7995cfe2a128bc6d37f8fd126558d0) with both as Git parents. It retains UK main's tested application, route graph, native and web packages and lockfiles. The original Lovable revision remains reachable in history.

## File-level resolution

- Keep the existing Supabase migration: its bytes match the Lovable migration. Do not add the parallel Drizzle migration, empty schema, configuration or metadata, or the unvalidated Drizzle/postgres dependencies.
- Keep main's package manifest and both lockfiles together. Do not downgrade Vite, React tooling or other main packages. Review the Lovable config upgrade separately with regenerated locks.
- Keep main's generated route tree and database types. Regenerate against the reconciled source and verified database schema when needed; do not replace newer routes or types with an older snapshot.
- Keep the current Stripe SDK-compatible API version and matching regression test. Review the proposed API version together with the SDK and payment lifecycle acceptance separately.
- Retain main's Haccora-owned web and mobile clients. Adapt the generated native client to use the existing shared secure storage rather than adding an independent encryption format. Reject secret keys in both generated public clients, and do not attach native app-state listeners on web.
- Preserve the Lovable API version marker. Defer custom version headers and the preview token-broker rewrite until their gateway, CORS, origin and session behaviour are validated. The original implementations remain in the Lovable parent.

## Release gates

Run fresh production checks, CodeQL, database/RLS and browser tests on this merge candidate. Require physical-device authentication acceptance before shipping native changes. Do not execute migrations or deploy payments from this reconciliation. Once merged, verify the existing Lovable project's editor revision against main, reconnect its existing GitHub integration if required, publish the reconciled revision and verify the custom domain. A successful Git merge alone does not prove Lovable or production is updated.
