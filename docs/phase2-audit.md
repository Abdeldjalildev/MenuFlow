# MenuFlow Phase 2 — Security & Architecture Audit

Date: 2026-09-01
Branch: `phase2/closure-hardening`
Baseline: `automation/ci-pipeline` at `1be65b9`

## Executive result

The Phase 2 baseline is technically healthy at the repository level: TypeScript/build, lint, Firestore rules regression tests, authorization-claims regression tests, and Functions syntax validation pass locally.

Phase 2 is **not yet honestly closable** from repository changes alone. Two production-boundary gates remain:

1. Production deployment and verification of `provisionAuthzClaims`.
2. Customer caller/data-path migration from browser-generated IDs and top-level collections to Firebase Anonymous Auth plus canonical tenant-scoped paths.

Closing the phase before those gates would create a false security completion signal.

## Findings

### Authentication and authorization

- Protected staff routes now derive the role from Firebase signed ID-token claims through `getAuthzClaims`.
- Client `localStorage.userRole` is no longer an authorization source.
- Claim provisioning is server-side and rejects unauthenticated callers, invalid roles, cross-tenant requests, and tenant-admin attempts to manage privileged roles.
- SuperAdmin claims intentionally require an existing SuperAdmin caller; the initial bootstrap remains an operations step.

### Firestore tenant isolation

The hardened target model is represented by `tests/intended.firestore.rules` and uses:

- `restaurants/{restaurantId}/...` as the canonical tenant boundary.
- `request.auth.token.restaurantId` for staff authorization.
- Firebase Anonymous Auth UID as the customer identity.
- Strict field allowlists and type/size validation for customer-created orders, reviews, and complaints.
- Immutable tenant/customer identity fields on protected updates.

The production `firestore.rules` file still contains legacy top-level customer write paths. It must not be replaced with the hardened target rules until the client migration is complete.

### Customer trust boundary

The current customer flow still uses `localStorage.menu_customer_id` and top-level `orders`, `reviews`, and `complaints` paths. This is the primary remaining high-risk application migration.

The required target is:

- sign the customer into Firebase Anonymous Auth;
- use `request.auth.uid` as the customer identity;
- write orders to `restaurants/{restaurantId}/orders/{orderId}`;
- write reviews to `restaurants/{restaurantId}/reviews/{reviewId}`;
- write complaints to `restaurants/{restaurantId}/complaints/{complaintId}`;
- never accept a browser-generated customer ID as an authorization identity;
- remove customer access to private tenant collections such as staff, inventory and operational settings.

### Business-logic risks

Inventory deduction is currently performed from client-side order/status paths. The existing transaction-based driver claim is materially safer against concurrent claims, but inventory consumption still needs an idempotency/transactional design before it should be considered production-grade.

The same deduction logic appears in more than one path, creating a duplicate-consumption risk when a status transition is retried or when appended items and ready transitions overlap.

### Performance

The production build succeeds but reports ineffective Firebase dynamic imports and a large main bundle. These are Phase 3 optimization work unless they affect a security or correctness boundary.

## Verification evidence

The local Phase 2 baseline reported:

- `npm ci`: successful.
- `npm run build`: successful.
- `npm run lint`: successful.
- Firestore security suite: 24/24 passing.
- Authorization/claims suite: 10/10 passing.
- Functions `node --check index.js`: successful.
- `git diff --check`: clean.

Dependency audit remains a separate risk decision. The current audit reports high/moderate vulnerabilities, and `npm audit fix --force` must not be used blindly because it proposes a breaking Firebase Tools change.

## Closure gates

Phase 2 may be closed only after all of the following are evidenced:

- [ ] Customer Anonymous Auth migration is implemented and tested.
- [ ] Customer orders use canonical tenant-scoped paths.
- [ ] Customer reviews use canonical tenant-scoped paths.
- [ ] Customer complaints use canonical tenant-scoped paths.
- [ ] Customer identity is Firebase Auth UID, not localStorage.
- [ ] Production `firestore.rules` is cut over only after the client migration.
- [ ] `provisionAuthzClaims` is deployed using Node 20.
- [ ] Production project identity is explicitly verified as `menuflow-c02e5`.
- [ ] Controlled SuperAdmin bootstrap is completed.
- [ ] A real tenant owner receives refreshed signed claims and is verified.
- [ ] Tenant-admin denial cases are verified against the deployed callable.
- [ ] Full local and CI regression barriers are green after the cutover.
- [ ] Dependency vulnerabilities have an explicit remediation/acceptance decision.

## Non-negotiable rule

Do not close Phase 2 merely because CI is green. CI proves repository behavior; it does not prove production Firebase configuration, deployed callable behavior, or a successful customer data-path cutover.
