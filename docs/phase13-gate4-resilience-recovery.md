# Phase 13 Gate 13.4 — Resilience, Recovery & Operational Safety

## Status

**IMPLEMENTED — DEEP-AUDITED — VERIFICATION PENDING — NOT CLOSED**

Gate 13.4 hardens the boundaries that must remain safe when dependencies fail, requests are retried, functions are replayed, or a deployment must be rolled back.

## Resilience boundaries

### 1. Canonical order creation

`canonicalOrderCreation.js` remains transaction-authoritative:

- order creation and order-number allocation occur in one Firestore transaction;
- `mutationId` is optional but, when supplied, creates a tenant-scoped receipt;
- a replay returns the original canonical result instead of creating another order;
- the receipt is bound to both `actorUid` and `orderSource`, preventing another actor from reusing the same mutation identifier;
- authoritative pricing is recalculated from the tenant menu catalog on the original execution.

No retry mechanism was added around the transaction. Firestore transaction retry behavior remains delegated to the SDK's transaction primitive rather than being duplicated in application code.

### 2. Operational notifications

Notifications are intentionally non-authoritative side effects:

- canonical order creation completes independently of notification delivery;
- notification creation is tenant-scoped;
- deterministic event IDs make repeated delivery attempts idempotent;
- notification failures are caught, diagnostically logged through the bounded Phase 13.2 boundary, and return `null` rather than corrupting the order lifecycle.

The order-transition trigger follows the same rule: lifecycle state remains authoritative and notification failure cannot roll back the order mutation.

### 3. Recovery and rollback

The repository does not claim an automated backup/restore system that is not present. Operational responsibility is explicitly bounded:

- Firestore backup/restore configuration must be owned by the deployment/operator environment;
- production restore procedures must be validated against the deployed project before launch;
- application rollback means redeploying a previously verified Git commit; no history rewrite or force-push is required;
- data migrations must remain reversible and separately verified before any destructive cutover;
- rollback of application code must not be represented as rollback of already committed production data.

### 4. Dependency failure policy

The implementation uses fail-closed behavior for authoritative validation and isolated failure for non-authoritative notifications. It does not introduce speculative queues, caches, or retry infrastructure without runtime evidence.

## Scope protection

Gate 13.4 does not add a payment gateway, external queue, backup vendor, database rewrite, dependency upgrade, or second order engine.

## Verification required

- static Gate 13.4 contract test;
- Phase 13 aggregate contract test;
- full project test suite;
- emulator/runtime evidence for idempotent replay and notification failure isolation;
- deployment/operator evidence for the actual backup/restore procedure before production closure.
