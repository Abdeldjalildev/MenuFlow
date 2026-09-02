# Phase 3 Gate 2 & Gate 3 Status

## Gate 2 — Authoritative Order State Machine

Status: **IMPLEMENTED — pending regression verification**

- Added a single server-side `transitionOrder` callable boundary.
- Defined the supported order lifecycle and rejected illegal transitions.
- Enforced tenant role permissions for Kitchen, Cashier, Delivery, Admin and SuperAdmin.
- Restricted direct Firestore order updates to lifecycle/driver/payment fields only.
- Preserved immutable `restaurantId`, `customerId`, and `createdAt`.
- The existing atomic driver-claim transaction remains in place.

## Gate 3 — Atomic + Idempotent Inventory

Status: **IMPLEMENTED — pending regression verification**

- Inventory deductions are performed inside the same Firestore transaction as the authoritative order transition into `preparing`.
- Recipe ingredients are resolved from the canonical tenant-scoped recipe path.
- Inventory is resolved from the canonical tenant-scoped inventory path.
- Multiple recipe lines targeting the same inventory item are aggregated before deduction.
- Insufficient stock aborts the transaction instead of partially applying deductions.
- `inventoryDeducted` is an order-level idempotency marker, checked inside the transaction so retries cannot deduct the same order twice.
- `appendToOrder` now uses a Firestore transaction to prevent lost updates.

## Explicitly deferred / not yet proven

1. Production execution of the new Cloud Function still requires the project's billing gate to be resolved.
2. Full emulator regression coverage for every Gate 2 transition/role matrix and Gate 3 concurrency/idempotency case is still required before calling the gates fully verified.
3. Legacy orders that do not contain `recipeId` on every order item cannot be guaranteed to receive ingredient deductions; this requires data migration or a deterministic menu-item-to-recipe mapping before that subset can be declared complete.
4. Concurrency-safe daily order-number generation remains Gate 4 and is intentionally not included here.
