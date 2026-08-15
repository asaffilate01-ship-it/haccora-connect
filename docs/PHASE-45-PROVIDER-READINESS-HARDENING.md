# Phase 45 — provider readiness hardening

Date: 15 August 2026
Baseline: `main` at `732a54f374d9a658cb9e1aa5db1da9fb4666a363`

## Outcome

The protected launch centre now fails closed when provider values are merely present but malformed, placeholder-like, too short or inconsistent with production. This closes a false-green path without returning any credential material to the browser.

## Changes

- Moved provider evaluation into a pure shared Edge Function module that returns labels and booleans only.
- Requires an HTTPS application origin and an exact matching entry in `ALLOWED_ORIGINS`.
- Validates the Resend key shape and sender email, HTTPS push gateway, Expo token length and 32-character gateway credential.
- Requires the production malware endpoint, its bearer credential and the VirusTotal API key.
- Requires Stripe live or restricted-live key prefixes, webhook-secret and Price ID shapes, plus the explicit live-mode flag.
- Enforces the existing 32-character minimum on scheduler, monitoring and integration secrets.
- Validates the legal approval date as a real `YYYY-MM-DD` date and retains the explicit ICO confirmation gate.
- Updates launch-centre language to distinguish shape-valid configuration from provider test evidence.
- Reconciles main-branch drift by restoring lint formatting and replacing TanStack's deprecated `inputValidator()` API.
- Adds executable Deno coverage for valid and invalid provider shapes, includes it in CI and the protected release workflow, and proves environment values are not returned.

## Go-live boundary

These checks prove only configuration shape. Go-live still requires real provider transactions, production scheduler heartbeats, empty dead-letter queues, legal and ICO evidence, hosted role and security testing, mobile store credentials, backup-restore evidence and named release acceptance. No source change can manufacture those external approvals or credentials.
