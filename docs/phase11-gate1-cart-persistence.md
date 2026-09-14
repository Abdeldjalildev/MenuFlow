# Phase 11 Gate 11.1 — Cart Persistence

## Status

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

## Scope

Gate 11.1 adds safe customer cart persistence without changing server authorization or pricing authority.

## Implementation

- Persisted cart state is versioned and scoped by restaurant ID, table context, and Firebase authenticated UID.
- Authentication state must be known before persisted customer cart state is restored.
- Persisted state contains only menu item IDs, quantities, and notes.
- Prices, totals, discounts, and other authoritative monetary fields are excluded from storage.
- Restored item IDs are revalidated against the active restaurant menu before entering cart state.
- Unknown/stale menu IDs are dropped.
- Quantity, item-count, note, and serialized-storage limits are enforced.
- Storage errors are non-fatal because localStorage is UX state only.
- `clearCart()` removes the active persisted cart and is called only after successful canonical order submission.
- Restaurant/table context remains existing UX context; it is not authorization.

## Evidence barrier

Static contract: `tests/phase11-gate1-cart-persistence.test.mjs`.

Required verification before closure:

1. `npm run test:phase11:gate1`
2. Targeted browser/reload walkthrough for restaurant/table/customer partitioning.
3. Regression suite after Gate 11.2 is complete.

A static PASS does not constitute runtime closure.

## Classification

- **Confirmed issue:** the cart was previously in-memory only, so reload/navigation could not restore cart state.
- **Risk addressed:** cross-restaurant/table/customer cart leakage and trust of persisted monetary data.
- **Recommendation:** retain storage as best-effort UX state and keep server authority unchanged.
