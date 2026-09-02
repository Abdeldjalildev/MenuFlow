# Phase 3 Gate 4 — Concurrency-Safe Order Numbers & Atomic Order Mutations

Status: **IMPLEMENTED — regression verification pending**

## Completed

- Removed client-side daily order-number derivation from `OrderProvider`.
- Added the server-authoritative `createOrder` callable for customer order creation.
- Daily order numbers are allocated inside a Firestore transaction.
- Counter documents are tenant-scoped under `restaurants/{restaurantId}/orderNumberCounters/{YYYY-MM-DD}`.
- A new calendar-day counter starts at order number `1`; the date key prevents the previous day's sequence from being reused.
- Counter state is validated before allocation; invalid counter state fails closed.
- Counter increment and order creation occur in the same Firestore transaction, preventing a successful order from being created without consuming its allocated number and preventing two successful transactions from committing the same number.
- The order stores both `orderNumber` and `orderNumberDate`.
- `appendToOrder` remains transaction-backed to prevent lost updates.
- Driver claiming remains transaction-backed and idempotent for retries by the same driver.
- Lifecycle updates remain behind the server-authoritative `transitionOrder` callable and its transaction.
- Added a Gate 4 regression contract covering daily reset semantics, invalid counters, server-side allocation, and transactional mutation paths.

## Verification boundary

- Automated Gate 4 contract tests are wired into `npm test` through `test:phase3:gate4`.
- Full runtime emulator verification of concurrent callable invocations is still a separate verification step; it is not represented as passed by this document.
- Production execution of Cloud Functions remains subject to the previously recorded Firebase billing gate.

## Deferred without blocking the roadmap

If runtime/emulator infrastructure prevents full concurrency execution, record the blocker and continue to the next approved gate. Do not replace missing evidence with a false "verified" status.
