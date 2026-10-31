# Repository guidance

This is the independent Haccora UK repository. Keep production changes on reviewable branches, preserve migration history and never commit runtime environment files, service-role keys, signing credentials or live provider secrets.

Run `npm run quality` and the native typecheck/export gates before releasing.

## UI, AI and MCP improvement guidance

Before changing interfaces, read `PRODUCT.md` and `DESIGN.md`. Use the audit-first approach from Taste Skill, Impeccable's critique/harden/adapt checks and Awesome DESIGN.md as *references*, not external copy/paste themes. Preserve source evidence, error states, tenant/role boundaries and current Haccora branding. Never replace failed/partial data with a green compliance state. For AI/MCP integrations, follow `docs/2026-10-31-DESIGN-AGENTS-MCP-REVIEW.md` and require human approval for every safety-critical write. Validate with existing quality, browser, RLS and native gates before merging.
