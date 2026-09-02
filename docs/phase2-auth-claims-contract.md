# MenuFlow Phase 2 — Trusted Authentication Claims Contract

## Authority

Firebase Authentication is the identity authority. Firestore Security Rules are the final authorization authority. Browser storage, URL parameters, React state, and Firestore client queries are never authorization authorities.

## Required custom claims

### Restaurant staff

```json
{
  "role": "Admin | Cashier | Kitchen | Delivery",
  "restaurantId": "<canonical restaurant document id>"
}
```

### SuperAdmin

```json
{
  "role": "SuperAdmin"
}
```

A SuperAdmin must not require a tenant claim for explicitly cross-tenant administration.

## Rules requirements

For tenant-scoped operations:

- `request.auth != null` is mandatory;
- `request.auth.token.role` must be an approved role;
- `request.auth.token.restaurantId` must equal the restaurant path parameter;
- document `restaurantId` must equal the path tenant where the field exists;
- privileged identity fields must not be writable by ordinary staff.

## Client requirements

The frontend may cache non-sensitive display values for convenience, but those values must never decide:

- whether a route is accessible;
- which tenant is authorized;
- whether a user is an Admin/SuperAdmin;
- whether a write is allowed.

The ID token is the only client-readable authorization evidence used by protected UI code.

## Provisioning boundary

Custom claims must be provisioned by a trusted backend/admin environment, never by browser code. The repository currently has no trusted claim-provisioning backend; therefore Phase 2 must add that boundary before existing staff accounts are expected to work with the hardened client authorization path.

## Claim lifecycle

1. Trusted operator/backend assigns role and tenant membership.
2. Firebase issues the claims in the user's ID token.
3. Client refreshes the token when claims change.
4. Protected routes read claims and fail closed when claims are absent or invalid.
5. Firestore rules independently re-check the same claims.

## Failure behavior

Missing, malformed, or stale authorization claims must fail closed. The application must not infer privileged access from email addresses, staff documents, localStorage, query parameters, or any other client-controlled value.
