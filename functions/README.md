# MenuFlow Firebase Functions

This directory contains the trusted server boundary for Firebase authorization claims.

## `provisionAuthzClaims`

The callable function `provisionAuthzClaims` is the only repository-owned mechanism intended to write the `role` and `restaurantId` custom claims used by Firestore Rules.

### Authorization contract

- Caller must be authenticated with Firebase Authentication.
- Caller must already have a valid signed `role` claim.
- A tenant `Admin` may provision only `Cashier`, `Kitchen`, or `Delivery` inside the caller's own `restaurantId`.
- A tenant `Admin` cannot provision `Admin` or `SuperAdmin` claims.
- Only an existing `SuperAdmin` may provision `SuperAdmin` claims.
- The target Firebase Auth account must already exist.
- The function writes claims with the Firebase Admin SDK; browser code never receives service-account credentials.
- Claim decisions are recorded in `authz_claim_audit` for operational traceability.

## Bootstrap and deployment

A first `SuperAdmin` cannot be created by this callable function because that would create a circular trust dependency. The initial bootstrap must therefore be performed through a separately controlled Firebase Admin/operations procedure, outside the browser.

Before production deployment:

1. Confirm the real Firebase project and deployment environment.
2. Install dependencies from this directory with its lockfile after generating/committing the lockfile with the intended npm version.
3. Deploy the function through the project's controlled Firebase deployment process.
4. Bootstrap the initial SuperAdmin through the controlled Admin procedure.
5. Verify that the resulting user receives a refreshed ID token containing the expected signed claims.
6. Only then perform the production Firestore Rules cutover.

Never place Admin SDK credentials or service-account keys in frontend code or committed files.
