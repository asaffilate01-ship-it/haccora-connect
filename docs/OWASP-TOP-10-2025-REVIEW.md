# OWASP Top 10:2025 security review

Reviewed: 1 September 2026

Scope: Haccora UK web application, Supabase migrations/RLS and Edge Functions

Baseline: [OWASP Top 10:2025](https://owasp.org/Top10/2025/) and [OWASP ASVS 5.0.0](https://owasp.org/www-project-application-security-verification-standard/)

This is a repository-level security review and hardening record. It is not a substitute for an independent penetration test or a live infrastructure certification.

## Result

The production dependency audit reports zero known vulnerabilities. This change set closes the material repository findings identified in the review: overly broad preview-origin trust, unbounded public request bodies, non-atomic public rate limiting, weak outbound webhook host restrictions, missing network timeouts, generic authentication failures, inline event-handler allowance and unsafe dynamic chart CSS.

## Control map

| OWASP Top 10:2025 category                 | Haccora controls reviewed or strengthened                                                                                                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control                  | Tenant-aware RLS is recreated by the production tenancy migration; privileged Edge operations require a verified user, organization role and, for platform administration, AAL2 MFA. CORS now uses exact origins only. |
| A02 Security Misconfiguration              | Strict security headers, private-route `no-store`, exact CORS allow-listing, denied framing and inline script attributes, no committed secrets and pinned GitHub Actions.                                              |
| A03 Software Supply Chain Failures         | Lockfile-controlled npm installs, dependency audit, action SHA pin checks, SBOM generation and CI source-integrity checks.                                                                                             |
| A04 Cryptographic Failures                 | TLS/HSTS, Supabase-managed password/JWT handling, hashed invitation/device/webhook secrets, constant-time shared-secret comparison and encrypted integration secrets.                                                  |
| A05 Injection                              | Zod input schemas, bounded JSON readers, parameterised Supabase calls, sanitized chart identifiers/CSS colours and no raw SQL assembled from request data.                                                             |
| A06 Insecure Design                        | Owner approval, plan/seat/location enforcement, two-person approval for high-risk actions, inspector scopes, immutable audit events and malware-gated document reads.                                                  |
| A07 Authentication Failures                | JWT claims are verified server-side; malformed/oversized Bearer headers fail with 401; platform administration requires MFA step-up.                                                                                   |
| A08 Software or Data Integrity Failures    | Signed Stripe and Dokuvera webhooks, replay protection/idempotency, file hashes, migration lineage checks, immutable security events and pinned CI actions.                                                            |
| A09 Security Logging and Alerting Failures | Security-event recording, platform audit events, job heartbeats, provider failures, delivery retries/dead letters and operational-health workflows.                                                                    |
| A10 Mishandling Exceptional Conditions     | Request-size limits, outbound timeouts, redirect denial, response size limits, fail-closed CORS/auth, bounded retries and generic public error messages.                                                               |

## Enforced regression checks

Run:

```bash
npm run security:owasp
npm run quality
```

The dedicated check fails if exact-origin CORS, body limits, SSRF guards, auth status handling or browser-policy controls are removed.

## Live checks still required

Repository checks cannot prove hosted configuration. Before production sign-off, verify in Lovable/Supabase and the DNS/CDN provider:

- leaked-password protection, email confirmation, appropriate JWT lifetime and MFA recovery policy;
- exact `ALLOWED_ORIGINS` entries for any required Lovable preview origin—never a wildcard;
- current Edge secrets, regular rotation and least-privilege provider credentials;
- RLS and authenticated tenant-isolation tests against the live database;
- webhook signature/replay rejection, Stripe recovery flows and Dokuvera source restrictions;
- WAF/rate-limit rules, log retention and tested alert delivery;
- backup restoration, incident response and access-review evidence;
- an independent authenticated penetration test before handling high-volume customer data.
