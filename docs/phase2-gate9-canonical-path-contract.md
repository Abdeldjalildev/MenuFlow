# MenuFlow Phase 2 — Gate 9 Canonical Tenant-Path Contract

## Status

**Implementation baseline landed on `phase2/gate-9-contract-on-main`.**

This gate establishes the safe contract layer only. It does **not** claim that the application has completed customer caller migration or production Firestore hardening.

## Canonical rule

Tenant-scoped data must be addressed explicitly under:

`restaurants/{restaurantId}/{collection}/{documentId}`

The caller must provide a non-empty tenant identifier. The helper layer never falls back to localStorage, URL parameters, or a default tenant.

## Covered domains

- settings
- menu items
- categories
- QR configuration
- staff
- customers
- orders
- inventory
- recipes
- reviews
- complaints
- expenses
- suppliers
- stock takes
- waste logs

## Security boundary

The path helpers are a construction contract, not an authorization mechanism. Firebase Authentication claims and Firestore Security Rules remain authoritative.

## Remaining work

Gate 9 is still **partial** until production callers are migrated feature-by-feature. Gate 10 must migrate customer orders, reviews, and complaints together with authenticated customer identity. Gate 11 then hardens production rules against the canonical path and UID contract. Gate 12 is the final regression barrier.

## Golden rule

**Secure first. Preserve existing behavior. Change incrementally. Verify everything.**
