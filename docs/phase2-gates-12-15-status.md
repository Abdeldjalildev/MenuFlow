# Phase 2 — Gates 12–15 Status

## Current repository state

| Gate | Area | Status | Evidence |
|---|---|---|---|
| 12 | Security regression suite | **PASS** | Firestore 24/24 + auth claims 10/10 |
| 13 | Trusted Firebase claims | **IMPLEMENTED** | `functions/provisionAuthzClaims` + Node 20 runtime |
| 14 | Customer identity/path migration | **IMPLEMENTED** | Firebase Anonymous Auth + tenant-scoped orders/reviews/complaints |
| 15 | Rules cutover + production verification | **READY / PENDING EXECUTION** | Production workflow added; requires Firebase production credentials/secrets and a real restaurant ID |

## Customer migration

Customer identity no longer comes from `localStorage` or a generated browser ID. The application establishes Firebase Anonymous Auth and uses the signed Firebase UID as `customerId`.

Customer orders now use:

`restaurants/{restaurantId}/orders/{orderId}`

Reviews now use:

`restaurants/{restaurantId}/reviews/{reviewId}`

Complaints are authorized at the same tenant-scoped boundary:

`restaurants/{restaurantId}/complaints/{complaintId}`

Legacy top-level customer order/review/complaint writes are denied by production `firestore.rules`.

## Production cutover

A controlled GitHub Actions workflow is available at `.github/workflows/phase2-production-cutover.yml`.

It performs, in order:

1. Firebase Functions deployment for `provisionAuthzClaims`.
2. Production Firestore Rules deployment.
3. A real anonymous-auth canary order against the supplied restaurant.
4. Verification that the legacy top-level order write is rejected.
5. Cleanup of the canary order and anonymous user.

The workflow requires these GitHub Actions secrets:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_APP_ID`

The production restaurant ID is supplied as the workflow dispatch input `restaurant_id`.

## Closure rule

Phase 2 should only be marked **CLOSED** after the production workflow completes successfully. Repository-side implementation is complete; the remaining action is an authenticated production execution, not another code migration.
