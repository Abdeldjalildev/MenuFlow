# Phase 10 — Waiter Experience Plan

## Status

**IMPLEMENTATION COMPLETE — AWAITING LOCAL TEST VERIFICATION — NOT CLOSED**

All five Phase 10 gates have now been implemented and deep-audited. Runtime/browser verification remains intentionally local and must be performed before Phase 10 receives CLOSED status.

Phase 9 remains **IMPLEMENTATION COMPLETE — AWAITING LOCAL TEST VERIFICATION — NOT CLOSED**. Phase 10 consumes the Phase 9 contracts and does not declare Phase 9 runtime closure.

## Gate 10.1 — Waiter Role & Access

**Status: IMPLEMENTATION COMPLETE — VERIFICATION PENDING**

Implemented:

- dedicated `/waiter` protected route;
- explicit `Waiter` handling in `ProtectedRoute`;
- login navigation based on signed Firebase custom claims;
- waiter tenant context obtained from the trusted `restaurantId` claim;
- waiter experience rejects missing/invalid role or restaurant claim;
- waiter Firestore tenant scope includes operational order reads while direct browser order creation remains disabled;
- waiter staff access is limited to the waiter's own staff record;
- no URL or localStorage value is used as waiter authorization authority.

Acceptance contract: `tests/phase10-gate1-waiter-access.test.mjs`.

## Gate 10.2 — Waiter Menu

**Status: IMPLEMENTATION COMPLETE — VERIFICATION PENDING**

Implemented:

- `WaiterExperience` menu reads directly from the restaurant identified by the trusted waiter claim;
- existing `MenuGrid` and `CategoryTabs` components are reused;
- Arabic, English, and French are supported;
- Arabic uses RTL presentation;
- menu prices are display-only; waiter submission sends menu item IDs, quantities, and notes rather than client totals/prices;
- empty menu state is explicit;
- demo/default menu fallback was removed from `MenuProvider`;
- waiter submission uses the Phase 9 canonical `createOrder` callable with `orderSource: 'waiter'`.

Acceptance contract: `tests/phase10-gate2-waiter-menu.test.mjs`.

## Gate 10.3 — Waiter Cart & Customer Order

**Status: IMPLEMENTATION COMPLETE — VERIFICATION PENDING**

Implemented:

- bounded and validated table entry;
- explicit table confirmation before submission, with a clear change-table path;
- cart count and empty-cart validation;
- per-item customer notes remain bounded and travel through the canonical order boundary;
- waiter submits menu item IDs and quantities only; server pricing remains authoritative;
- server result is validated before clearing the cart;
- stable waiter mutation IDs survive transport/application failures so retrying the same submission is idempotent;
- canonical backend identity and tenant authorization remain authoritative;
- the waiter UI and canonical backend reject the reserved `0` table sentinel so a waiter cannot accidentally create a delivery order.

Acceptance contract: `tests/phase10-gate3-waiter-cart-order.test.mjs`.

## Gate 10.4 — Kitchen Integration

**Status: IMPLEMENTATION COMPLETE — VERIFICATION PENDING**

Implemented:

- waiter-created orders are persisted with `status: pending` and `orderSource: waiter`;
- the existing tenant-scoped `OrderProvider` order stream feeds the Kitchen dashboard;
- Kitchen consumes waiter orders through the same existing order collection/context as other orders;
- `pending` → `preparing` → ready-state transitions continue through `transitionOrder` authority;
- table orders use `ready_for_payment`, while delivery orders use `ready_for_delivery`;
- completed and paid orders remain excluded from the active kitchen queue;
- no waiter-specific or parallel order state machine was introduced.

Acceptance contract: `tests/phase10-gate4-kitchen-integration.test.mjs`.

## Gate 10.5 — Waiter E2E Closure

**Status: IMPLEMENTATION COMPLETE — VERIFICATION PENDING**

Implemented closure barrier covering:

- waiter login and protected-route reachability;
- trusted waiter tenant identity and cross-tenant protection;
- table selection/confirmation and reserved delivery sentinel protection;
- menu → cart → notes → canonical create-order submission;
- server-authoritative pricing, order numbering, actor identity, and mutation idempotency;
- waiter order entry into the existing Kitchen lifecycle;
- Arabic/English/French UI and Arabic RTL;
- direct browser order creation remaining disabled;
- inclusion of all preceding Phase 10 gate contracts in the closure barrier.

Acceptance contract: `tests/phase10-gate5-waiter-e2e-closure.test.mjs`.

**Important:** this gate deliberately does not claim browser/runtime PASS. The local verification environment must execute the Phase 10 suite and the required regression suite.

## Deep-audit correction applied during Phase 10 closure preparation

A waiter table value of `0` was a semantic collision with the application's existing delivery-order sentinel (`tableNumber === '0'`). The UI now rejects it, and the canonical backend independently rejects `orderSource: waiter` with table `0`. This is defense-in-depth: the UI improves correctness, while the server remains authoritative.

## Phase 10 scope boundary

Phase 10 does not redefine Phase 9 pricing, order numbering, mutation authority, or lifecycle rules. It consumes those contracts. It does not introduce a payment gateway, new payment provider, or parallel order engine.
