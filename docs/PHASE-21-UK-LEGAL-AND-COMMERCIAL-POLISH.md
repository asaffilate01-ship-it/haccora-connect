# Phase 21 — UK legal and commercial polish

Date: 7 August 2026

## Delivered

- Replaced the Germany-derived imprint with UK company-details disclosure and added dedicated privacy, business terms, cookies, data-processing, accessibility and complaints routes.
- Added launch configuration for jurisdiction, Companies House number and optional VAT/ICO references.
- Made production preflight fail closed until company identity, dated legal-counsel approval and ICO fee-status evidence are configured.
- Reframed privacy content for UK GDPR, the Data Protection Act 2018 and PECR, including controller/processor roles and special-category staff health data.
- Clarified that Haccora supports evidence and workflows but does not provide an official hygiene rating, regulatory approval or a substitute for competent food-safety judgement.
- Reworked the storage banner to describe currently necessary storage without presenting non-functional marketing consent choices.
- Added four plainly differentiated UK commercial plans, per-site monthly pricing, VAT wording and a no-card seven-day trial.
- Removed dormant German interface payloads and added a forward migration that replaces bilingual alert functions and cleans existing bilingual alert titles.
- Repaired the package lock so `npm ci` works from a fresh checkout, restored the missing safe demo environment template and expanded automated UK-market checks.

## Release evidence

- Production worker build and route smoke checks pass.
- TypeScript and 110 automated unit/security/readiness tests pass.
- Browser accessibility routes now cover all seven public legal pages; the browser suite must still run in CI with Playwright installed.
- Native typecheck/export checks remain part of the release verification.

## External blockers before public launch

This phase is code-complete, not regulatory certification. Before go-live, Haccora still needs real company/contact values, qualified UK legal and privacy review, a food-safety specialist review across all four UK nations, live provider configuration, staging RLS/database tests, penetration testing, recovery and alert drills, and signed iOS/Android store acceptance evidence.

No software product is “accepted by the FSA” merely because it follows guidance. Marketing must not imply FSA, FSS, local-authority or inspector endorsement unless that endorsement has been obtained in writing.
