# Phase 2 — Gates 12–15 Status

## Scope

This document records the Phase 2 security work that is actually evidenced in the repository. The repository does not contain a canonical numbered gate manifest for Gates 12–15, so gate numbers below are mapped to the Phase 2 security objectives and confirmed findings in `AGENTS.md` rather than invented acceptance criteria.

## Gate 12 — Canonical role vocabulary and typed authorization boundary

**Status: IMPLEMENTED in the application authorization boundary.**

- `src/types/firestore.ts` already defines the canonical role union and `STAFF_ROLES` list:
  - `SuperAdmin`
  - `Admin`
  - `Cashier`
  - `Kitchen`
  - `Delivery`
- `src/services/authClaims.ts` now centralizes parsing of the signed Firebase authorization claims.
- Invalid or missing roles are rejected by the helper instead of being normalized into a privileged role.
- Tenant roles require a string `restaurantId` claim; `SuperAdmin` is the only role without a tenant claim requirement.

## Gate 13 — Server-authoritative authentication/authorization source

**Status: PARTIAL / BLOCKED FOR FINAL CUTOVER.**

Implemented:
- `ProtectedRoute` no longer uses `localStorage.userRole` as its authorization source.
- Protected routes now require an active Firebase Auth session and a valid role from `getIdTokenResult()` claims.
- Missing/invalid claims fail closed and redirect to login.

Blocking condition:
- The repository still has no trusted backend/function implementation that provisions the `role` and `restaurantId` custom claims. `AGENTS.md` explicitly identifies this as a confirmed baseline issue.
- Therefore a production claim cutover cannot honestly be declared complete from repository-only evidence.

## Gate 14 — Authentication session isolation during provisioning

**Status: IMPLEMENTED.**

- `src/components/Admin/AddRestaurantModal.tsx` uses a named secondary Firebase App/Auth instance (`restaurant-provisioning`) to create the new restaurant account.
- The primary administrator Auth session is not used to create the new account.
- The provisioning session is explicitly signed out in `finally`.
- A failure path attempts cleanup of the newly created Auth user without signing out the administrator.

## Gate 15 — Public customer write abuse/schema hardening

**Status: IMPLEMENTED IN THE TEST-ONLY TARGET RULESET; PRODUCTION CUTOVER PENDING.**

- Anonymous customer writes remain restricted to anonymous Firebase Auth.
- Order tenant path and document tenant are required to agree.
- Customer identity is bound to `request.auth.uid`.
- Unknown order fields are rejected.
- Order status is restricted to `pending` at creation.
- Order cart size, table number, total amount, and selected contact fields now have bounded validation.
- Review ratings/comments and complaint messages are bounded and validated.
- Review/complaint ownership continues to be checked against the authenticated customer's order.
- New regression coverage is in `tests/firestore-public-write-validation.test.mjs`.

Important limitation:
- The hardened rules are intentionally in `tests/intended.firestore.rules`; production `firestore.rules` remains unchanged because the repository's schema/caller migration and trusted-claims provisioning are not yet complete. This is deliberate and follows the project engineering contract.

## Verification state

The last confirmed local run before these latest repository changes was:

- 17/17 Firestore security tests passed after fixing the reverse cross-tenant test case.
- Java 21 and `javac 21` are installed and available on PATH.

The latest GitHub-side changes have been committed directly to `automation/ci-pipeline`, but this environment cannot execute the user's local PowerShell/npm commands. The new expanded suite therefore requires one local `npm test`, plus `npm run lint` and `npm run build`, before this work can be called fully verified.

## Golden rule applied

Secure first, preserve behavior, change incrementally, verify everything. No production Firestore rules were weakened or replaced merely to obtain green tests, no force-push/history rewrite was used, and no unrelated diagnostic files were committed.
