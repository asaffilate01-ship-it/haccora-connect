# Phase 51 — AI and business add-ons

Date: 25 September 2026

The owner catalogue now contains 20 optional services. Web and native import the same
dependency-free catalogue from `shared/business-services.ts` so descriptions, availability,
categories and search stay aligned.

## Added services

- Omniqora Agentic AI: proposed tasks, follow-ups and approved workflows.
- Omniqora GenAI: reviewed reports, training drafts and communications.
- Omniqora Intelligent AI: anomaly detection and forecasting setup.
- Omniqora RAG: answers grounded in approved documents and source references.
- Omniqora GraphRAG: relationship-based evidence investigation.
- Omniqora Metrics: operational KPIs and multi-site reporting setup.
- Omniqora Financials: costs, margins and cash-flow reporting setup.
- Lawquo: legal-support introductions.

These extend Omniqora Intelligence/Communications, XpertJobs, Dishbee, TaxNuvia, Craftvaro,
Veyumo, EventPlanr, Zoryn Rewards, suppliers, training and insurance already in the catalogue.
The request is for access, help or a quote. This phase does not implement the external AI
engines, transmit tenant data, create subscriptions or invent live provider endpoints.

## Web and native behaviour

Owners can search names and benefits, filter by category, review a service, agree to contact and
save a request. AI/reporting details explain which data would be needed and which decisions
require review. Native uses the same authenticated RPCs and shows the owner's saved requests.
Contextual web suggestions link financials from billing, AI reporting from the dashboard,
RAG/workflows from integrations and recruitment/legal support from organisation settings.

Requests remain tenant-isolated support cases. Only an owner of an active, approved organisation
can create them. Contact consent and message length are checked in PostgreSQL. Concurrent retries
return the existing open request. No direct provider message is sent by this workflow.

## Deployment

Apply `20260925093000_ai_financial_business_addons.sql` after all existing migrations, then deploy
the matching web and native sources. The forward migration expands the constraint and existing
RPC allowlist, preserving all old service IDs and request history. It changes no billing or
entitlement state and keeps anonymous callers excluded.

Run the expanded database tests for new IDs, persistence and tenant isolation. Verify with
designated owner and staff accounts, including a disconnected device and repeated request.
An unavailable backend must display an error, never a fabricated success. Provider onboarding,
data-sharing terms and any charges are confirmed separately before a service is activated.
