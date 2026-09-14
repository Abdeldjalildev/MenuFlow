# Phase 9 — Gate 9.3: Canonical Order Creation

## Implementation status

**IMPLEMENTATION COMPLETE — VERIFICATION PENDING**

## Contract

Customer and waiter orders use the same server-side `createOrder` callable and the same authoritative pricing/numbering/persistence workflow. `orderSource` distinguishes provenance; it does not create a second order engine.

### Customer

- Firebase anonymous authentication is required.
- `customerId` is derived from `request.auth.uid`.
- `orderSource` is `customer` unless explicitly selecting the canonical waiter source.

### Waiter

- Authenticated `Waiter`, `Admin`, or `SuperAdmin` actor is required.
- A Waiter must have a `restaurantId` claim matching the target restaurant.
- An Admin must have an explicit membership at `restaurants/{restaurantId}/admins/{uid}`.
- `waiterId` and waiter display identity are derived from authenticated claims/UID, never trusted from client identity fields.

### Shared server authority

Both sources use the same:

1. restaurant existence validation;
2. menu-item tenant-path lookup;
3. authoritative pricing engine;
4. order-number transaction;
5. canonical order schema;
6. server timestamps and lifecycle initialization.

The client cannot provide authoritative price, total, order number, or creator identity.

## Scope boundary

Waiter UI/UX remains Phase 10. Gate 9.3 establishes the backend workflow required by that future UI without implementing a second waiter interface.
