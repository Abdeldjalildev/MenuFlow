# Phase 5 — Gate 2 Status

## Gate

**Gate 2 — Critical Order Workflow Integration**

## Implementation state

**IMPLEMENTED — integration suites added; execution intentionally deferred.**

Gate 2 now has executable Firebase Emulator-backed coverage for the server-authoritative order workflow.

### Covered behavior

- `createOrder` creates a tenant-scoped pending order.
- Daily order numbers are allocated by the callable and verified through the resulting Firestore document.
- Illegal lifecycle transitions are rejected by the callable.
- Role-incompatible transitions are rejected by the callable.
- Preparation performs recipe/inventory validation and deducts stock atomically with the order transition.
- Insufficient inventory fails closed and leaves both order and inventory unchanged.
- Missing recipes and missing recipe references fail closed.
- Concurrent order creation verifies unique daily order numbers `[1..5]` under the emulator.
- Concurrent driver claim behavior is covered separately against the Firestore security contract using transaction-backed clients.

## Test entry points

- `npm run test:phase5:gate2`
- `npm run test:phase5:gate2:driver`

Gate 2 uses the Auth, Firestore, and Functions emulators for callable workflow tests. Driver-claim concurrency uses the Firestore emulator and the repository's production rules.

## Golden-rule boundary

No application lifecycle code, inventory logic, order-number implementation, or Firestore authorization rule was changed to make these tests pass. The tests exercise the existing contracts.

## Deferred findings recorded during Gate 2

### 1. Client-supplied order total is not independently reconciled

`functions/index.js` calculates an order total but currently accepts a supplied `totalAmount` without requiring it to equal the calculated value. This is an integrity hardening opportunity. It is **not changed in Gate 2** because it is outside the already-approved Phase 5 Gate 2 implementation contract and should be handled as a separately approved integrity task if retained after broader workflow review.

### 2. Production verification remains unavailable

These tests target local Firebase emulators. They do not constitute production deployment verification. The production Firebase deployment blocker from Phase 4 remains separately documented.

## Verification state

**NOT YET VERIFIED.**

Per the current workflow, CI is intentionally not being evaluated after each gate. Final CI verification will be performed after the complete Phase 5 gate batch is implemented.
