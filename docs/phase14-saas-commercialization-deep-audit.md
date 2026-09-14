# Phase 14 — SaaS Commercialization & Launch Foundations Deep Audit

## Audit status

**GATES 14.1–14.4 IMPLEMENTED — DEEP-AUDITED — VERIFICATION PENDING — NOT CLOSED**

Gates 14.1–14.4 were implemented under the evidence-first phase contract. Gate 14.5 remains planned and unauthorized. Phase 13 remains the prerequisite for production closure; Phase 14 implementation does not bypass that verification.

## Gate 14.1 — Production Environment & Deployment Contract

Implemented the production/test/local contract, Node 20/us-central1 assumptions, secrets boundary, smoke-test contract and operator rollback contract. No production deployment was executed.

## Gate 14.2 — Restaurant Onboarding & Tenant Lifecycle

Implemented canonical SuperAdmin-only restaurant creation, initial Admin membership, recoverable provisioning state, claim publication, active transition after claim success, compensating cleanup and onboarding audit.

## Gate 14.3 — Plans, Entitlements & Billing Boundary

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

Implemented:

- explicit `starter` and `growth` plan vocabulary;
- explicit subscription states: `trialing`, `active`, `past_due`, `grace_period`, `canceled`, `suspended`;
- server-derived entitlement snapshot;
- tenant-scoped commercial state under `restaurants/{restaurantId}/commercial/subscription`;
- Admin/SuperAdmin read boundary;
- SuperAdmin-only authoritative commercial-state mutation;
- tenant-scoped plan-change request boundary;
- provider-neutral billing event vocabulary without adding a provider dependency.

### Deep-audit protections

- The browser cannot grant itself entitlements.
- Plan-change requests do not mutate subscription state.
- Commercial state is separate from order/pricing data.
- No payment provider was selected before policy definition.
- No billing dependency was added.

Verification: `npm run test:phase14:gate3`

## Gate 14.4 — Commercial UX, Limits & Operational Self-Service

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

Implemented:

- protected merchant commercial route at `/merchant/commercial`;
- server-derived plan/subscription/entitlement display;
- tenant-scoped upgrade/downgrade request entry points;
- server-created pending change requests;
- no client-side entitlement mutation;
- no sensitive provider/payment data in the UI;
- no speculative usage counters.

### Deep-audit protections

- Admin/SuperAdmin route protection remains in force.
- Commercial state is read through a trusted callable rather than raw browser reads.
- Plan changes are requests only; authorization state remains server-controlled.
- Usage counters are deferred until authoritative usage and limit policies exist.
- Existing merchant localization/layout infrastructure is reused rather than duplicated.

Verification: `npm run test:phase14:gate4`

## Gate 14.5 — SaaS Launch & Commercial Readiness Closure

**PLANNED — NOT AUTHORIZED**

## Required verification before closure

### Gates 14.1–14.4

1. `npm run test:phase14:gate1`
2. `npm run test:phase14:gate2`
3. `npm run test:phase14:gate3`
4. `npm run test:phase14:gate4`
5. `npm test`
6. Runtime/emulator evidence for tenant isolation, role boundaries, onboarding recovery, entitlement derivation and commercial request flows.

### Gate 14.1 production evidence

- authorized production deployment;
- smoke test for auth, tenant access, order creation and analytics;
- operator-validated rollback.

### Gate 14.2 onboarding evidence

- SuperAdmin success;
- unauthenticated/non-SuperAdmin denial;
- successful tenant + Admin provisioning;
- claim-failure recovery;
- cross-tenant denial.

### Gate 14.3 billing-boundary evidence

- unauthorized commercial mutation denial;
- tenant isolation;
- lifecycle-to-entitlement correctness;
- duplicate/request safety before provider integration.

### Gate 14.4 UX evidence

- protected route;
- server-derived commercial state;
- request creation without entitlement mutation;
- AR/EN/FR/RTL regression through existing merchant shell where applicable.

## Scope boundaries preserved

- No production deployment.
- No payment provider integration.
- No speculative billing dependency.
- No destructive migration.
- No client-authoritative subscription state.
- No mixing billing data with operational order data.
- No canonical order-engine rewrite.
- No dependency upgrades.
- No broad refactor.

## Dependency order

`14.1 Production Environment → 14.2 Tenant Lifecycle → 14.3 Plans/Entitlements/Billing → 14.4 Commercial UX/Self-Service → 14.5 Launch Closure`
