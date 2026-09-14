# Phase 14 Gate 14.2 — Restaurant Onboarding & Tenant Lifecycle

## Status

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

## Canonical authority

Restaurant onboarding is now represented by one backend callable: `createRestaurant` in `functions/tenantOnboarding.js`.

The callable is intentionally **SuperAdmin-only** for this gate. Self-service restaurant creation is deferred until a separate policy and threat model authorize it.

## Provisioning sequence

1. authenticate caller;
2. require `SuperAdmin` role;
3. validate restaurant name and initial Admin UID;
4. verify the target Firebase user exists and is not already a SuperAdmin;
5. create the restaurant and its initial `admins/{adminUid}` membership in one Firestore transaction with `lifecycleState: provisioning`;
6. publish the Admin custom claims (`role: Admin`, `restaurantId`);
7. only after successful claim publication, move the restaurant to `lifecycleState: active`;
8. write an onboarding audit event.

Firebase Auth claim mutation cannot be part of a Firestore transaction. The explicit `provisioning` state therefore provides a recoverable boundary instead of pretending the whole sequence is atomic.

## Failure behavior

If claim publication fails, the implementation attempts a compensating transaction that deletes the newly created membership and restaurant. If that cleanup also fails, the tenant remains non-active and the diagnostic boundary records the failure; it is not reported as a successful active tenant.

If activation fails after successful claim publication, the callable returns an error rather than silently reporting success. This case requires operator reconciliation because the Auth claim is external to Firestore.

## Safe defaults

The gate establishes only defaults already required by the current analytics/operations model:

- currency: `DZD`;
- analytics currency: `DZD`;
- lifecycle state: `provisioning` → `active`.

No plan, entitlement, subscription, payment provider, grace period or billing dependency is introduced in Gate 14.2.

## Legacy-path boundary

Gate 14.2 does **not** silently migrate the previously inventoried legacy callers (`settings/{id}`, `restaurant_qr_config/{id}`, `waste_log/{id}`). Reconciliation requires production inventory, ownership evidence, reversible copy/verification, and an explicit cutover decision.

## Security boundary

- Client code is not granted restaurant-creation authority.
- Restaurant lifecycle state is server-authored.
- Initial Admin membership uses `restaurants/{restaurantId}/admins/{adminUid}`.
- The canonical order engine remains unchanged.
- Existing tenant role boundaries remain authoritative.

## Verification boundary

Required before closure:

- callable runtime test for authorized SuperAdmin;
- denial for non-SuperAdmin/unauthenticated callers;
- successful tenant + Admin provisioning;
- failed-claim/recovery behavior;
- active lifecycle transition only after successful claim publication;
- cross-tenant access denial for the newly provisioned Admin;
- no regression in existing order/analytics/security suites.
