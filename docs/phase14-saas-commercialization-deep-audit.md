# Phase 14 — SaaS Commercialization & Launch Foundations Deep Audit

## Audit status

**GATES 14.1–14.2 IMPLEMENTED — DEEP-AUDITED — VERIFICATION PENDING — NOT CLOSED**

Gates 14.1 and 14.2 were implemented together under the evidence-first phase contract. Gates 14.3–14.5 remain planned and are not implemented.

Phase 13 remains the prerequisite for production closure; implementing these repository contracts does not bypass Phase 13 verification.

## Why Phase 14 exists

The current system already has the core restaurant operating model, multi-tenant authorization, canonical ordering, waiter workflow, operations, notifications and analytics. The next major risk is turning the verified system into a safely operable SaaS product without weakening tenant isolation or introducing billing state that the application cannot reliably reconcile.

The phase therefore focuses on commercial and launch foundations, not speculative feature expansion.

## Gate 14.1 — Production Environment & Deployment Contract

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

Implemented:

- repository-level production/test/local environment contract;
- explicit Functions Node 20 and `us-central1` contract;
- reproducible frontend build contract;
- secrets boundary and no-secret-in-repository rule;
- production smoke-test contract;
- operator-controlled rollback contract;
- dedicated static Gate 14.1 test and package script.

Implementation artifact: `docs/phase14-gate1-production-environment.md`

Verification command: `npm run test:phase14:gate1`

Important boundary: **no production deployment was executed or claimed.** Actual deployment and smoke verification require explicit operator authorization and real production credentials.

## Gate 14.2 — Restaurant Onboarding & Tenant Lifecycle

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

Implemented:

- canonical backend `createRestaurant` callable in `functions/tenantOnboarding.js`;
- SuperAdmin-only creation authority;
- initial Admin membership under `restaurants/{restaurantId}/admins/{adminUid}`;
- recoverable `provisioning` lifecycle state;
- Admin claim publication only after tenant/membership provisioning;
- active lifecycle transition only after successful claim publication;
- compensating cleanup on claim failure;
- diagnostic logging for cleanup/activation failures without secrets;
- safe DZD/analytics defaults only;
- onboarding audit event;
- dedicated static Gate 14.2 test and package script.

Implementation artifact: `docs/phase14-gate2-tenant-lifecycle.md`

Verification command: `npm run test:phase14:gate2`

Important boundary: the Auth claim operation cannot be part of a Firestore transaction. The explicit provisioning state and compensating cleanup are therefore part of the reliability contract; no false atomicity is claimed.

## Gate 14.3 — Plans, Entitlements & Billing Boundary

**PLANNED — NOT AUTHORIZED**

No plan, entitlement, subscription or payment provider implementation is included in Gates 14.1–14.2.

## Gate 14.4 — Commercial UX, Limits & Operational Self-Service

**PLANNED — NOT AUTHORIZED**

## Gate 14.5 — SaaS Launch & Commercial Readiness Closure

**PLANNED — NOT AUTHORIZED**

## Dependency order

`14.1 Production Environment → 14.2 Tenant Lifecycle → 14.3 Plans/Entitlements/Billing → 14.4 Commercial UX/Self-Service → 14.5 Launch Closure`

## Deep-audit findings and scope protections

1. Production deployment was intentionally not performed.
2. Self-service tenant creation was intentionally not enabled; SuperAdmin is the only onboarding authority for now.
3. Firebase Auth claims are external to Firestore transactions, so onboarding uses a recoverable provisioning state instead of claiming atomicity.
4. Claim-failure cleanup is compensating rather than transactional across Auth and Firestore.
5. No billing/provider dependency was introduced before the entitlement policy gate.
6. No legacy tenant path was silently migrated.
7. The canonical order engine was not modified to support onboarding.
8. Existing tenant authorization boundaries remain authoritative.
9. No dependency versions were intentionally changed.

## Required verification before closure

### Gate 14.1

- `npm run test:phase14:gate1`;
- reproducible production build;
- authorized production rules/functions deployment;
- production smoke test for auth, tenant access, order creation and analytics;
- operator-validated rollback.

### Gate 14.2

- `npm run test:phase14:gate2`;
- emulator/runtime authorized SuperAdmin onboarding;
- denial for unauthenticated and non-SuperAdmin callers;
- successful tenant + Admin provisioning;
- claim-failure recovery;
- active lifecycle transition after claim publication;
- cross-tenant denial for the newly provisioned Admin;
- regression of existing order/analytics/security suites.

## Phase 14 deep-audit boundaries

- Do not select a payment provider before the entitlement contract is defined.
- Do not trust client-side plan or subscription state.
- Do not mix billing data with authoritative restaurant operational data.
- Do not migrate legacy tenant paths without production inventory and a reversible cutover.
- Do not introduce usage counters, queues, caches or external billing dependencies speculatively.
- Do not change the canonical order engine to support commercial features.
- Do not weaken existing Admin/SuperAdmin/Waiter/other role boundaries.
