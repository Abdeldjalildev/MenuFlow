# MenuFlow Phase 2 — Gates 7–12 Execution Track

This document extends the original Phase 2 remediation plan without changing its security principles or silently redefining earlier gates.

## Golden rule

**Secure first. Preserve existing behavior. Change incrementally. Verify everything.**

A gate is not marked complete merely because a client-side workaround exists. Security-sensitive gates require a trusted authority, regression evidence, and a clean verification path.

## Gate 7 — Trusted custom-claims provisioning

**Objective:** provide a trusted server-side mechanism that assigns and revokes MenuFlow `role` and `restaurantId` custom claims.

**Required contract:**

- `SuperAdmin | Admin | Cashier | Kitchen | Delivery` only.
- Restaurant staff must have a non-empty `restaurantId` claim.
- SuperAdmin does not receive a tenant claim unless a server-side operation explicitly requires one.
- Claims are written only by trusted backend/admin tooling.
- Browser code never assigns its own privileged claims.
- Revocation and role changes must invalidate/reissue the user's ID token.

**Status: BLOCKED / NOT COMPLETE.**

The repository currently has no evident trusted claim-provisioning backend or deployment configuration. Implementing one without first establishing the deployment boundary would invent infrastructure and could create an unsafe false sense of authorization. The frontend contract is already defined and consumes trusted claims fail-closed.

## Gate 8 — Unified frontend authorization boundary

**Objective:** centralize trusted claim parsing and ensure protected UI authorization uses Firebase ID-token claims only.

**Implemented:**

- Added `src/services/authz.ts`.
- Centralized the canonical role vocabulary.
- Centralized trusted claim validation.
- Required `restaurantId` for all restaurant staff roles.
- Kept SuperAdmin tenantless by default.
- Updated `ProtectedRouteProps.tsx` to consume the centralized trusted-claims parser.
- Removed the duplicated role-destination logic from the route guard.

**Status: COMPLETE for the frontend boundary.**

This does not replace Firestore authorization; rules remain the final security boundary.

## Gate 9 — Canonical tenant-path access contract

**Objective:** make tenant-scoped paths explicit and prevent security-sensitive callers from silently deriving a tenant from mutable browser state.

**Implemented:**

- Added `src/services/firestorePaths.ts`.
- Added explicit helpers for restaurant, collection, and document paths.
- Added canonical helpers for settings, menu items, categories, QR config, staff, customers, orders, inventory, recipes, reviews, complaints, expenses, suppliers, stock takes, and waste logs.
- Helpers reject empty tenant/document identifiers rather than falling back to a default tenant.

**Status: PARTIAL / CONTRACT COMPLETE, CALLER MIGRATION PENDING.**

The helper layer is safe to adopt incrementally. Existing legacy callers must be migrated feature-by-feature before production rules are tightened.

## Gate 10 — Customer write migration

**Objective:** migrate customer order/review/complaint writes as one trust-boundary family to canonical tenant paths and Firebase-authenticated customer identity.

**Required invariants:**

1. Customer identity comes from Firebase Authentication.
2. Anonymous customers use Firebase Anonymous Auth where enabled.
3. The Firestore path supplies the tenant boundary.
4. The stored `restaurantId` must equal the path tenant.
5. The stored `customerId` must equal the authenticated UID.
6. Customer-created documents cannot set privileged fields.
7. Customer-created orders cannot be updated/deleted by the customer when the product contract requires immutability.
8. Reviews and complaints must prove ownership of any referenced order.

**Status: NOT COMPLETE.**

The current production customer flow still contains legacy top-level writes and browser-generated customer IDs. Tightening production rules before migrating those callers would break legitimate behavior, while leaving the rules permissive would leave the confirmed trust-boundary defect unresolved. This gate therefore requires a coordinated caller + rules + emulator-test change.

## Gate 11 — Production Firestore rule hardening

**Objective:** align production rules with the canonical tenant/identity contract after the affected callers have been migrated.

**Required work:**

- Replace customer field-only tenant trust with path-based tenant authorization.
- Bind customer writes to Firebase Auth UID.
- Restrict privileged fields and immutable identity fields.
- Enforce staff role + tenant claims on every tenant-scoped operation.
- Keep explicit SuperAdmin cross-tenant permissions.
- Preserve legacy data as recoverable during migration.
- Add emulator regression coverage before deployment.

**Status: NOT COMPLETE / DEPENDENT ON GATES 7, 10.**

The checked-in production rules are intentionally not changed in this execution slice because the repository still lacks the trusted claims provisioning path and canonical customer caller migration required to make the stricter rules safe to deploy.

## Gate 12 — Phase 2 regression and release barrier

**Objective:** prove the completed security migration before Phase 3 refactoring begins.

**Required checks:**

- Full Firestore Emulator security suite passes.
- Customer tenant/UID regression tests pass.
- Staff tenant/role regression tests pass.
- Driver claim race/replay tests pass.
- Inventory idempotency tests pass.
- `npm run lint` passes.
- `npm run build` passes.
- `git diff --check` passes.
- No secrets are introduced.
- No browser-controlled field is used as authorization evidence.
- Migration remains reversible and documented.

**Status: NOT COMPLETE.**

Gate 12 cannot be honestly marked complete until Gates 7, 10, and 11 are complete and their regression evidence exists.

## Execution ledger

| Gate | Area | Status | Blocking dependency |
| --- | --- | --- | --- |
| 7 | Trusted custom-claims provisioning | **Blocked** | Trusted backend/deployment boundary |
| 8 | Frontend trusted authorization boundary | **Complete** | None for frontend contract |
| 9 | Canonical tenant-path helpers | **Partial** | Caller migration |
| 10 | Customer order/review/complaint migration | **Pending** | Gate 7 + coordinated caller/rules work |
| 11 | Production Firestore hardening | **Pending** | Gates 7 + 10 + emulator proof |
| 12 | Full Phase 2 regression barrier | **Pending** | Gates 7–11 |

## Explicitly preserved

- No production `firestore.rules` weakening.
- No localStorage-based authorization.
- No hard-coded SuperAdmin identity.
- No production data deletion.
- No broad UI redesign.
- No unrelated dependency upgrade.
- No CI weakening.
- No feature expansion ahead of the security contract.
