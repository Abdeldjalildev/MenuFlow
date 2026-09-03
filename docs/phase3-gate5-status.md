# Phase 3 Gate 5 — Security + Regression Verification

Status: **VERIFIED — CI regression/security suite passed**

## Verification matrix

- Gate 1 canonical tenant paths: merchant recipe/inventory runtime paths and menu publication are covered by dedicated regression checks.
- Order lifecycle: supported role-owned transitions exercised against the Firestore Emulator.
- Illegal transitions: rejected for operational roles.
- Role boundaries: cross-role lifecycle transitions rejected.
- Mutable-field restrictions: Kitchen, Cashier, and Delivery field tampering rejected.
- Delivery claim ownership: claim must bind `driverId` to the authenticated driver UID.
- Identity immutability: `restaurantId`, `customerId`, `createdAt`, and order items cannot be rewritten through staff order updates.
- Tenant isolation: cross-tenant order reads and writes rejected.
- Legacy boundary: top-level `orders/{orderId}` remains inaccessible.
- Inventory integrity contract: preparation requires deterministic recipe mapping; invalid/missing recipe data fails closed; insufficient stock aborts the transaction; the idempotency marker is set only within the transaction.
- Order-number integrity contract: tenant/day counters are transaction-backed and validated.

## CI evidence

The previously successful GitHub Actions run for the Gate 2–5 branch head reported:

- Firestore security regression suite: **24/24 passed**.
- Gate 4 regression suite: **5/5 passed**.
- Gate 5 regression/security suite: **11/11 passed**.
- Authorization/claims/production-cutover contract suite: **12/12 passed**.
- Lint: **passed**.
- TypeScript and production build: **passed**.
- Firebase Functions Node 20 validation: **passed**.
- `git diff --check`: **passed**.

The newly added Gate 1 regression is now part of the full `npm test` command. A new CI run is required to attach fresh green evidence to that addition; no new CI success is claimed until GitHub Actions completes it.

## Production boundary

This gate verifies the repository's security and regression boundary through the emulator and CI. It does not claim successful production Cloud Function execution. The previously recorded Firebase billing requirement still blocks the production cutover workflow, and that remains explicitly outside this verification claim.

A live high-contention production test must be performed only after production execution is enabled. Legacy production documents requiring migration remain a separate controlled operational task.
