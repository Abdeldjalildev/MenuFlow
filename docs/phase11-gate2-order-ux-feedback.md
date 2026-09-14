# Phase 11 Gate 11.2 — Order UX & Feedback

## Status

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

## Scope

Gate 11.2 adds explicit, accessible, multilingual order submission feedback while preserving the canonical Phase 9 backend lifecycle.

## Implementation

- Customer checkout distinguishes idle, submitting, success, validation-error, auth-error, network-error, and server-rejection states.
- Recoverable submission failures preserve the cart and notes.
- Cart clearing happens only after the canonical `createOrder` callable succeeds.
- Customer order creation now sends a stable mutation ID per submission and returns the canonical server order number to the UI.
- Checkout and delivery controls are disabled during submission to prevent duplicate UI submissions.
- Firebase/internal errors are mapped to user-safe translated messages; raw internal exception messages are not rendered.
- Feedback is exposed through status/alert live regions and receives focus after state changes.
- Delivery fields have associated labels, autocomplete semantics, validation feedback, and keyboard-safe button behavior.
- Arabic/English/French feedback strings are defined.
- Existing `OrderTracking`/`OrderStatus` remains the lifecycle renderer; the customer UI does not manufacture authoritative order statuses.

## Evidence barrier

Static contract: `tests/phase11-gate2-order-ux-feedback.test.mjs`.

Required verification before closure:

1. `npm run test:phase11:gate2`
2. Browser/runtime walkthrough for success, retryable failure, server rejection, narrow/mobile layout, and Arabic/English/French behavior.
3. Regression suite after Gate 11.2 is complete.

A static PASS does not constitute runtime closure.

## Classification

- **Confirmed issue:** customer submission had no explicit UI-level submission/error state contract and `createOrder` exposed no typed canonical result to the UI.
- **Risk addressed:** premature cart clearing, duplicate submission, inaccessible feedback, raw internal error leakage, and UI/backend lifecycle divergence.
- **Recommendation:** keep lifecycle authority in the existing backend transition/order stream and avoid a second client-side order state machine.
