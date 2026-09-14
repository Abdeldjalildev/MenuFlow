# Phase 14 — SaaS Commercialization & Launch Foundations Deep Audit

## Planning status

**PLANNED — DEEP-AUDITED — NOT AUTHORIZED FOR IMPLEMENTATION**

Phase 14 is intentionally not implemented while Phase 13 is awaiting verification. It is the next architectural/business phase after production-readiness evidence is confirmed.

## Why Phase 14 exists

The current system already has the core restaurant operating model, multi-tenant authorization, canonical ordering, waiter workflow, operations, notifications and analytics. The next major risk is not another internal feature: it is turning the verified system into a safely operable SaaS product without weakening tenant isolation or introducing billing state that the application cannot reliably reconcile.

The phase therefore focuses on commercial and launch foundations, not speculative feature expansion.

## Gate 14.1 — Production Environment & Deployment Contract

### Goal

Make production deployment reproducible and explicitly separated from local/emulator development.

### Planned work

1. inventory Firebase/Vite production configuration and required environment values;
2. separate development, test and production configuration boundaries;
3. define deployment prerequisites and rollback procedure;
4. verify Functions region/runtime and Firestore rules deployment;
5. document secrets handling without placing secrets in the repository;
6. define a production smoke-test contract after deployment.

### Acceptance evidence

- reproducible production build;
- explicit environment matrix;
- successful rules/functions deployment in the intended project;
- smoke test for authentication, tenant access, order creation and analytics;
- rollback procedure tested or explicitly operator-validated.

No production deployment is performed by this gate without explicit authorization.

## Gate 14.2 — Restaurant Onboarding & Tenant Lifecycle

### Goal

Turn restaurant creation and administrator provisioning into one safe, auditable tenant lifecycle.

### Planned work

1. define canonical restaurant creation authority;
2. define initial Admin membership provisioning and rollback behavior;
3. validate restaurant configuration defaults without unsafe fallbacks;
4. define lifecycle states such as active/suspended where actually required;
5. audit QR/menu/settings initialization against the canonical tenant namespace;
6. reconcile known legacy callers only with production inventory and reversible migration evidence.

### Acceptance evidence

- new tenant can be created without orphaned authorization state;
- initial admin can access only the new tenant;
- partial provisioning fails safely and is recoverable;
- tenant lifecycle state cannot be forged by the client;
- no cross-tenant reads/writes are introduced.

## Gate 14.3 — Plans, Entitlements & Billing Boundary

### Goal

Introduce commercial policy without making the browser authoritative for paid access.

### Planned work

1. define plan/entitlement vocabulary before choosing a payment provider;
2. decide which capabilities are gated by plan and which remain universal;
3. create a server-authoritative entitlement contract;
4. define subscription lifecycle states and webhook/event idempotency requirements;
5. define grace period, cancellation and failed-payment behavior;
6. only then evaluate an appropriate payment provider for the target market.

### Acceptance evidence

- entitlement checks occur at trusted server boundaries where required;
- client UI cannot grant itself premium access;
- duplicate provider events are idempotent;
- subscription state changes are auditable;
- billing failure cannot corrupt restaurant operational data.

No payment provider or billing dependency should be added before the policy contract is approved.

## Gate 14.4 — Commercial UX, Limits & Operational Self-Service

### Goal

Expose commercial state to restaurant administrators without duplicating business authority.

### Planned work

1. plan/status display;
2. usage/limit visibility based on server-derived counters;
3. upgrade/downgrade entry points;
4. account/restaurant settings required for self-service;
5. operational notices for limits, suspension or billing state;
6. Arabic/English/French and RTL coverage for commercial flows.

### Acceptance evidence

- UI reflects server truth;
- limit enforcement is consistent across callable/backend boundaries;
- no sensitive billing data is exposed to unauthorized staff roles;
- commercial state cannot bypass existing tenant/security rules.

## Gate 14.5 — SaaS Launch & Commercial Readiness Closure

### Goal

Prove the product is ready for controlled real-world onboarding, not merely feature-complete.

### Planned work

1. end-to-end new-restaurant onboarding;
2. entitlement and subscription lifecycle verification;
3. operational/security regression;
4. production smoke and rollback evidence;
5. documentation for support, incidents and account lifecycle;
6. explicit accepted limitations and deferred roadmap.

### Acceptance evidence

- full authorized test suite;
- representative production-like tenant onboarding;
- cross-tenant security evidence;
- billing/entitlement idempotency evidence if billing is enabled;
- deployment/rollback evidence;
- support/operator documentation;
- final launch decision based on evidence.

## Dependency order

`14.1 Production Environment → 14.2 Tenant Lifecycle → 14.3 Plans/Entitlements/Billing → 14.4 Commercial UX/Self-Service → 14.5 Launch Closure`

## Phase 14 deep-audit boundaries

- Do not implement Phase 14 before Phase 13 verification/closure.
- Do not select a payment provider before the entitlement contract is defined.
- Do not trust client-side plan or subscription state.
- Do not mix billing data with authoritative restaurant operational data.
- Do not migrate legacy tenant paths without production inventory and a reversible cutover.
- Do not introduce usage counters, queues, caches or external billing dependencies speculatively.
- Do not change the canonical order engine to support commercial features.
- Do not weaken existing Admin/SuperAdmin/Waiter/other role boundaries.
