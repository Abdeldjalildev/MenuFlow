# Phase 11 — Restaurant Operations & UX Deep Audit

## Audit / implementation status

**AUTHORIZED — IN PROGRESS — GATES 11.1 AND 11.2 IMPLEMENTATION AUTHORIZED**

Phase 11 is officially open. Gate 11.1 (Cart Persistence) and Gate 11.2 (Order UX & Feedback) are the only gates currently authorized for implementation in this work unit. Gates 11.3–11.5 remain planned and must not be started early.

The governing Phase 11 scope is: Restaurant Operations & UX. It must consume the established Phase 8 security model, Phase 9 order authority/integrity model, and Phase 10 waiter workflow. It must not introduce a second order engine or payment gateway.

## Architectural starting point

Current evidence shows:

- Customer restaurant/table context still uses URL/localStorage for UX context in `MenuProvider`; this is acceptable only as presentation context and must never become authorization.
- Waiter tenant identity is already claim-authoritative and should remain so.
- Order creation is server-authoritative through the canonical callable.
- Server pricing, order numbering, mutation identity, and order lifecycle are established upstream in Phase 9.
- Waiter orders enter the existing Kitchen order stream and lifecycle rather than a parallel workflow.
- Firestore direct browser order creation is disabled.
- Arabic/English/French support and Arabic RTL are already part of the waiter surface.

These are prerequisites for Phase 11, not targets for unnecessary redesign.

## Gate 11.1 — Cart Persistence

### Objective

Make customer cart restoration safe and predictable across reloads/navigation without allowing tenant, table, user, or stale-session leakage.

### Required behavior

1. Persist only the minimum cart state needed to restore a cart.
2. Key persisted state by authoritative UX context at minimum:
   - restaurant identity;
   - table identity where table ordering is applicable;
   - authenticated customer identity where available.
3. Never persist authoritative price or total values as trusted data.
4. On restore, revalidate menu item existence and current availability against the active restaurant.
5. Drop stale/unknown items rather than silently moving them to another restaurant.
6. Clear or partition state when restaurant/table context changes.
7. Prevent a previous customer's cart from appearing to another authenticated customer on the same device.
8. Define behavior after successful order submission and after an abandoned/stale cart.
9. Bound item count, quantity, note length, and serialized storage size.
10. Treat storage as recoverable UX state only; the server remains authoritative at submission time.

### Implementation contract

- Persist only `{ items: { [menuItemId]: quantity }, notes: { [menuItemId]: note } }`.
- Storage key must include a version, restaurant ID, table context, and authenticated Firebase UID.
- Cart state must not be restored until the authentication state is known; if no authenticated customer exists, no persisted customer cart is restored.
- Restored IDs are validated against the active restaurant menu. Invalid IDs are dropped and never migrated to another context.
- Quantity and note values are bounded before entering React state or storage.
- Storage is best-effort: quota/security errors do not break ordering.
- Successful canonical order submission clears the active persisted cart; recoverable submission failure leaves it intact.

### Security tests

- Restaurant A cart must not restore in Restaurant B.
- Table A cart must not silently restore for Table B.
- Customer A cart must not restore for Customer B on the same device.
- Tampered localStorage must not alter server tenant/pricing authority.
- Unknown menu IDs must be rejected or discarded safely.
- Persisted payload must not contain `price`, `total`, `unitPrice`, or other authoritative monetary fields.

## Gate 11.2 — Order UX & Feedback

### Objective

Provide clear, accessible, multilingual feedback for the order lifecycle without duplicating backend authority.

### Required behavior

1. Distinguish idle, submitting, success, validation error, authorization error, network/transport failure, and server rejection states.
2. Preserve cart contents after recoverable failures.
3. Avoid clearing the cart before the server confirms a successful canonical result.
4. Make duplicate-submit prevention visible and deterministic.
5. Present the server order number as the canonical confirmation identifier.
6. Explain lifecycle state changes without inventing client-side state transitions.
7. Preserve Arabic/English/French translations and Arabic RTL.
8. Provide accessible labels, focus behavior, keyboard operation, status announcements, and error association.
9. Avoid exposing raw Firebase/internal error details when a user-safe message is available.
10. Ensure feedback works on narrow/mobile layouts.

### Implementation contract

- Customer checkout and delivery submission use explicit UI state: `idle`, `submitting`, `success`, `validation-error`, `auth-error`, `network-error`, and `server-rejection`.
- Canonical `createOrder` returns the server order number; the customer UI displays that value after success.
- A stable mutation ID is sent for customer order creation so retries cannot intentionally create a second canonical order for the same submission.
- Cart clearing occurs only after the canonical callable resolves successfully.
- Recoverable failures leave cart and notes intact.
- Checkout/delivery controls are disabled while submitting and expose `aria-busy`/disabled semantics.
- Error presentation uses user-safe translated messages rather than raw Firebase exception text.
- Feedback is exposed through an accessible live/status region and error focus is moved to the feedback region after a failed submission.
- Existing `OrderTracking` remains the renderer of backend lifecycle state; no client-side lifecycle state machine is introduced.

### Tests

- Success and error state contract tests.
- Retry behavior after transport failure.
- No premature cart clearing.
- Multilingual string coverage.
- RTL semantic checks.
- Accessibility checks for form controls, alerts, status regions, and keyboard navigation.
- Canonical server order number is used in confirmation.
- Duplicate customer submission uses a stable mutation ID per attempt.

## Gate 11.3 — Menu Modifiers

### Objective

Introduce structured menu options/modifiers while preserving Phase 9 server-authoritative pricing.

### Required behavior

1. Define a canonical modifier schema and ownership relationship to the menu item.
2. Define modifier identity, name, optional grouping, selection constraints, and price delta.
3. Define whether a modifier is optional, required, single-select, or multi-select.
4. Define maximum selections and duplicate-selection rules.
5. Customer and waiter UIs may select modifiers but cannot define authoritative modifier prices.
6. Server validates every modifier ID against the restaurant's menu-item modifier catalog.
7. Server calculates modifier price effects and final totals.
8. Invalid, deleted, or cross-restaurant modifier IDs must fail closed.
9. Persist the canonical selected modifier snapshot needed for historical order interpretation.
10. Ensure append-to-order uses the same modifier validation/pricing contract.

### Current foundation

Phase 9's pricing engine already validates modifier IDs against a menu item's server-side modifier catalog and derives modifier prices server-side. Phase 11 should extend the UX/schema around that foundation rather than create another pricing mechanism.

### Tests

- Valid modifier selection.
- Invalid modifier ID.
- Cross-tenant modifier reference.
- Deleted modifier.
- Required modifier omitted.
- Too many selections.
- Duplicate selections where disallowed.
- Fake modifier price/total ignored.
- Append-to-order modifier validation and repricing.

## Gate 11.4 — Notifications & Operational Alerts

### Objective

Improve operational awareness while keeping infrastructure proportional to the current product and avoiding unnecessary external services.

### Required behavior

1. Define notification-worthy order events before implementing transport.
2. Prioritize restaurant-internal operational alerts first: new order, important order transition, and relevant inventory/waste conditions.
3. Avoid introducing push/email/SMS infrastructure unless the use case and current architecture justify it.
4. Prefer existing Firebase capabilities where they satisfy the requirement without weakening security.
5. Never expose privileged credentials or server secrets to browser code.
6. Tenant-scope every alert and recipient.
7. Avoid duplicate notifications on retried events.
8. Define whether alerts are durable, ephemeral, or acknowledgement-based.
9. Define retention/cleanup behavior for durable notification records.
10. Define failure behavior so notification failure cannot corrupt the canonical order lifecycle.

### Tests

- Tenant-isolated notification creation/read.
- Duplicate event suppression.
- Notification failure does not roll back a valid order transition unless explicitly required by the product contract.
- Staff-role eligibility.
- No cross-restaurant leakage.
- No secret exposure.

## Gate 11.5 — Operations Closure

### Objective

Prove that the customer and waiter workflows remain one coherent operational system.

### Required end-to-end contract

1. Customer or waiter creates a valid order.
2. Canonical server authority validates tenant, identity, items, modifiers, price, total, and numbering.
3. Order enters `pending`.
4. Kitchen receives it through the existing tenant-scoped order stream.
5. Kitchen transitions it through the established lifecycle.
6. Delivery/cashier authority performs the appropriate downstream transition.
7. Order reaches `completed` only through the established backend lifecycle.
8. Customer/waiter UX presents accurate feedback throughout.
9. Tenant isolation remains intact at every read/write boundary.
10. Arabic/English/French and RTL behavior remain intact.

### Closure evidence

- Phase 11 gate contract tests.
- Targeted Firestore/security tests.
- Runtime/emulator verification where backend behavior changes.
- Browser walkthrough for critical UX paths.
- Regression suite.
- Build/lint where affected.
- Explicit classification of any environmental blocker.

## Cross-gate dependency order

`11.1 Cart Persistence` must precede `11.2 Order UX & Feedback` where restored state affects submission/error behavior.

`11.3 Menu Modifiers` depends on the existing Phase 9 authoritative pricing contract and should be implemented before final operations closure.

`11.4 Notifications` depends on clearly defined lifecycle events and should not become a prerequisite for core ordering correctness.

`11.5 Operations Closure` consumes all preceding contracts and is the only Phase 11 closure gate.

## Risks that must not be silently turned into scope

- Rewriting `OrderProvider` solely for cleanliness is not automatically authorized.
- Replacing URL/localStorage public UX context with a new identity architecture is not automatically authorized.
- Adding a payment gateway is explicitly out of scope.
- Adding external notification infrastructure without a justified product requirement is out of scope.
- Large dependency upgrades are out of scope.
- Broad visual redesign is not implied by this phase.

## Acceptance philosophy

Every Phase 11 gate must distinguish **confirmed issue**, **risk**, and **recommendation**. Existing behavior must be inspected before modification. A static test is evidence of a source contract, not runtime proof. A gate becomes verified only after its required runtime evidence is available; the phase becomes CLOSED only after Gate 11.5 and the full required regression evidence are complete.
