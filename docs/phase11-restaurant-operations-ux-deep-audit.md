# Phase 11 — Restaurant Operations & UX Deep Audit

## Audit / implementation status

**AUTHORIZED — IN PROGRESS — GATES 11.1–11.4 IMPLEMENTED — VERIFICATION PENDING**

Phase 11 is officially open. Gates 11.1–11.4 have now been implemented. Gate 11.5 remains the final operations closure gate and must not be started early.

The governing Phase 11 scope is: Restaurant Operations & UX. It consumes the established Phase 8 security model, Phase 9 order authority/integrity model, and Phase 10 waiter workflow. It must not introduce a second order engine or payment gateway.

## Gate 11.3 — Menu Modifiers

### Implementation result

- Canonical server-side modifier catalog supports identity, localized name, group, authoritative price delta, required/multiple selection semantics, and min/max selection bounds.
- Modifier IDs are resolved only against the active restaurant's menu-item catalog.
- Client-supplied modifier price values are not used for pricing.
- Duplicate selections, invalid IDs, excessive selections, and missing required selections fail closed.
- Authoritative modifier snapshots are persisted with order items.
- Existing Phase 9 `buildAuthoritativeOrder` remains the only pricing authority.

### Verification status

`tests/phase11-gate3-menu-modifiers.test.mjs` is the static contract barrier. Runtime/emulator verification is pending.

## Gate 11.4 — Notifications & Operational Alerts

### Implementation result

- Operational notification domain defines `new_order` and `order_transition` events.
- Durable notifications are tenant-scoped under `restaurants/{restaurantId}/notifications`.
- Trusted backend writer is duplicate-safe through deterministic event IDs.
- Browser code is read-only for notifications; direct notification creation is denied by Firestore rules.
- Tenant operators can read only their authorized restaurant's notifications.
- Canonical `createOrder` emits a `new_order` alert after successful order persistence; replayed idempotent submissions do not duplicate the alert.
- Notification failure is isolated from the canonical order result.
- No push/SMS/email infrastructure was introduced.

### Verification status

`tests/phase11-gate4-notifications.test.mjs` is the static contract barrier. Runtime/emulator verification is pending.

## Gate 11.5 — Operations Closure

Still **PLANNED — NOT AUTHORIZED**. It remains the only Phase 11 closure gate.

## Acceptance philosophy

Every Phase 11 gate must distinguish confirmed issue, risk, and recommendation. Existing behavior must be inspected before modification. A static test is evidence of a source contract, not runtime proof. A gate becomes verified only after its required runtime evidence is available; the phase becomes CLOSED only after Gate 11.5 and the full required regression evidence are complete.
