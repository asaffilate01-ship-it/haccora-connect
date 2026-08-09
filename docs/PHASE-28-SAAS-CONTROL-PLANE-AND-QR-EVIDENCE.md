# Phase 28 — SaaS control plane and QR evidence

## Delivered

- A UK-only SaaS-owner console with GBP MRR/ARR, past-due exposure, tenant/site/user/asset volume, 30-day evidence activity and plan/status distribution.
- Audited tenant creation, freeze, unfreeze, retained closure and restoration. Frozen and closed tenants fail closed at the database context boundary.
- Audited subscription administration for plan, status, contracted MRR, seat and premises limits. Limits cannot be reduced below current active volume.
- Audited SaaS staff invitations and role/status management with last-owner and self-disable safeguards.
- A tenant owner/authorised-manager console for staff invitations, status, standard/custom role and default-premises assignment.
- Subscription-bound custom roles that can only reduce a safe built-in role. Restrictive RLS applies those reductions to assets, HACCP, allergens/recipes, purchasing, incidents, audits, recalls and rotas.
- Database triggers serialise staff and pending-invitation capacity checks so concurrent requests cannot bypass a subscription seat limit.
- Tenant premises and custom-role counts are enforced by server RPCs and subscription catalogue limits.
- Append-only platform and tenant administration audit histories.
- PWA and native QR scan sessions that resolve the protected equipment identity server-side and record the actor, asset, premises, server time, optional device time and consented GPS/accuracy.
- A subsequent equipment reading can reference only the same user's matching scan from the previous 12 hours. The scan time and location evidence are copied into the append-only asset event.
- Commercial Solo, Complete and Small Group Stripe plans and GBP pricing metadata.

## Verification completed

- Root production quality gate, 150 tests, TypeScript, ESLint, formatting, migration lineage, secret scan and pinned GitHub Actions.
- All 16 Edge Functions formatted, linted and type-checked with Deno 2.9.4.
- Cloudflare worker production build, public-route smoke test and 500 KiB per-chunk budget.
- Expo exports for web, iOS and Android plus native TypeScript.
- Root and Edge production dependency audits have zero findings. The two exact mobile build-tool exceptions remain governed by the existing expiry and launch-acceptance gate.

## External gates still required

Apply and test the migration on an isolated linked Supabase project, run the committed pgTAP and Playwright gates in GitHub, supply the real EAS project UUID and signing accounts, complete physical-device camera/GPS/offline/push tests, configure Stripe/notification/scheduler providers and obtain the protected security, privacy/legal, food-safety and operations acceptance evidence. These are deployment and accountable-review tasks; source code cannot manufacture their result.
