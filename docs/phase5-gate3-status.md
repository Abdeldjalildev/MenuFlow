# Phase 5 — Gate 3 Status

## Gate

**Gate 3 — Customer Critical Path + Firestore Integration**

## Implementation state

**IMPLEMENTED — Firestore integration coverage added; execution intentionally deferred.**

Gate 3 now exercises the public customer-facing Firestore contract against the Firebase Emulator.

### Covered behavior

- Anonymous customer identity is represented by Firebase Auth anonymous claims in the rules test environment.
- Public menu documents remain readable.
- A customer can read only their own tenant-scoped order.
- Anonymous order creation requires the authenticated customer's UID and the target tenant path.
- Order tracking remains readable to the owning customer after a staff lifecycle change.
- Review creation requires ownership of the referenced order.
- Complaint creation requires ownership when an `orderId` is supplied.
- Cross-tenant order reads and writes are denied.
- Malformed and oversized customer writes remain denied.
- Legacy top-level customer order paths remain inaccessible.

## Important regression finding

`OrderProvider.appendToOrder()` performs a transactional direct update of `items` and `totalAmount`. The current `validOrderMutation` Firestore rule permits only lifecycle/claim/payment fields for order updates. Gate 3 therefore contains an explicit regression test proving that this current direct mutation is rejected by the security contract.

This is intentionally treated as a **real integration defect/finding**, not fixed by broadening the rules. The correct remediation requires a separate design decision about how appended customer items should be authorized and priced.

## Test entry point

- `npm run test:phase5:gate3`

## Golden-rule boundary

No Firestore rule was weakened and no application code was rewritten merely to make the test pass. The test records the existing security contract and exposes the mismatch for a later, explicitly approved fix.

## Verification state

**NOT YET VERIFIED.**

CI is intentionally not being evaluated gate-by-gate. Final CI verification remains scheduled after the complete Phase 5 batch.
