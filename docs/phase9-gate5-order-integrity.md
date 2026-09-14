# Phase 9 — Gate 9.5: Order Integrity Closure

## Implementation status

**IMPLEMENTATION COMPLETE — AWAITING LOCAL TEST VERIFICATION — NOT CLOSED**

## Closure contract

Gate 9.5 closes the remaining integrity gaps across the Phase 9 order domain:

- Customer and waiter creation converge on `canonicalOrderCreation.createOrder`.
- Menu price, modifier price, subtotal, discount, total, tenant identity, actor identity, and order number are server-authoritative.
- Direct browser creation of `/restaurants/{restaurantId}/orders/{orderId}` is disabled; order creation is callable-only.
- Order-number counters remain inaccessible to browser clients and are updated transactionally by the backend.
- Frontend order mutation helpers no longer perform direct Firestore transactions for append/driver claim; they call the secure backend mutation boundary.
- Driver claim derives driver identity from authenticated identity rather than client input.
- Driver assignment verifies the target Firebase user has the Delivery role and matching restaurant claim.
- Append operations are transactionally repriced from authoritative menu data and cannot run after inventory has already been deducted.
- Append operations require a bounded `mutationId` and persist a per-order mutation receipt so a retried request cannot append the same mutation twice.
- Payment confirmation remains restricted to payment-ready states and records the confirming actor server-side.
- `transitionOrder` remains the lifecycle/inventory authority and continues to enforce the existing state machine.

## Verification matrix

The Gate 5 contract test covers 12 integrity/security assertions. Runtime emulator verification remains required before Phase 9 can be marked **CLOSED**.

## Scope boundary

No payment gateway was added. Gate 9.5 itself did not implement Phase 10; Phase 10 was opened separately after the Phase 9 implementation audit.
