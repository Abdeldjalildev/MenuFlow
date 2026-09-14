# Phase 10 — Waiter Experience Plan

## Status

**OPEN — GATES 10.1 AND 10.2 IMPLEMENTED — LOCAL VERIFICATION PENDING**

Phase 9 remains **IMPLEMENTATION COMPLETE — AWAITING LOCAL TEST VERIFICATION — NOT CLOSED**. Phase 10 is nevertheless authorized and opened for implementation; its work consumes the Phase 9 contracts and does not declare Phase 9 runtime closure.

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

Acceptance contract is captured in `tests/phase10-gate1-waiter-access.test.mjs`.

## Gate 10.2 — Waiter Menu

**Status: IMPLEMENTATION COMPLETE — VERIFICATION PENDING**

Implemented:

- `WaiterExperience` menu reads directly from the restaurant identified by the trusted waiter claim;
- existing `MenuGrid` and `CategoryTabs` components are reused;
- Arabic, English, and French are supported;
- Arabic uses RTL presentation;
- menu prices are display-only; waiter submission sends menu item IDs, quantities, and notes rather than client totals/prices;
- empty menu state is explicit;
- the old demo/default menu fallback was removed from `MenuProvider` so missing database menu data cannot silently become fake production menu data;
- waiter submission uses the Phase 9 canonical `createOrder` callable with `orderSource: 'waiter'`.

Acceptance contract is captured in `tests/phase10-gate2-waiter-menu.test.mjs`.

## Gate 10.3 — Waiter Cart & Customer Order

**Status: PLANNED — NOT STARTED**

The Gate 10.2 implementation contains the minimal cart and canonical submission foundation needed for the next gate, but Gate 10.3 remains a separate gate and is not being declared complete here.

Required work: robust table selection/confirmation, cart validation and UX, customer notes, duplicate-submission handling, server result handling, and focused runtime/security tests around waiter order creation.

## Gate 10.4 — Kitchen Integration

**Status: PLANNED — NOT STARTED**

Waiter-created orders must enter the existing `pending` → kitchen lifecycle without a second state machine.

## Gate 10.5 — Waiter E2E Closure

**Status: PLANNED — NOT STARTED**

Closure requires browser/runtime evidence for the complete waiter workflow, targeted security tests, multilingual verification, and regression verification. Static checks alone are insufficient.

## Phase 10 scope boundary

Phase 10 does not redefine Phase 9 pricing, order numbering, mutation authority, or lifecycle rules. It consumes those contracts. It does not introduce a payment gateway, new payment provider, or parallel order engine.
