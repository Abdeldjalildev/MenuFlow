# Phase 2 — Gates 12–15 Status

## Scope

This document records the Phase 2 security work that is actually evidenced in the repository and by the latest local verification. Gate numbers are mapped to the Phase 2 security objectives and confirmed findings in `AGENTS.md` rather than invented acceptance criteria.

## Gate 12 — Canonical role vocabulary and typed authorization boundary

**Status: IMPLEMENTED in the application authorization boundary.**

- `src/types/firestore.ts` defines the canonical role union and `STAFF_ROLES` list.
- `src/services/authClaims.ts` centralizes parsing of signed Firebase authorization claims.
- Invalid or missing roles are rejected instead of being normalized into a privileged role.
- Tenant roles require a string `restaurantId` claim; `SuperAdmin` is the only role without a tenant claim requirement.

## Gate 13 — Server-authoritative authentication/authorization source

**Status: IMPLEMENTED IN REPOSITORY; PRODUCTION DEPLOYMENT VERIFICATION STILL REQUIRED.**

Repository work completed:
- `functions/index.js` exposes a Firebase Functions v2 callable `provisionAuthzClaims`.
- The function uses the Firebase Admin SDK to write signed `role` and `restaurantId` custom claims.
- Unauthenticated callers are rejected.
- Invalid roles are rejected.
- Tenant roles require a non-empty `restaurantId`.
- Only an existing SuperAdmin may provision SuperAdmin claims.
- Tenant Admins may provision only Cashier/Kitchen/Delivery roles inside their own tenant.
- Cross-tenant provisioning is rejected.
- The target Firebase Auth account must exist before claims are changed.
- Claim decisions are recorded server-side in `authz_claim_audit`.
- `AddRestaurantModal.tsx` keeps the administrator in the primary Auth session, uses a secondary provisioning Auth instance for the new owner, and delegates trusted claim assignment to the callable function.
- Failure cleanup removes the restaurant document and provisioned Auth account where applicable.
- `src/firebase.ts` exports the initialized Firebase app for the callable Functions client.
- `tests/auth-claims-provisioning.test.mjs` protects the trusted-claims boundary.
- `npm test` includes the Gate 13 regression suite.
- `firebase.json` registers the `functions` source directory.
- `functions/package-lock.json` is now present in the repository and has been successfully installed locally with `npm ci`.

Production boundary still outstanding:
- The repository identifies Firebase project `menuflow-c02e5` in `src/firebase.ts`, but source code alone does not prove that this is the intended production project.
- The initial SuperAdmin must remain an explicit controlled bootstrap operation.
- A real deployment of `provisionAuthzClaims` and a real-user ID-token refresh/verification have not been evidenced by repository state.
- The latest local Functions install reported an `EBADENGINE` warning because the local runtime is Node 24 while `functions/package.json` requires Node 20. The Functions code passed `node --check`, but production deployment verification should use the declared Node 20 runtime.

## Gate 14 — Authentication session isolation during provisioning

**Status: IMPLEMENTED.**

- `AddRestaurantModal.tsx` uses a named secondary Firebase App/Auth instance (`restaurant-provisioning`) to create the new restaurant account.
- The primary administrator Auth session is not used to create the new account.
- The provisioning session is explicitly signed out in `finally`.
- Failure cleanup attempts to remove the provisioned Auth account without signing out the administrator.
- Restaurant-document cleanup is also attempted when the provisioning workflow fails after the document is created.

## Gate 15 — Public customer write abuse/schema hardening

**Status: TARGET RULESET IMPLEMENTED; PRODUCTION CUTOVER BLOCKED BY SCHEMA/CALLER MIGRATION.**

The hardened target rules are regression-tested in `tests/intended.firestore.rules` and cover:
- anonymous Firebase Auth as the customer write identity;
- tenant binding between the authenticated request and the document path;
- customer ownership for reviews/complaints;
- strict field allowlists and bounded field sizes/types;
- order status restricted to `pending` at creation;
- bounded cart/table/total fields;
- review rating/comment validation;
- complaint message/status validation.

**Critical blocker discovered during Phase 2 closure verification:** the target rules test a nested schema such as `restaurants/{restaurantId}/orders/{orderId}`, while the current application `OrderProvider` still reads/writes top-level `orders/{orderId}` and derives customer identity from the browser-controlled `localStorage` key `menu_customer_id`. The same migration gap affects the customer review/complaint flow. Deploying the target rules as-is would therefore break legitimate customer writes and/or leave the current callers outside the intended authorization contract.

This is not a documentation-only issue. The remaining work requires a coordinated caller/data-path migration, including Firebase anonymous authentication for customer writes, followed by production Rules cutover and regression testing. No production Rules replacement should be performed before that migration is complete.

## Latest local verification

The latest local verification on `automation/ci-pipeline` established:

- `npm ci`: passed.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm test`: passed — 24 Firestore security tests and 10 auth-claims regression tests, 34 total, 0 failures.
- `functions/npm ci`: passed, with the Node 24 vs Node 20 engine warning noted above.
- `node --check functions/index.js`: passed.
- `git diff --check`: passed.

The build still reports non-blocking Vite warnings about ineffective Firebase dynamic imports and a large minified application chunk (~2.78 MB). These are Phase 3 performance concerns, not reasons to weaken the security boundary.

`npm audit --omit=optional` currently reports 10 vulnerabilities in the frontend dependency graph (5 moderate, 5 high), including a high-severity `react-router` advisory. `npm audit fix --force` must **not** be used blindly because npm reports that it would introduce a breaking `firebase-tools` downgrade. Dependency remediation should be handled as a controlled change rather than as an automatic Phase 2 closure step.

## Phase 2 closure decision

**Phase 2 is NOT CLOSED yet.** The repository has a substantially stronger security foundation, and the automated regression barrier is green, but a false "closed" status would be unsafe because:

1. Gate 13 still lacks production deployment and real-user claim verification evidence.
2. Gate 15's hardened target Rules use a data-path/identity contract that the current customer callers have not yet migrated to.
3. Production Rules have therefore intentionally not been cut over.
4. The current audit report contains high-severity dependency findings that require controlled remediation/acceptance.

## Exact next closure sequence

1. Keep the current green CI/security baseline unchanged.
2. Migrate customer order/review/complaint callers to Firebase anonymous Auth and the canonical tenant-scoped Firestore paths without changing user-visible behavior.
3. Expand the regression suite against the migrated caller contract.
4. Deploy `provisionAuthzClaims` using the declared Node 20 runtime and intended Firebase project.
5. Perform the controlled initial SuperAdmin bootstrap.
6. Verify refreshed real-user claims for a tenant owner and verify tenant-admin denial cases against the deployed callable.
7. Cut production Firestore Rules over only after the caller migration is proven compatible.
8. Run the complete regression barrier again.
9. Reassess the remaining npm audit findings and remediate/record accepted residual risk without `npm audit fix --force`.
10. Only then mark Phase 2 closed and open Phase 3 for selective refactoring/performance work.

## Golden rule applied

Secure first, preserve behavior, change incrementally, verify everything. No production Firestore rules were weakened or replaced merely to obtain green tests, no force-push/history rewrite was used, and no unrelated diagnostic files were committed.
