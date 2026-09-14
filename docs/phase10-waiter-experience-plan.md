# Phase 10 — Waiter Experience Plan

## Status

**PLANNED — NOT STARTED**

Phase 10 must begin only after Phase 9 runtime verification and closure. This document defines the five gates from the current repository state and the approved roadmap without implementing Phase 10.

## Current repository evidence

The backend already recognizes `Waiter` as an authorization role in the broader claims model and Phase 9's canonical order creation accepts `orderSource: 'waiter'`. The waiter actor is tenant-bound by the trusted `restaurantId` claim; Admin actors use explicit restaurant membership.

The current frontend does not yet expose a waiter route. `App.tsx` has routes for SuperAdmin, Kitchen, Cashier, Delivery, and merchant roles, but no `/waiter` route. `ProtectedRoute` also has no explicit Waiter redirect and currently falls through to the Delivery destination for unhandled staff roles.

The current Firestore operator helper intentionally excludes Waiter from `isTenantOperator`. This means Phase 10 must explicitly decide and implement the waiter read scope rather than silently inheriting another staff role's permissions.

The current `OrderProvider` is customer/staff-oriented and its staff listener uses a restaurant claim when present. Phase 9 removed direct Firestore mutation paths for append and driver claim, routing them through server callables. Phase 10 should reuse those server authorities rather than creating a waiter-specific mutation path.

`CustomerMenu` already demonstrates the target customer menu behavior: category filtering, multilingual `ar`/`en`/`fr`, cart integration, item notes, and customer checkout. The waiter menu should reuse the same domain/menu components or equivalent shared components, not create a second language or menu system.

## Gate 10.1 — Waiter Role & Access

### Objective

Make Waiter a first-class authenticated, restaurant-scoped frontend actor without weakening backend authorization.

### Required work

- Add a dedicated waiter route and protected entry point.
- Permit only authenticated users whose trusted Firebase ID-token role is `Waiter`.
- Require the waiter restaurant claim for tenant-scoped access.
- Ensure a waiter cannot select or access another restaurant by changing URL/localStorage values.
- Add explicit Waiter routing in `ProtectedRoute` and login navigation.
- Align Firestore read scope with the intended waiter experience; never use localStorage as authorization.
- Keep Admin multi-restaurant behavior separate from Waiter single-tenant behavior.

### Acceptance criteria

- Unauthenticated users cannot enter the waiter experience.
- Cashier/Kitchen/Delivery/Admin users cannot enter the waiter-only route unless explicitly authorized by the route contract.
- Waiter A at Restaurant A cannot read or mutate Restaurant B data.
- Forged `restaurantId` URL/localStorage values do not grant cross-tenant access.
- A valid waiter can access only the restaurant represented by the trusted claim.

## Gate 10.2 — Waiter Menu

### Objective

Provide the waiter with the same full menu domain as the customer, adapted for staff workflow.

### Required work

- Reuse the existing menu data source and menu item domain.
- Reuse category filtering and menu components where practical.
- Support Arabic, English, and French.
- Pass the selected language through component props or established application state.
- Preserve RTL behavior for Arabic.
- Avoid a second translation state machine or duplicated menu fetch logic.
- Display authoritative menu prices; do not introduce waiter-side price overrides.
- Respect unavailable/disabled menu items using the existing menu data contract.

### Acceptance criteria

- Waiter sees the restaurant's complete menu.
- Menu contents are tenant-correct.
- Language switching is consistent with the established application behavior.
- No client-side waiter price becomes order authority.
- Empty/loading/error states are explicit.

## Gate 10.3 — Waiter Cart & Customer Order

### Objective

Allow a waiter to create an order for a table and optional customer notes using the Phase 9 canonical order authority.

### Required work

- Select or confirm table number.
- Add/remove menu items and quantities.
- Capture customer notes without trusting them as financial authority.
- Validate an empty cart and invalid quantities before submission.
- Call the same canonical `createOrder` callable with `orderSource: 'waiter'`.
- Let the server derive `waiterId` and `waiterName` from authenticated identity.
- Let the server derive prices, modifiers, totals, tenant validation, and order number.
- Show the server-returned order number after successful submission.
- Prevent accidental duplicate submission; preserve the Phase 9 idempotency approach for mutation operations where applicable.

### Acceptance criteria

- A waiter cannot submit an order for another restaurant.
- A waiter cannot impersonate another waiter.
- Client-supplied price/total/discount values do not affect the persisted order.
- The order contains `orderSource: 'waiter'` and server-derived waiter identity.
- The returned order number is server-authoritative.
- Failed submissions do not produce misleading success UI.

## Gate 10.4 — Kitchen Integration

### Objective

Make waiter-created orders enter exactly the same operational lifecycle as customer orders.

### Required work

- Ensure waiter-created orders use the same `pending` initial state.
- Ensure kitchen listeners can see waiter orders under the existing tenant rules.
- Reuse `transitionOrder`; do not introduce a waiter lifecycle.
- Preserve inventory deduction and transition invariants from Phase 9.
- Display order provenance to kitchen where useful, without changing lifecycle authority.
- Verify waiter-created orders remain visible to the authorized restaurant's operational staff only.

### Acceptance criteria

- Waiter order appears in the kitchen workflow.
- Kitchen can process it through the existing state machine.
- Inventory behavior is identical to customer-created orders.
- Restaurant B staff cannot see Restaurant A waiter orders.
- No second waiter-specific status machine exists.

## Gate 10.5 — Waiter E2E Closure

### Objective

Verify the complete waiter workflow as a production-facing path.

### Required end-to-end flow

`Login waiter → authenticated tenant → select/confirm table → menu → cart → notes → submit → server order number → kitchen → lifecycle → tenant isolation → Arabic/English/French`

### Required negative/security scenarios

- unauthenticated access;
- wrong role access;
- forged restaurant ID;
- stale localStorage restaurant ID;
- waiter identity spoofing;
- cross-tenant menu read;
- cross-tenant order creation;
- fake price/total;
- fake waiter ID/name;
- duplicate submission;
- empty cart;
- invalid quantity;
- unknown menu item;
- disabled/nonexistent restaurant;
- kitchen visibility isolation;
- lifecycle regression.

### Closure evidence

Phase 10 must not be marked closed from static checks alone. Closure requires browser/runtime evidence covering the complete flow plus targeted security tests and regression verification. The exact emulator/E2E harness should be selected at Gate 10.5 based on the repository's existing test infrastructure rather than adding a new framework prematurely.

## Phase 10 scope boundary

Phase 10 does not redefine Phase 9 pricing, order numbering, mutation authority, or lifecycle rules. It consumes those contracts. It does not introduce a payment gateway, new payment provider, or parallel order engine.
