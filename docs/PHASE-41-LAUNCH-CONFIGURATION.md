# Phase 41 — launch configuration control centre

Phase 41 turns the flat production environment error list into a safe operational workflow without relaxing a single launch dependency.

## Delivered

- A reusable registry of 42 unique production configuration controls, grouped by accountable owner and provider.
- Removal of duplicate scanner-token and Expo-token failures.
- A redacted `launch:status` view and optional JSON/Markdown evidence report.
- An idempotent `launch:bootstrap` command that creates an ignored mode-0600 file and generates only five Haccora-owned random secrets.
- Refusal to generate into a tracked file or symbolic link.
- A complete-environment acceptance test and redaction, idempotence, permission and tracked-file safety tests.
- Production gate compatibility: `launch:preflight` still exits non-zero until every external, legal, native and operational control passes.

## Deliberately external

The following cannot be completed honestly in source code: Haccora Ltd's registered address and company number, counsel approval, ICO fee/exemption evidence, Stripe live resources, Resend domain verification, scanner service, push gateway, Supabase production project, EAS project and Expo access token. Phase 41 assigns those items and tells the release owner where they belong; it does not substitute test values for production evidence.

See `LAUNCH-CONFIGURATION.md` for the one-command bootstrap and provider hand-off.
