# Haccora dashboard recovery and next phases — 28 October 2026

## Delivered in this change

- Operational dashboard cards wait for successful requests. Rejected requests show an actionable error rather than an empty/compliant dashboard.
- Alerts distinguish a confirmed empty list from unavailable records; users can retry.
- Older requests and responses after unmount cannot overwrite newer dashboard or alert state.
- Completing a check requires a returned saved row. Permission-filtered or missing rows and network failures surface an error; duplicate concurrent submissions are suppressed.
- Live metrics reject missing counts, expose retry, remove the unsupported animated LIVE claim, and identify the seven-day temperature exception window alongside 24-hour reading totals.
- Dashboard actions have larger touch targets and readable wrapping. Native dashboards describe local queue state without claiming remote persistence. UK native data reloads on reconnect and supports retry.
- German home no longer turns no readings/tasks into 100% compliance or an all-done shift; it labels the recorded-check sample and removes fabricated location/shift approval signals.
- Six behavioural regression tests per edition cover failures, recovery, missing counts, loading visibility, rejected saves and unmount cleanup using actual component code with an isolated data client.

## Design reference

Reviewed nextlevelbuilder/ui-ux-pro-max-skill at `28b3b8dee8c976df4fa3e94aed4e092ad43fcb03`.
Search: `error recovery loading feedback --domain ux`. Applied error recovery, stable loading feedback, touch targets and readable metric typography. Existing Haccora branding and country-specific data clients remain the baseline.

## UK integration scope

The review branch includes the existing sequence #55 → #59 → #60 → #61 → #62 → #63: daily operations, guided safe methods, supplier specification review, batch recall evidence, authenticated Dishbee order receipts and reconciliation hardening. Each original head had passing production and fresh database/RLS workflows when reviewed. The combined branch must pass fresh checks before merging.

A repository merge does not establish a production migration, deployment, successful real-premises pilot or food-safety acceptance. Supplier review does not close every legacy ingredient-write path. Manager batch attribution is evidence, not proof that every ingredient/order is linked. Physical label withdrawal and printing remain unverified.

## Next phases and acceptance gaps

| Priority | Work                                    | Acceptance evidence required                                                                                                                                                                                             |
| -------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1        | Connected staging rehearsal             | Apply the ordered migrations to isolated staging; verify tenant/site denial, supplier approval conflicts, Dishbee duplicate/conflicting events, batch allocation and recall investigation against the deployed producer. |
| 1        | Authenticated browser and device review | Owner, manager, chef, staff and inspector journeys; slow/offline/reconnected requests; narrow screens, keyboard, large text and dark mode. Protected test credentials required for live role journeys.                   |
| 1        | Native production release               | Signed iOS/Android builds, queue retries and conflict handling on physical devices, background/reconnect behaviour and store configuration. Export success is not signed-build acceptance.                               |
| 2        | Germany feature parity                  | Port shared workflow behaviour with German text, EUR fields and German premises assumptions; do not transplant UK-only safe-method/PPDS claims. German native dashboard still needs complete localisation.               |
| 2        | Dashboard evidence accuracy             | German home now shows recorded-check completion, not synthetic compliance. Audit remaining empty-data success claims, use premises time zones consistently, and disclose dashboard task/query caps.                      |
| 2        | Supplier/label workflow                 | Enforce approved changes across all ingredient write paths, invalidate stale labels, record printer acknowledgement and physical withdrawal evidence.                                                                    |
| 2        | Workforce/shared kitchens               | Shift swaps and leave approval, explicit shared-premises ownership and attributable handover.                                                                                                                            |
| 3        | Operational release                     | Provider configuration, monitoring, backups/restore rehearsal and specialist review with recorded acceptance; governed Omniqora execution remains gated by integration evidence.                                         |

Unrelated major-version dependency PRs and historical overlapping implementation PRs need independent compatibility/redundancy review. They are not evidence that the above phases are production-ready.

## Dependency repair discovered by fresh CI

Pinned patched Vite 8.2.4 and Zod 4.6.7; Germany also moves to the UK-compatible patched TanStack versions and accepts unknown errors at the router boundary. Regenerated web, native and Edge Function lockfiles. Native transitive patches remove high/critical findings; Metro 0.84.5 replaces Germany's vulnerable image-size dependency. Expo CLI's two Zod schema consumers were inspected and their schemas exercised against the pinned override; native exports are rechecked.

UK retains one new, exact, low-severity build-tool exception for deepmerge (GHSA-GCQX-W48M-W2H4), expiring 11 November 2026: no upstream patch exists, and the located usage is Expo configuration/plugin merging, not Haccora application imports. Use only reviewed build configuration/plugins. The high/critical gate remains in place; expired high-severity exceptions are not extended. Germany's existing policy permits low/moderate findings.
