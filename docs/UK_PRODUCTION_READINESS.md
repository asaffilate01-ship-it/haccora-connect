# Haccora UK production-readiness position

This release is UK-only and defaults exclusively to UK English. It adds operational safe-method adoption, daily diary records, UK-nation onboarding, responsibility ownership, and a versioned ingredient/allergen/PPDS data model. It combines the strongest operational, audit, security and native patterns identified in `food-safety-hub` and `haccora`.

## Regulatory product boundary

Haccora helps a food business create and retain evidence for its own food safety management system. It does not certify compliance, guarantee an FHRS/FHIS rating, replace official FSA/FSS guidance, or bind a local authority. All customer-facing compliance content must retain source, jurisdiction, review date, version and specialist approval before publication.

Primary references include FSA managing food safety and SFBB, FSA allergen and PPDS guidance, Food Hygiene Rating Scheme guidance, Food Standards Scotland guidance, UK GDPR and Data Protection Act 2018 obligations. Northern Ireland, Wales, Scotland and England differences must be versioned rather than silently normalised.

## Commercial position

Recommended launch pricing: Essential £9.99/site/month, Complete £24.99/site/month, Multi-site £19.99/site/month with a three-site minimum, and Consultant £99/month for ten sites. Keep a 14-day trial and no setup fee. Compete on fast daily completion, explainable evidence, offline native workflows and transparent per-site pricing—not claims of regulatory approval.

## External gates before public launch

- Apply and verify every migration against a fresh and a production-like Supabase project.
- Configure production Supabase, Stripe, Resend, malware scanning, domain/DNS and Cloudflare secrets.
- Obtain UK food-safety specialist review for every published template and legal review of terms/privacy/cookies.
- Complete DPIA, processor/subprocessor register, retention schedule, incident response and restore drill.
- Run tenant-isolation, accessibility, browser, device, offline-sync, subscription and payment-webhook tests.
- Configure Apple/Google accounts, EAS signing credentials, privacy declarations, store listings and review builds.
- Pilot with representative businesses in each supported UK nation and obtain local-authority/EHO feedback.

No software repository can truthfully be called 100% production-ready until these credentialled, operational, legal and real-world gates have passed.
