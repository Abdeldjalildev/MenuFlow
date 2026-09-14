# Phase 9 — Deep Audit

## Executive result

Phase 9 was reviewed end-to-end across the order domain, pricing authority, creation boundary, mutation boundary, Firestore rules, frontend callers, lifecycle authority, order numbering, inventory interaction, CI coverage, and the planned Phase 10 dependency surface.

The audit found and corrected four material Phase 9 integrity gaps:

1. **Direct browser order creation remained possible through Firestore rules.** It is now disabled; canonical callable creation is the only supported browser creation path.
2. **Frontend append and driver-claim helpers still contained direct Firestore mutation paths.** They now call the secure backend mutation boundary.
3. **Appending after inventory deduction could create an order/inventory mismatch.** Append is now rejected once inventory has been deducted.
4. **Append lacked retry/idempotency protection.** A bounded mutation ID and per-order mutation receipt are now required for append.

A fifth correctness issue was also found in the customer UI: the UI applied/displayed a client-side discount while the Phase 9 server pricing contract intentionally ignored client discount authority. The customer checkout was aligned with the current server contract so the UI no longer presents a discounted client total that differs from the persisted server total.

## Gate-by-gate audit

### Gate 9.1 — Order Domain Normalization

**Current state:** implemented; static contract exists; runtime closure still pending.

Verified architecture:

- canonical `price`;
- canonical `quantity`;
- canonical `totalAmount`;
- legacy aliases normalized at the boundary;
- `TrackDone` normalized to `completed` in the order domain/provider.

Additional UI cleanup removes a remaining `TrackDone` check from customer active-order selection.

### Gate 9.2 — Server-Authoritative Pricing

**Current state:** implemented; static contract exists; runtime closure still pending.

Verified architecture:

- menu documents are read from the target restaurant path;
- item price comes from the authoritative menu document;
- client `price`, `unitPrice`, `originalPrice`, total, and discount inputs do not determine the persisted total;
- modifiers are validated against the server menu catalog and priced from that catalog;
- subtotal and total are calculated server-side;
- discount authority is currently zero until an explicit restaurant discount policy is defined.

### Gate 9.3 — Canonical Order Creation

**Current state:** implemented; static contract exists; runtime closure still pending.

Verified architecture:

- one callable creation implementation serves customer and waiter sources;
- customer identity comes from authenticated anonymous Firebase identity;
- waiter identity comes from authenticated claims/UID;
- waiter tenant access uses the trusted restaurant claim;
- Admin tenant access uses explicit membership;
- restaurant existence is verified;
- menu items are read from the target tenant;
- order numbering is server-side and transactional;
- persisted order provenance is explicit.

The production Functions entry point replaces only the exported `createOrder` with the canonical implementation while preserving the existing lifecycle authority in `index.js`.

### Gate 9.4 — Order Mutation Security

**Current state:** implemented; static contract exists; runtime closure still pending.

Verified mutation boundary:

- `driver_claim`;
- `driver_assign`;
- `item_append`;
- `payment_flag`;
- `note_add`.

The existing `transitionOrder` remains responsible for lifecycle transitions and inventory effects.

### Gate 9.5 — Order Integrity Closure

**Current state:** implementation complete; verification pending.

The closure contract now covers:

- customer ordering;
- waiter ordering;
- server-authoritative pricing;
- fake restaurant IDs;
- forged waiter/driver identity;
- transactional numbering;
- direct Firestore order creation;
- duplicate append mutation;
- illegal append after inventory deduction;
- lifecycle authority;
- payment state restrictions;
- concurrent-sensitive mutations.

## Security boundary review

### Tenant identity

Creation and mutation code derives or validates restaurant scope server-side. URL/localStorage restaurant context remains a client UX concern and does not grant backend authority.

### Actor identity

Customer identity is the authenticated anonymous UID. Waiter identity is the authenticated UID. Driver claim identity is the authenticated UID. Assigned drivers are checked through Firebase Admin Auth for role and matching restaurant claim.

### Pricing

No client price is authoritative. The server reads menu prices and modifier catalogs from the target restaurant.

### Order numbering

The counter is inaccessible to browser clients and is incremented in the same transaction as order creation.

### Mutation concurrency

Order mutation operations read and update the order inside Firestore transactions. Driver claim and payment confirmation have state guards. Append additionally uses a mutation receipt to prevent a retried mutation from applying twice.

### Inventory

Because inventory is deducted during the existing lifecycle transition, appending after `inventoryDeducted` is now rejected instead of silently changing the financial order without the corresponding inventory effect.

## Frontend authority review

The customer `OrderProvider` previously contained direct Firestore implementations for append and driver claim. Those were duplicate mutation authorities and could drift from the backend contract. They now call `mutateOrder`.

Customer checkout still prepares display/domain data locally, but the submitted order no longer includes a client-authoritative total. The backend remains the source of truth.

## Firestore rules review

The order collection no longer accepts direct browser creation. This removes the previously identified second customer order-creation path.

Operational order updates remain restricted by role, tenant claim/membership, and the existing state-machine rules. The browser cannot write order-number counters.

## CI / verification review

Phase 9 gate commands were added and `test:phase9:all` now runs all five gate contracts. The main regression command also includes `test:phase9:all`, and the Functions CI job validates syntax for all Phase 9 backend modules.

This repository-level audit cannot claim runtime PASS without executing the emulator tests on a verification environment. In particular, the canonical Functions entry point and transaction behavior require runtime evidence.

## Remaining verification work

Before declaring Phase 9 **CLOSED**, run in order:

1. `npm run test:phase9:gate1`
2. `npm run test:phase9:gate2`
3. `npm run test:phase9:gate3`
4. `npm run test:phase9:gate4`
5. `npm run test:phase9:gate5`
6. `npm run test:phase9:all`
7. `npm test`
8. Runtime emulator/security coverage for canonical customer/waiter creation and secure mutation operations.

Any failure must be classified before modification. The historical Firebase discovery investigation remains closed unless a new reproducible failure provides evidence that its prior conclusion no longer holds.

## Phase 9 closure decision

**IMPLEMENTATION COMPLETE — NOT YET CLOSED.**

The code-level audit found no remaining high-confidence Phase 9 defect requiring another architectural change after the fixes recorded above. Runtime verification is the remaining closure gate.
