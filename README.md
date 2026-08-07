# Haccora UK

Haccora UK is a commercial food-safety compliance SaaS for cafés, restaurants, takeaways, caterers, food retailers, care settings, hotels, mobile traders and multi-site operators.

This clean Stage 1 repository combines:

- Haccora's production tenancy, RLS, billing, audit, inspection and native-app architecture
- UK-specific product direction from Food Safety Hub
- a new versioned UK compliance-content and responsibility model

Haccora supports HACCP-based food-safety management, SFBB-style working methods, daily evidence, allergens, PPDS processes, corrective actions and inspection preparation. It is not represented as FSA-approved and does not guarantee legal compliance or a Food Hygiene Rating.

## Included

- TanStack Start web application
- Supabase Postgres, Auth, Storage and Edge Functions
- Expo/React Native apps for iOS and Android
- Multi-business and multi-site access control
- HACCP, checks, temperatures, cleaning and allergens
- Training, incidents, complaints and traceability
- Scoped and expiring inspector access
- PDF inspection evidence exports
- Secure offline mobile writes and biometric lock
- Stripe subscription and entitlement foundation
- Versioned UK compliance content for all four UK jurisdictions
- Landlord/contractor responsibility assignments
- CI, CodeQL, dependency review, secret scanning and release evidence

## Local setup

```bash
cp .env.example .env
npm ci
npm run dev
```

Use only a Supabase publishable key in client-side variables. Never commit `.env` or a Supabase service-role key.

## Validation

```bash
npm run quality
npm run migrations:check
cd mobile
npm ci
npm run typecheck
npm run store:check
```

`store:check` intentionally fails until real EAS project and store settings have been configured.

## Documentation

- `docs/UK_PRODUCT_BLUEPRINT.md`
- `docs/UK_COMPLIANCE_VALIDATION.md`
- `docs/GO_LIVE_CHECKLIST.md`
- `docs/GO_LIVE_STATUS_2026-08-07.md`
- `docs/DEMO-CLIENT-TEST-PLAYBOOK.md`
- `docs/PRODUCTION_READINESS.md`
- `docs/DEPLOYMENT.md`
- `mobile/store/STORE_RELEASE_CHECKLIST.md`

## Repository upload

Create a new empty GitHub repository, then upload the contents of this folder to its root. Do not upload the outer ZIP folder as a nested subdirectory.
