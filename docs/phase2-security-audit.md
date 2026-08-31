# MenuFlow Phase 2 — Security & Architecture Audit Baseline

## Purpose

Phase 2 begins from the Phase 1 security-test foundation. This document records the reproducible trust-boundary findings that must drive implementation work. It intentionally separates **target security guarantees** from production behavior that has not yet been safely migrated.

## Severity model

- **Critical:** direct privilege escalation, cross-tenant access/write, or a customer-controlled authorization boundary.
- **High:** security-sensitive identity/authorization design that can be abused when combined with another weakness, or business logic capable of corrupting tenant data.
- **Medium:** correctness, maintainability, or performance risk with limited direct security impact.
- **Low:** cleanup or quality improvement that should not precede security work.

## Findings

### P0 / Critical — client-controlled authorization state

`ProtectedRoute` checks Firebase Auth only for session presence, then obtains the role from `localStorage.userRole`. `localStorage` is controlled by the browser and is therefore not an authorization source.

**Required remediation:** route authorization must use trusted Firebase Authentication token claims. The UI may cache display information, but cached role/tenant values must never grant access.

### P0 / Critical — legacy order tenant boundary

Production `firestore.rules` currently allows creation under `/orders/{orderId}` whenever the submitted `restaurantId` is a string. A customer can therefore submit an arbitrary tenant identifier.

**Required remediation:** move customer order writes to the canonical tenant namespace and bind customer identity to Firebase Authentication. The request path must provide the tenant boundary; the client payload must agree with it and cannot choose another tenant.

### P0 / Critical — review and complaint tenant boundary

Production review and complaint creation currently accepts any string `restaurantId`.

**Required remediation:** apply the same canonical tenant/path and authenticated-customer ownership model used for orders.

### P0 / Critical — hard-coded privileged identity in login UI

`Login.tsx` contains a hard-coded SuperAdmin email comparison and writes `SuperAdmin` into localStorage. A privileged role must never be inferred from a browser-side email comparison.

**Required remediation:** remove the hard-coded privilege branch. SuperAdmin authorization must be represented by trusted Authentication claims and enforced again by Firestore rules.

### P1 / High — client-side identity/tenant cache

The login flow writes `userId`, `restaurantId`, `userRole`, and `userName` to localStorage and other modules use those values as runtime state. These values are useful as UI hints but cannot be treated as security evidence.

**Required remediation:** establish one authoritative auth/session model: Firebase Auth user + ID-token claims. Tenant and role must be read from trusted claims or from server-authorized data, never from mutable storage.

### P1 / High — inventory deduction is not transactionally coupled to order lifecycle

`OrderProvider` performs inventory writes in multiple paths. The same order can reach more than one status that triggers deduction, creating duplicate-deduction risk. Appending items also updates the order and inventory in separate operations.

**Required remediation:** define one inventory-deduction event, make it idempotent, and perform order-state plus inventory changes atomically where Firestore transaction semantics permit. A durable deduction marker should prevent repeated application.

### P1 / High — driver claim must remain server-authoritative

The current implementation uses a Firestore transaction for the claim operation, which is the correct primitive, but the rule boundary and allowed status transitions must be verified together. A client transaction is not sufficient if rules permit arbitrary driver/status fields.

**Required remediation:** restrict claim writes by role, tenant, current status, and immutable ownership fields in Firestore rules. Add race and replay regression tests.

### P1 / High — legacy top-level collections conflict with canonical tenant model

Several production collections remain top-level (`orders`, `staff`, `customers`, `inventory`, `recipes`, `reviews`, `complaints`, `waste_log`, etc.). This makes tenant identity dependent on document fields instead of the Firestore path.

**Required remediation:** migrate feature-by-feature to `restaurants/{restaurantId}/...`. Do not silently delete legacy data.

### P2 / Medium — Firebase dynamic imports are ineffective

The current provider dynamically imports Firestore functions after the application has already statically imported the same Firebase module family. This does not provide a meaningful code-splitting boundary and complicates the code.

**Required remediation:** defer performance refactoring until security/data correctness is stable, then introduce deliberate module boundaries and measure bundle impact.

### P2 / Medium — large context responsibility

`OrderProvider` owns reads, writes, order lifecycle, inventory deduction, review creation, and driver claiming. This concentrates business-critical side effects in one client context.

**Required remediation:** Phase 3 should split domain services from UI state, after Phase 2 establishes the authorization and data contracts.

## Phase 2 non-negotiable invariants

1. Browser storage is never an authorization source.
2. Firebase Authentication establishes identity.
3. Trusted token claims establish role and tenant membership.
4. Firestore rules are the final authorization boundary.
5. Restaurant-scoped data uses the restaurant path as its tenant boundary.
6. Customer-created documents bind to the authenticated customer UID.
7. Privileged fields are not writable by untrusted clients.
8. Business side effects that change money, stock, or ownership are idempotent and transactionally controlled.
9. Security regressions require emulator tests before merge.
10. No UI/feature expansion is allowed to outrun the security contract.

## Safe migration order

1. Establish trusted Authentication claim contract.
2. Remove client-side privilege decisions from routing/login.
3. Add frontend auth/session abstraction around Firebase Auth.
4. Introduce canonical tenant-path access helpers.
5. Migrate customer order/review/complaint writes and rules together.
6. Migrate staff/admin reads and writes and enforce tenant claims.
7. Make inventory deduction idempotent and transactional.
8. Add driver-claim race/replay tests.
9. Inventory and migrate remaining legacy collections.
10. Re-run all security tests, lint, and build before any Phase 3 refactor.
