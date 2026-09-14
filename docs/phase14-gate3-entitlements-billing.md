# Phase 14 Gate 14.3 — Plans, Entitlements & Billing Boundary

## Status

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

## Contract

Gate 14.3 establishes commercial vocabulary and a server-authoritative boundary without selecting or integrating a payment provider.

### Plans

- `starter`
- `growth`

### Subscription states

- `trialing`
- `active`
- `past_due`
- `grace_period`
- `canceled`
- `suspended`

Only `trialing`, `active`, and `grace_period` enable plan entitlements. The browser never decides this state.

### Trusted boundaries

- `getCommercialState`: Admin/SuperAdmin tenant-scoped read.
- `setCommercialState`: SuperAdmin-only authoritative state change.
- `requestCommercialChange`: Admin/SuperAdmin tenant-scoped request; it does not grant access.

Commercial state is stored under `restaurants/{restaurantId}/commercial/subscription` and is deliberately separate from orders, pricing and operational data.

## Billing-provider boundary

No Stripe, PayPal or other provider dependency is included. Provider selection is deferred until pricing policy, entitlement ownership, webhook idempotency and failure policy are approved.

## Verification

`npm run test:phase14:gate3`

Runtime evidence must verify unauthorized callers cannot mutate commercial state, tenant isolation is preserved, and entitlement changes are server-derived.
