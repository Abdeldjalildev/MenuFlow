# Phase 9 — Deep Audit

## Executive result

Phase 9 was reviewed end-to-end across the order domain, pricing authority, creation boundary, mutation boundary, Firestore rules, frontend callers, lifecycle authority, order numbering, inventory interaction, CI coverage, and the Phase 10 dependency surface.

The audit found and corrected four material Phase 9 integrity gaps:

1. **Direct browser order creation remained possible through Firestore rules.** It is now disabled; canonical callable creation is the only supported browser creation path.
2. **Frontend append and driver-claim helpers still contained direct Firestore mutation paths.** They now call the secure backend mutation boundary.
3. **Appending after inventory deduction could create an order/inventory mismatch.** Append is now rejected once inventory has been deducted.
4. **Append lacked retry/idempotency protection.** A bounded mutation ID and per-order mutation receipt are now required for append.

A fifth correctness issue was also found in the customer UI: the UI applied/displayed a client-side discount while the Phase 9 server pricing contract intentionally ignored client discount authority. The customer checkout was aligned with the current server contract so the UI no longer presents a discounted client total that differs from the persisted server total.

## Gate-by-gate audit

### Gate 9.1 — Order Domain Normalization

**Current state:** implementation complete; local verification pending.

Verified architecture: canonical `price`, `quantity`, and `totalAmount`; legacy aliases normalize at the boundary; `TrackDone` normalizes to `completed` in the order domain/provider.

### Gate 9.2 — Server-Authoritative Pricing

**Current state:** implementation complete; local verification pending.

Menu prices and modifier catalogs are read from the target tenant and totals are calculated server-side. Client price, total, and discount values do not determine persisted totals. Discount authority remains zero until an explicit restaurant discount policy exists.

### Gate 9.3 — Canonical Order Creation

**Current state:** implementation complete; local verification pending.

One callable creation implementation serves customer and waiter sources. Identity, tenant authorization, menu validation, pricing, numbering, and provenance are server-controlled.

### Gate 9.4 — Order Mutation Security

**Current state:** implementation complete; local verification pending.

Sensitive mutation operations use the backend mutation boundary and Firestore transactions. The existing `transitionOrder` remains lifecycle/inventory authority.

### Gate 9.5 — Order Integrity Closure

**Current state:** implementation complete; local verification pending.

The closure contract covers customer/waiter ordering, server pricing, tenant/identity forgery, transactional numbering, direct-write closure, duplicate mutation protection, inventory/lifecycle invariants, and concurrent-sensitive mutations.

## Verification status

Phase 9 is now classified exactly as:

**IMPLEMENTATION COMPLETE — AWAITING LOCAL TEST VERIFICATION — NOT CLOSED.**

This is the same operational distinction used for Phase 8: implementation work is preserved on `main`, while runtime closure is deferred to the local verification environment.

Required local sequence:

1. `npm run test:phase9:gate1`
2. `npm run test:phase9:gate2`
3. `npm run test:phase9:gate3`
4. `npm run test:phase9:gate4`
5. `npm run test:phase9:gate5`
6. `npm run test:phase9:all`
7. `npm test`

If a test fails, classify it before modifying anything. Do not reopen the closed Firebase discovery investigation without new reproducible evidence.

## Phase 10 opening decision

Phase 10 is now **OPEN — IMPLEMENTATION IN PROGRESS**, beginning with Gate 10.1 and Gate 10.2. It consumes Phase 9 contracts and does not declare Phase 9 runtime closure prematurely.
