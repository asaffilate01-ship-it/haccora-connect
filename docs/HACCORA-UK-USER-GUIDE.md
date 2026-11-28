# Haccora UK — user and demonstration guide

## Start here

Haccora is a UK food-safety and operational evidence workspace for food businesses. Use an approved business account, then select the correct organisation and premises. The owner can explore the broadest set of tenant features; the platform console is separate. Availability depends on your role, permissions, active subscription, configured integrations and release.

- Public information: https://haccora.co.uk/
- Sign in: https://haccora.co.uk/login
- Help Centre: https://haccora.co.uk/help
- In-app setup: /app/get-started
- Daily work: /app/today

The demo is not a compliance certificate, inspection prediction or substitute for competent food-safety review. Use fictional records and a dedicated test environment; never use real customer data or live payments for demonstrations.

## 1. Demo roles

The protected demo seed creates Riverside Kitchen Demo and a second isolation-test business, Harbour Café. The following are the proposed login local parts; the administrator chooses the private demo email domain and passwords. These are not published credentials or confirmation that a hosted account exists.

| Identity | What to explore |
| --- | --- |
| tenant-admin | Full tenant-owner journey and all entitled business modules |
| manager | Daily supervision, controls, training, corrective actions and inspection |
| chef | Kitchen evidence, recipes, ingredients, allergens, receiving and stock |
| staff | Opening and closing checks, temperatures, cleaning and QR records |
| inspector | Scoped, expiring read-only inspection evidence |
| isolation-owner | Separate test business; verify no Riverside evidence is visible |
| saas-owner | Test-only platform administration, tenant metadata and billing controls |
| saas-support | Test-only support and service operations, without tenant evidence bypass |
| saas-auditor | Test-only read-only platform audit and permitted finance overview |

Never use a single superuser for all roles. Platform accounts must only be provisioned on an isolated demonstration database, not shared with real tenants. Use private credentials, MFA where required, and separate test sessions. See [demo provisioning and role testing](DEMO-CLIENT-TEST-PLAYBOOK.md).

## 2. First 30 minutes — tenant owner

1. Sign in using the owner invitation or credentials supplied privately by the administrator.
2. Choose Riverside Kitchen and the intended premises.
3. Open Get started and the UK compliance profile. Review nation, business type, equipment and responsibilities.
4. Open Today, complete a demonstration opening check and record a temperature using the configured limits.
5. Open Control centre, review the exception and corrective-action evidence. A missing or failed record is not a pass.
6. Open Suppliers, Recipes and PPDS & ingredients. Review a fictional ingredient specification and its allergen implications. Do not print a label for real food.
7. Open Inspection, select a date period, review counts and generate an evidence pack if the export is configured. Review the evidence before sharing it.
8. Open Organisation & team, Billing and Preferences. Review role boundaries and plan entitlements. Do not use live payment cards.

## 3. Workspace tour

| Area | Use | How to demonstrate |
| --- | --- | --- |
| Dashboard, Today, Quick log | Shift overview and fast recording | Record a test check, then refresh and confirm evidence |
| Compliance coach, UK readiness | Highlight evidence and review gaps | Review missing or stale sources; never interpret a score as approval |
| Control centre, alerts, expiry | Due work, exceptions, escalation | Investigate a fictional failed check and assign a follow-up |
| Routines, workflows, rota | Scheduled work and staff coordination | Draft a routine, review ownership, publish if entitled |
| UK compliance, safe methods, HACCP, HACCP flows | Premises-specific documented controls | Record a draft and approved version, review linked official sources |
| Daily diary, checks, temperatures | Daily monitoring and sign-off | Complete an opening check and record an out-of-range reading and response |
| Calibration, cleaning, pest, oil, chemicals | Equipment and hygiene controls | Add a fictional maintenance or cleaning record, check history |
| Menu, recipes, PPDS and labels | Ingredients, allergen and label evidence | Review a supplier specification and resulting label draft |
| Suppliers, purchasing, goods in, stock, waste | Receiving and inventory evidence | Create a fictional delivery, batch and stock movement |
| Traceability, recalls | Trace lots and record recall decisions | Use test batches; do not issue real recall notices |
| Equipment | Assets, QR labels, checks and maintenance | Scan a demonstration QR, add an attributed check |
| Organisation, rota, training, inductions, health | People and premises management | Invite a test colleague and review training evidence; avoid real health data |
| Incidents, complaints, documents, logs, audits | Incident investigation and retained evidence | Create a test issue, attach synthetic evidence, review history |
| Inspection | Scoped evidence review and exports | Set an inclusive UK date window, retry if loading fails, review the PDF |
| Security, preferences, support | Privacy, device settings, service support | Review access and accessibility; use support without disclosing secrets |
| Billing, integrations, business services | Plan, provider readiness and service requests | Review configuration; exercise sandbox providers only |
| AI evidence assistant | Draft and summarise source-linked evidence | Check source references, review suggestions, never automate approvals |

Some areas start empty until the owner creates suitable records. Do not interpret an empty list as an assurance that nothing is wrong. Native apps cover a subset of the web workflows.

## 4. Mobile and tablet workflow

Use the responsive web app or install its PWA from a supported browser. A signed native iOS or Android build may be used for mobile workflows where available. Choose the correct premises, use the daily dashboard and quick log, and confirm whether an action is server-confirmed or queued offline. Test reconnection without duplicate entries. Confirm QR and deep links on real devices before relying on them.

## 5. Supervisor and inspector tour

Use a separate manager session to review exceptions, staff checks and approvals. As inspector, check only the granted locations, evidence categories and expiry. Try to open an unrelated business or edit evidence: access must be denied. Retain evidence that the tenant owner cannot open the platform administration console without an independently assigned platform role.

## 6. Platform operator tour — isolated test environment only

Sign in as the test platform owner. Inspect aggregate tenant and plan metadata, service state, support cases and permitted audit controls. Review platform support and auditor sessions separately. Do not grant a production platform role to a demo tenant owner. Confirm none of these test identities sees another tenant's operational records through ordinary queries.

## 7. Troubleshooting

- Sign-in fails: check the exact demo environment and administrator-provided invitation or credentials. Request recovery through the authorised Auth administrator; never guess a password.
- Demo trial expires: request an approved renewal or a newly provisioned test tenant; do not bypass subscription checks.
- Module hidden: review role, site assignment, plan and integration readiness.
- Evidence unavailable: refresh or retry. Do not treat a missing value as zero or completed.
- Offline records: reconnect and verify server confirmation once.
- Payment, email, push and integrations: use configured sandbox/test providers. Never assume a connector is working just because its screen opens.
- Website version: compare /health.json release identity with the GitHub main commit and verify authenticated journeys.

## 8. Administrator provisioning checklist

Use the protected staging rehearsal workflow on a dedicated project, or run `npm run demo:seed`, `npm run demo:verify` and `npm run demo:access` with private configuration after applying migrations. Run `npm run demo:persistence` to verify saved evidence. An actual hosted demo login is available only after the protected provisioning, access tests and hosted release checks have succeeded. The password must be supplied privately by the authorised administrator and never committed or published. See the [technical playbook](DEMO-CLIENT-TEST-PLAYBOOK.md).
