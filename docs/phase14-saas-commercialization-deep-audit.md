# Cross-Phase 8–14 Deep Audit — MenuFlow

## Audit status

**PHASES 8–14 IMPLEMENTATION REVIEW COMPLETE — CROSS-PHASE CONSISTENCY AUDITED — VERIFICATION PENDING**

This repository-level audit reviewed the cumulative architecture introduced from Phase 8 through Phase 14, with emphasis on authorization authority, tenant identity, canonical order creation/mutation, pricing/modifiers, notifications, analytics, observability, resilience boundaries, onboarding, commercial state, and regression contracts.

## Phase 8 — Domain & Security Architecture

- Membership is the authoritative Admin tenant boundary; stale `restaurantId` claims are not sufficient for Admin access.
- Tenant-scoped non-Admin roles continue to depend on trusted claims.
- Browser/localStorage identity is not treated as authorization authority.
- Order authority remains server-side.
- No closed Firebase discovery investigation was reopened.

Audit result: no repository-level contradiction requiring reopening Phase 8. Runtime closure evidence remains separate from implementation.

## Phase 9 — Order Integrity & Unified Ordering

- Customer and waiter creation converge on `canonicalOrderCreation.js`.
- Server-side menu lookup and pricing remain authoritative.
- Order numbering and idempotency remain transactional.
- Secure order mutations remain behind `secureOrderMutations.js`.
- `transitionOrder` remains the lifecycle authority; commercial/analytics work does not replace it.

Audit result: no second order engine or client-side pricing authority introduced by Phases 10–14.

## Phase 10 — Waiter Experience

- Waiter access remains role/tenant protected.
- Waiter ordering uses the canonical order callable.
- The table `0` delivery sentinel remains rejected for waiter orders.
- Kitchen continues to consume the same order lifecycle rather than a second state machine.

Audit result: no commercial or analytics feature bypasses the waiter/order authority boundary.

## Phase 11 — Restaurant Operations & UX

- Cart persistence stores IDs/quantities/notes rather than authoritative prices/totals.
- Customer order UX clears cart only after confirmed server success.
- Modifier pricing is catalog-authoritative.
- Operational notifications are backend-created and client-read-only.
- Order-transition notifications remain isolated from lifecycle mutation failures.

### Audit correction

The modifier contract previously allowed a modifier with `required: true` but no explicit `minSelections` to normalize to `minSelections = 0`. That contradicted the meaning of the `required` flag. The server normalization was corrected so `required: true` implies a minimum selection of one when `minSelections` is omitted, and the Gate 11.3 contract test now covers this boundary.

## Phase 12 — Analytics & Business Intelligence

- Revenue remains based on completed orders and historical server snapshots.
- Expenses are tenant-scoped and use the canonical expense namespace.
- Analytics queries are bounded and fail closed at the configured source limit.
- Dashboard consumption remains through the trusted analytics callable rather than raw operational collection reads.
- Timezone conversion remains explicit.

Audit result: no cross-phase commercial feature became an analytics authority, and no analytics path became order authority.

## Phase 13 — Production Readiness, Reliability & Scale

- Observability uses a bounded diagnostic taxonomy rather than leaking request payloads/secrets.
- Performance boundaries preserve Phase 6 frontend budgets and bounded analytics queries.
- Resilience/recovery remains documented without speculative queues/caches.
- Production/operator evidence is not falsely represented as repository verification.

Audit result: no Phase 14 feature invalidated the Phase 13 production-readiness boundaries.

## Phase 14 — SaaS Commercialization & Launch Foundations

### 14.1
Production environment/deployment contract is documented; no production deployment or credential handling was introduced.

### 14.2
SuperAdmin-only tenant onboarding uses `provisioning → active`, initial Admin membership, claim publication and compensating cleanup.

### 14.3
Commercial plan vocabulary and entitlement derivation are server-authoritative and provider-neutral.

### 14.4
Commercial UI consumes server-derived state and creates plan-change requests only; it cannot grant entitlements.

### 14.5
Launch-readiness closure explicitly requires runtime/operator evidence and does not claim commercial launch.

### Audit corrections

1. **Auth claim preservation:** onboarding previously replaced the entire target user's custom-claims object. The flow now preserves unrelated existing claims while replacing only the authorization fields required for the new Admin role. If activation fails after claim publication, the original claims are restored on a best-effort basis and the failure is diagnostically recorded.
2. **Active-tenant commercial boundary:** commercial reads and plan-change requests now require the target restaurant to exist and have `lifecycleState === 'active'`. This prevents a partially provisioned tenant from entering the commercial workflow.
3. **Nonexistent tenant protection:** authoritative commercial mutation/request paths reject nonexistent restaurant IDs before creating commercial documents.

## Cross-phase authority map

| Domain | Single authority | Protected from |
|---|---|---|
| Tenant creation | `createRestaurant` | client/self-service bypass |
| Admin membership | Firestore membership + backend provisioning | stale claims |
| Non-Admin tenant identity | trusted Auth claim | URL/localStorage |
| Order creation | `canonicalOrderCreation.js` | browser direct writes |
| Pricing | `orderPricing.js` + tenant menu catalog | client price/total |
| Order mutation | `secureOrderMutations.js` + lifecycle authority | arbitrary Firestore updates |
| Notifications | backend notification writer | browser writes |
| Analytics | `getAnalyticsSummary` + aggregation contract | raw client aggregation |
| Commercial entitlements | `commercialEntitlements.js` | UI flags/client mutation |
| Commercial state mutation | SuperAdmin callable | Admin/client mutation |

## Contradiction check

The audit found and corrected the concrete semantic/data-integrity inconsistencies listed above. No remaining repository-level contradiction was identified that justified changing the canonical order engine, reopening the historical Firebase discovery investigation, adding speculative infrastructure, weakening security rules, or performing a broad refactor.

## Residual evidence boundaries

These are not declared PASS without runtime evidence:

1. concurrent onboarding attempts for the same Admin UID;
2. Auth claim refresh behavior;
3. Firestore cross-tenant enforcement in emulator/runtime;
4. full Phase 8–14 regression;
5. analytics timezone/boundary behavior;
6. commercial tenant isolation and lifecycle enforcement;
7. production/operator deployment and rollback evidence.

## Required principle

Implementation, verification, and closure remain separate states. This audit corrects repository-level defects found from the source; it does not convert static review into runtime PASS.

## Current phase closure state

- Phases 1–7: historical baseline CLOSED.
- Phase 8: implemented/audited, verification/closure evidence pending.
- Phase 9: implemented/audited, verification/closure evidence pending.
- Phase 10: implemented/audited, verification/closure evidence pending.
- Phase 11: implemented/audited, verification/closure evidence pending.
- Phase 12: implemented/audited, verification/closure evidence pending.
- Phase 13: implemented/audited, verification/runtime/operator evidence pending.
- Phase 14: all five gates implemented/audited, verification/runtime/operator evidence pending.
