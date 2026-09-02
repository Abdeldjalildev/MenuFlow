# Phase 3 Gate 4 — Concurrency-Safe Order Numbers & Atomic Order Mutations

Status: **VERIFIED — CI regression contract passed**

## Completed

- Removed client-side daily order-number derivation from `OrderProvider`.
- Added the server-authoritative `createOrder` callable for customer order creation.
- Daily order numbers are allocated inside a Firestore transaction.
- Counter documents are tenant-scoped under `restaurants/{restaurantId}/orderNumberCounters/{YYYY-MM-DD}`.
- A new calendar-day counter starts at order number `1`; the date key prevents the previous day's sequence from being reused.
- Counter state is validated before allocation; invalid state fails closed.
- Counter increment and order creation occur in the same Firestore transaction.
- The order stores both `orderNumber` and `orderNumberDate`.
- `appendToOrder` remains transaction-backed to prevent lost updates.
- Driver claiming remains transaction-backed and idempotent for retries by the same driver.
- Lifecycle updates remain behind the server-authoritative `transitionOrder` callable and its transaction.
- Gate 4 regression coverage verifies daily reset semantics, invalid counters, server-side allocation, and transactional mutation paths.

## Verification evidence

- GitHub Actions CI passed on the Gate 2–5 branch head.
- Firestore security regression suite: **24/24 passed**.
- Gate 4 regression suite: **5/5 passed**.
- Gate 5 regression/security suite: **11/11 passed**.
- Authorization/claims/production-cutover contract suite: **12/12 passed**.
- Lint: passed.
- TypeScript and production build: passed.
- Firebase Functions Node 20 validation: passed.
- `git diff --check`: passed in CI.

## Boundary

The automated evidence validates the transaction design and source contract. A separate live high-contention invocation test against deployed Cloud Functions was not performed because production execution remains subject to the previously recorded Firebase billing gate. No production success is claimed.
