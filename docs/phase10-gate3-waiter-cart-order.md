# Phase 10 Gate 3 — Waiter Cart & Customer Order

## Status

**IMPLEMENTATION COMPLETE — VERIFICATION PENDING**

## Contract

The waiter flow requires a valid, explicitly confirmed table before submission. Cart submission sends canonical menu item IDs, quantities, and bounded per-item notes; client-side prices and totals are not accepted as authority.

A stable `mutationId` is generated for a waiter submission and retained after a transport/application failure. The canonical backend stores a tenant-scoped mutation receipt atomically with the order and returns the existing result on a retry. Receipts are bound to the authenticated actor and order source so a different actor cannot reuse another actor's mutation ID.

The UI clears the cart only after receiving and validating the server order number. A failed request does not silently clear the cart or rotate the retry identity.

## Verification

- Static contract: `npm run test:phase10:gate3`
- Runtime verification: pending local execution

Static PASS is not Phase 10 closure; Gate 10.5 remains the final E2E closure gate.
