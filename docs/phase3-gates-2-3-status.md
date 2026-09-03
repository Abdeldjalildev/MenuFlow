# Phase 3 Gate 2 & Gate 3 Status

## Gate 2 — Authoritative Order State Machine

Status: **VERIFIED — repository implementation and regression/security coverage passed.**

- Added a single server-side `transitionOrder` callable boundary.
- Defined the supported order lifecycle and rejected illegal transitions.
- Enforced tenant role permissions for Kitchen, Cashier, Delivery, Admin and SuperAdmin.
- Restricted direct Firestore order updates to lifecycle/driver/payment fields only.
- Preserved immutable `restaurantId`, `customerId`, `createdAt`, and order identity fields.
- The driver claim path remains transaction-backed and ownership-bound.
- Gate 5 exercises the supported role-owned transitions and rejects illegal/cross-role mutations.

## Gate 3 — Atomic + Idempotent Inventory

Status: **VERIFIED — repository implementation and regression/security contract coverage passed.**

- Inventory deductions are performed inside the same Firestore transaction as the authoritative order transition into `preparing`.
- Recipe ingredients are resolved from the canonical tenant-scoped recipe path.
- Inventory is resolved from the canonical tenant-scoped inventory path.
- Multiple recipe lines targeting the same inventory item are aggregated before deduction.
- Insufficient stock aborts the transaction instead of partially applying deductions.
- Every order item must reference a recipe before preparation; missing recipe data fails closed.
- `inventoryDeducted` is an order-level idempotency marker checked inside the transaction so successful retries cannot deduct the same order twice.
- `appendToOrder` uses a Firestore transaction to prevent lost updates.
- Gate 5 protects the inventory transaction/idempotency contract against regression.

## Verification evidence

The successful GitHub Actions run for the current Gate 2–5 branch head passed:

- Firestore security regression suite: **24/24 passed**.
- Gate 4 regression suite: **5/5 passed**.
- Gate 5 regression/security suite: **11/11 passed**.
- Authorization/claims/production-cutover contract suite: **12/12 passed**.
- Lint: **passed**.
- TypeScript and production build: **passed**.
- Firebase Functions Node 20 validation: **passed**.
- `git diff --check`: **passed**.

Gate 1 now also has dedicated canonical-path regression coverage and is included in the full test suite.

## Production boundary

The repository implementation and emulator/CI security contracts are verified. Production Cloud Function execution is **not** claimed because the previously recorded Firebase billing gate remains unresolved. A live high-contention production test is therefore still pending and must be performed only after production execution is enabled.

Legacy production orders that lack deterministic recipe references may require a controlled data migration/backfill. That is a production-data operation, not a reason to weaken the fail-closed repository contract.
