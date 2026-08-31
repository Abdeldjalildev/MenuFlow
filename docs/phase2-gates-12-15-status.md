# Phase 2 — Gates 12–15 Status

## Scope

This document records the Phase 2 security work that is actually evidenced in the repository. The repository does not contain a canonical numbered gate manifest for Gates 12–15, so gate numbers below are mapped to the Phase 2 security objectives and confirmed findings in `AGENTS.md` rather than invented acceptance criteria.

## Gate 12 — Canonical role vocabulary and typed authorization boundary

**Status: IMPLEMENTED in the application authorization boundary.**

- `src/types/firestore.ts` defines the canonical role union and `STAFF_ROLES` list:
  - `SuperAdmin`
  - `Admin`
  - `Cashier`
  - `Kitchen`
  - `Delivery`
- `src/services/authClaims.ts` centralizes parsing of signed Firebase authorization claims.
- Invalid or missing roles are rejected by the helper instead of being normalized into a privileged role.
- Tenant roles require a string `restaurantId` claim; `SuperAdmin` is the only role without a tenant claim requirement.

## Gate 13 — Server-authoritative authentication/authorization source

**Status: PARTIAL / BLOCKED FOR FINAL PRODUCTION CUTOVER.**

Implemented in this gate pass:
- `src/pages/auth/Login.tsx` now obtains authorization only through `getAuthzClaims(user)` after Firebase sign-in.
- The hard-coded SuperAdmin email privilege branch has been removed.
- Login no longer derives `userRole` or `restaurantId` from Firestore documents.
- Login now fails closed and signs the user out when the signed Firebase claims are missing or invalid.
- Browser `localStorage` values are retained only as presentation/cache state; they are not used to grant access.
- `tests/auth-authorization-boundary.test.mjs` adds regression checks against reintroducing client-side role authority.
- `package.json` includes the authorization-boundary regression test in the normal `npm test` command.

Confirmed blocker:
- The repository still contains no trusted backend/function implementation that provisions the `role` and `restaurantId` custom claims. `AGENTS.md` explicitly identifies this as a confirmed baseline issue.
- Therefore a production claim cutover cannot honestly be declared complete from repository-only evidence. The next action is to establish and deploy the trusted claim-provisioning boundary with the real Firebase project/deployment constraints, then verify real authenticated users receive the claims.

## Gate 14 — Authentication session isolation during provisioning

**Status: IMPLEMENTED.**

- `src/components/Admin/AddRestaurantModal.tsx` uses a named secondary Firebase App/Auth instance (`restaurant-provisioning`) to create the new restaurant account.
- The primary administrator Auth session is not used to create the new account.
- The provisioning session is explicitly signed out in `finally`.
- A failure path attempts cleanup of the newly created Auth user without signing out the administrator.

## Gate 15 — Public customer write abuse/schema hardening

**Status: IMPLEMENTED IN THE TEST-ONLY TARGET RULESET; PRODUCTION CUTOVER PENDING.**

Implemented/expanded:
- Anonymous customer writes remain restricted to anonymous Firebase Auth.
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
- Firestore Security Rules cannot generically enforce the type/schema of every member of an arbitrary list. The current target rules therefore validate the order's `items` field as a bounded list but do not pretend to fully validate every nested item without a schema redesign/backend mediation. This limitation is explicitly acknowledged rather than hidden.
- The hardened rules are intentionally in `tests/intended.firestore.rules`; production `firestore.rules` remains unchanged because the repository's schema/caller migration and trusted-claims provisioning are not yet complete. This is deliberate and follows the project engineering contract.

## Verification state

Repository-side changes from this pass were committed directly to `automation/ci-pipeline` because the GitHub contents workflow commits file edits atomically. The local environment must still verify the resulting branch with:

- `npm ci` (or `npm install` followed by `npm ci` if lockfile synchronization requires it)
- `npm test`
- `npm run lint`
- `npm run build`
- `git diff --check`

The existing Firestore security suite previously passed 21/21 tests locally after the expanded public-write validation work. The new auth-boundary static regression suite and the newly added Gate 15 cases require a fresh local run.

## Gate 13 production blocker — exact remaining work

1. Confirm the actual Firebase project used for production.
2. Establish a trusted claim-provisioning mechanism (Firebase Admin SDK via an approved backend/function/deployment boundary).
3. Define who is allowed to assign each role and tenant claim; never allow arbitrary browser input to set privileged claims.
4. Provision `role` and `restaurantId` claims from trusted server-side data.
5. Force/verify ID-token refresh after provisioning where required.
6. Test real authenticated staff accounts against the production rules contract.
7. Only after those checks, migrate production `firestore.rules` from the legacy contract to the hardened target contract.

## Golden rule applied

Secure first, preserve behavior, change incrementally, verify everything. No production Firestore rules were weakened or replaced merely to obtain green tests, no force-push/history rewrite was used, and no unrelated diagnostic files were committed.
