# Phase 11 Gate 11.3 — Menu Modifiers

**IMPLEMENTATION COMPLETE — VERIFICATION PENDING — NOT CLOSED**

## Scope delivered

- Canonical server-side modifier catalog schema: `id`, localized `name`, `groupId`, authoritative `price`, `required`, `multiple`, `minSelections`, `maxSelections`.
- Modifier IDs are resolved only against the selected restaurant's menu-item catalog.
- Client-supplied modifier prices are ignored.
- Duplicate modifier IDs are rejected.
- Group selection constraints are enforced server-side.
- Required selections are enforced server-side.
- Modifier price deltas are calculated server-side and included in authoritative subtotal/total calculation.
- Persisted order items contain the authoritative modifier snapshot needed for historical interpretation.
- Existing Phase 9 pricing/creation boundary remains the only order-pricing authority.

## Explicit boundary

This gate does not create a second pricing engine, second order engine, or payment mechanism.

## Verification

The static contract barrier is `tests/phase11-gate3-menu-modifiers.test.mjs`.

Runtime/emulator verification remains pending and must be run locally before this gate can be considered verified.
