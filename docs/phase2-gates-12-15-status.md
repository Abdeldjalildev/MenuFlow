# Phase 2 — Gates 12–15 Status

## Scope

This document records the Phase 2 security work that is actually evidenced in the repository. Gate numbers are mapped to the Phase 2 security objectives and confirmed findings in `AGENTS.md` rather than invented acceptance criteria.

## Gate 12 — Canonical role vocabulary and typed authorization boundary

**Status: IMPLEMENTED in the application authorization boundary.**

- `src/types/firestore.ts` defines the canonical role union and `STAFF_ROLES` list.
- `src/services/authClaims.ts` centralizes parsing of signed Firebase authorization claims.
- Invalid or missing roles are rejected instead of being normalized into a privileged role.
- Tenant roles require a string `restaurantId` claim; `SuperAdmin` is the only role without a tenant claim requirement.

## Gate 13 — Server-authoritative authentication/authorization source

**Status: IMPLEMENTED IN REPOSITORY; PRODUCTION DEPLOYMENT VERIFICATION STILL REQUIRED.**

Repository work completed in this pass:
- Added `functions/index.js` with a Firebase Functions v2 callable `provisionAuthzClaims`.
- The function uses the Firebase Admin SDK to write signed `role` and `restaurantId` custom claims.
- Unauthenticated callers are rejected.
- Invalid roles are rejected.
- Tenant roles require a non-empty `restaurantId`.
- Only an existing SuperAdmin may provision SuperAdmin claims.
- Tenant Admins may provision only Cashier/Kitchen/Delivery roles inside their own tenant.
- Cross-tenant provisioning is rejected.
- The target Firebase Auth account must exist before claims are changed.
- Claim decisions are recorded server-side in `authz_claim_audit`.
- `src/components/Admin/AddRestaurantModal.tsx` now keeps the administrator in the primary Auth session, creates the new owner through the secondary provisioning Auth instance, creates the restaurant record, and asks the trusted function to provision the new owner as `Admin` for that restaurant.
- Failure cleanup removes the restaurant document and provisioned Auth account where applicable.
- `src/firebase.ts` now exports the initialized Firebase app so the callable Functions client can share the configured project.
- Added `tests/auth-claims-provisioning.test.mjs` to prevent regression toward client-side claim authority.
- The normal `npm test` command includes the new Gate 13 regression suite.
- `firebase.json` now registers the `functions` source directory.
- `functions/README.md` documents bootstrap, deployment, and security constraints.

Important production boundary:
- The repository identifies the configured Firebase project as `menuflow-c02e5` in `src/firebase.ts`; the repository cannot prove that this is the intended production deployment solely from source code.
- The initial SuperAdmin remains an explicit bootstrap operation because allowing the callable itself to create the first SuperAdmin would create a circular trust dependency.
- The Functions dependency lockfile has not been generated in this repository yet. It must be generated with the intended npm/tooling before a production deployment is considered complete.
- A real deployment and real-user ID-token refresh/verification are still required before declaring the production trust boundary fully verified.

## Gate 14 — Authentication session isolation during provisioning

**Status: IMPLEMENTED.**

- `src/components/Admin/AddRestaurantModal.tsx` uses a named secondary Firebase App/Auth instance (`restaurant-provisioning`) to create the new restaurant account.
- The primary administrator Auth session is not used to create the new account.
- The provisioning session is explicitly signed out in `finally`.
- Failure cleanup attempts to remove the provisioned Auth account without signing out the administrator.
- Restaurant-document cleanup is also attempted when the provisioning workflow fails after the document is created.

## Gate 15 — Public customer write abuse/schema hardening

**Status: IMPLEMENTED IN THE TEST-ONLY TARGET RULESET; PRODUCTION CUTOVER PENDING.**

Implemented/expanded:
- Anonymous customer writes remain restricted to anonymous Firebase Auth in the intended target rules.
- Order tenant path and document tenant must agree.
- Customer identity is bound to `request.auth.uid`.
- Unknown order fields are rejected.
- Order status is restricted to `pending` at creation.
- Order cart size, table number, total amount, and selected contact fields have bounded validation.
- Order core field types are regression-tested, including non-list `items` and string `totalAmount` rejection.
- Review ratings/comments and complaint messages are bounded and validated.
- Review/complaint ownership continues to be checked against the authenticated customer's order.
- Additional regression coverage is in `tests/firestore-public-write-validation.test.mjs`.

Important limitation:
- Firestore Security Rules cannot generically enforce the type/schema of every member of an arbitrary list. The current target rules therefore validate the order's `items` field as a bounded list but do not pretend to fully validate every nested item without a schema redesign/backend mediation.
- The hardened rules remain in `tests/intended.firestore.rules`; production `firestore.rules` remains unchanged because the repository's full schema/caller migration and trusted-claims deployment verification are not yet complete. This is deliberate.

## Verification state

The last local run reported **21 tests passed, 0 failed** for the Firestore security suite. The new Gate 13 static regression suite requires a fresh local run after synchronization.

Required local verification before Phase 2 closure:

- `npm ci`
- `npm test`
- `npm run lint`
- `npm run build`
- `git diff --check`
- Functions dependency installation/build/deploy using the intended Firebase project
- Real authenticated-user claim verification after token refresh
- Production rules cutover only after schema/caller reconciliation

## Exact remaining Gate 13 work

1. Generate and commit `functions/package-lock.json` using the intended npm version.
2. Confirm `menuflow-c02e5` is the intended production Firebase project.
3. Deploy `functions/provisionAuthzClaims` through the controlled Firebase deployment process.
4. Perform the initial SuperAdmin bootstrap outside the browser through a controlled Admin operation.
5. Verify a real tenant owner receives `{ role: 'Admin', restaurantId: '<tenant>' }` in a refreshed ID token.
6. Verify a tenant Admin cannot provision Admin/SuperAdmin or cross-tenant claims.
7. Only after those checks, proceed to Gate 15 production Rules cutover.

## Golden rule applied

Secure first, preserve behavior, change incrementally, verify everything. No production Firestore rules were weakened or replaced merely to obtain green tests, no force-push/history rewrite was used, and no unrelated diagnostic files were committed.
