# MenuFlow Phase 2 — Remediation Gates

## Gate 1 — Trusted identity contract

**Goal:** establish one authoritative representation of authenticated identity.

Required fields:

- Firebase Auth UID
- role claim: `SuperAdmin | Admin | Cashier | Kitchen | Delivery`
- `restaurantId` claim for restaurant staff; absent for SuperAdmin unless explicitly required by a server-side operation

Acceptance:

- No protected route grants access from localStorage.
- No login branch grants a role from an email string.
- Firestore rules continue to validate role and tenant independently of UI behavior.

## Gate 2 — Canonical tenant paths

**Goal:** eliminate field-only tenant boundaries for migrated domains.

Target:

```text
restaurants/{restaurantId}/orders/{orderId}
restaurants/{restaurantId}/customers/{customerId}
restaurants/{restaurantId}/reviews/{reviewId}
restaurants/{restaurantId}/complaints/{complaintId}
restaurants/{restaurantId}/inventory/{inventoryItemId}
restaurants/{restaurantId}/recipes/{recipeId}
```

Acceptance:

- Path tenant and document `restaurantId` must agree.
- Customer writes require the authenticated UID.
- Cross-tenant requests fail in emulator tests.
- Legacy collections remain recoverable until an explicit cutover decision.

## Gate 3 — Customer write hardening

Orders, reviews, and complaints must be migrated as a single trust-boundary family.

Acceptance tests must cover:

- correct tenant + correct customer succeeds;
- wrong tenant fails;
- wrong customer fails;
- missing identity fails;
- forged privileged fields fail;
- update/delete by customers fail where the product contract requires immutable customer-created records.

## Gate 4 — Staff authorization hardening

Acceptance tests must cover every role and every tenant:

- Admin cannot cross tenant boundaries;
- Cashier can access only approved cashier/order data in its tenant;
- Kitchen cannot access financial data;
- Delivery cannot mutate menu/inventory data;
- staff cannot change their own role or tenant;
- tenant Admin cannot grant Admin/SuperAdmin;
- SuperAdmin operations are explicit rather than implicit.

## Gate 5 — Business invariants

### Order status

Create an explicit allowed transition matrix. Reject arbitrary jumps that bypass operational controls.

### Inventory

Deduction must be idempotent. The same order/status event must never deduct stock twice.

### Driver claim

Use a transaction and enforce role + tenant + claim ownership + current status in rules. Add competing-claim tests.

### Totals

The persisted total must be derived from canonical item prices/quantities and validated against client-supplied totals. Discounts must have explicit bounds and semantics.

## Gate 6 — Regression barrier

Before closing Phase 2:

- all Firestore emulator security tests pass;
- new Phase 2 regression tests pass;
- TypeScript build passes;
- ESLint passes;
- no production secret is introduced;
- no browser-controlled field is used as authorization evidence;
- migration changes are documented and reversible.

## Explicit non-goals for Phase 2

- no broad UI redesign;
- no feature expansion;
- no silent production-data deletion;
- no weakening of rules to make existing callers pass;
- no pretending that a client-only workaround is equivalent to trusted backend authorization.
