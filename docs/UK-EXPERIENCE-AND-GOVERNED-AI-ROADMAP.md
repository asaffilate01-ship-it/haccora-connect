# Haccora UK — experience and governed automation priorities

## Product position

One food safety management system for independent and multi-site UK hospitality businesses: daily work, HACCP, allergen and PPDS evidence, equipment, suppliers, traceability, training and inspection preparation. Competent food-safety decisions stay with the responsible people.

## Reference products and engineering patterns

| Reference | Pattern to evaluate | Haccora acceptance criterion |
| --- | --- | --- |
| [Trail](https://trailapp.com/) | Shift-based tasks and exception-led daily operations | Today's work prioritises tasks due, overdue and failed, with a clearly assigned responsible person. |
| [FoodDocs](https://www.fooddocs.com/) | Guided setup, monitoring and source-based traceability | Setup progress measures actual evidence; ingredient-to-batch-to-sale links can be inspected. |
| [Navitas Safety](https://www.navitassafety.com/) | Multi-site oversight and monitoring integrations | Site filtering, device health, missed readings and escalations are explicit. |
| [TanStack Router](https://github.com/TanStack/router) | Type-safe navigation and nested route boundaries | Shared route registry, keyboard discovery, role access and direct-link checks remain consistent. |
| [OpenAI Agents SDK](https://github.com/openai/openai-agents-js) | Tool orchestration, human approval and tracing | Any AI-assisted action has a recorded run, source links, proposed change and authorised approval before execution. |
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | Schema-validated tools and scoped authorisation | Tools operate on the requesting tenant only and reject unauthorised reads and writes. |

References inform interaction patterns, not copied code or unsupported feature claims. No external AI SDK or provider is installed by this change.

## Implemented foundation

- Web and native search recognise industry terms (EHO, SFBB, PPDS, Natasha's Law, probes, batches and equipment) without broadening role access.
- Protected staging supports a named tenant owner with a separate credential, while private operator and other role identities stay distinct.
- Existing source-level and authenticated staging suites check role access and all owner destinations. Hosted execution and native-device acceptance remain required.

## Next acceptance priorities

1. Prove a complete shift on phone, tablet and desktop: open, monitor, record exceptions, close and review.
2. Prove site and organisation switching, role-denied links, tenant boundaries, persisted preferences and meaningful empty/error states.
3. Prove traceability and recall with seeded records, label review, equipment calibration, training expiry and inspection pack generation.
4. Validate Omniqora configuration and evidence-grounded AI review end to end. Do not create or mark corrective actions complete from model output without an authorised person confirming the change.
5. Add read-only MCP tools only after tenant access tests, minimal scopes, output validation, secret handling and audit events pass. Write tools require explicit approval, idempotency, and a verified persistence result.
6. Verify actual hosted release SHA, Supabase schema, payment sandbox, notification providers and mobile offline/online reconciliation before production release.

Keep dashboards separate by real role. A shared demo login must not inherit unrestricted live platform administration.
