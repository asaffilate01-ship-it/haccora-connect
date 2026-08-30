# Authenticated launch acceptance

Haccora has two protected, repeatable acceptance paths beyond source CI. Neither path stores passwords, Stripe keys or provider tokens in the repository.

## Staging role persistence

Run **Protected staging rehearsal** in `apply-and-test` mode. After the forward migrations and demo seed, the workflow signs in as every tenant role and proves:

- create, sign out, sign back in and reload;
- update, sign out, sign back in and reload;
- delete and observe the deletion;
- cross-tenant writes are rejected;
- the platform owner cannot bypass tenant RLS.

The harness uses `user_experience_preferences`, restores any row that existed before the run and is hard-blocked unless the exact demo Supabase URL is allow-listed. Its redacted evidence is `demo-role-persistence.txt` inside the staging artifact.

For the supplied production test identities, run **Production test-account persistence**. Configure the seven `ROLE_ACCEPTANCE_*_EMAIL` repository variables and the `ROLE_ACCEPTANCE_PASSWORD` repository secret. The production path uses only the publishable key and each user's authenticated session; it never receives a service-role key. It is additionally guarded by the exact Supabase URL and the designated-test-account confirmation.

## Lovable Stripe lifecycle

Stripe remains hosted by Lovable. GitHub does not receive the live Stripe API key, webhook signing secret or Lovable private API key.

For the controlled payment acceptance tenant:

1. Trigger or observe the real event in Stripe/Lovable.
2. Run **Lovable Stripe lifecycle acceptance** with the tenant UUID and the expected state: `healthy`, `past_due`, `restricted` or `recovered`.
3. Retain the generated `payment-lifecycle-state.json` artifact with the matching Lovable/Stripe delivery evidence.

Repository configuration required by the workflow:

- variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ROLE_ACCEPTANCE_OWNER_EMAIL`, `ROLE_ACCEPTANCE_PLATFORM_OWNER_EMAIL`;
- secret: `ROLE_ACCEPTANCE_PASSWORD`.

The verifier does not mutate subscription, service or credit-control state. It authenticates the tenant owner and platform operator, then checks the provider-derived subscription, tenant service state, credit-control case and notification stage. The platform query creates its normal audit event. The workflow does not simulate or forge a Stripe webhook, and it does not prove Resend/push delivery; those provider delivery logs are separate launch evidence.
