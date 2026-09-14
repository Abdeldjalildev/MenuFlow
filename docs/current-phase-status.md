# Current Phase Status

## Phase 9 — Order Integrity & Unified Ordering

**IMPLEMENTATION COMPLETE — AWAITING LOCAL TEST VERIFICATION — NOT CLOSED**

All five gates have been implemented and audited. Runtime verification remains intentionally local and must be performed before Phase 9 receives CLOSED status.

## Phase 10 — Waiter Experience

**IMPLEMENTATION COMPLETE — AWAITING LOCAL TEST VERIFICATION — NOT CLOSED**

All five gates have been implemented and deep-audited. Browser/runtime closure evidence remains intentionally local and must be confirmed before Phase 10 receives CLOSED status.

## Phase 11 — Restaurant Operations & UX

**IMPLEMENTATION COMPLETE — AWAITING FINAL TEST/RUNTIME CONFIRMATION — NOT CLOSED**

All five Phase 11 gates are implemented and the full phase has been deep-audited. A confirmed Gate 11.4 integration gap was found during the final audit: `order_transition` was defined but not emitted. It was fixed with a backend order-document update trigger using deterministic event IDs and failure-isolated notification creation.

### Gate status

- Gate 11.1 — Cart Persistence: **IMPLEMENTED — VERIFICATION PENDING**
- Gate 11.2 — Order UX & Feedback: **IMPLEMENTED — VERIFICATION PENDING**
- Gate 11.3 — Menu Modifiers: **IMPLEMENTED — VERIFICATION PENDING**
- Gate 11.4 — Notifications & Operational Alerts: **IMPLEMENTED — DEEP-AUDITED — VERIFICATION PENDING**
- Gate 11.5 — Operations Closure: **IMPLEMENTED — VERIFICATION PENDING**

## Phase 12 — Analytics & Business Intelligence

**IMPLEMENTATION COMPLETE — DEEP-AUDITED — AWAITING TEST/RUNTIME CONFIRMATION — NOT CLOSED**

### Gate status

- Gate 12.1 — Analytics Data Contract: **IMPLEMENTED — DEEP-AUDITED — VERIFICATION PENDING**
- Gate 12.2 — Aggregation Architecture: **IMPLEMENTED — DEEP-AUDITED — VERIFICATION PENDING**
- Gate 12.3 — Analytics Dashboard: **IMPLEMENTED — DEEP-AUDITED — VERIFICATION PENDING**
- Gate 12.4 — Advanced Filters: **IMPLEMENTED — DEEP-AUDITED — VERIFICATION PENDING**
- Gate 12.5 — Analytics Security & Accuracy Closure: **IMPLEMENTED — DEEP-AUDITED — VERIFICATION PENDING**

### Gate 12.5 closure boundary

- Analytics remains backend-only through `getAnalyticsSummary`.
- Admin access requires explicit membership in the requested restaurant; SuperAdmin is platform-wide.
- Browser analytics receives aggregated results rather than raw order/expense collections.
- Analytics queries remain bounded to 5,000 records per source and fail closed on the limit.
- Requested ranges remain bounded to 366 calendar days.
- Revenue is recognized only from completed orders using persisted server-authoritative totals.
- Historical item price/modifier/category snapshots are used for item/category analytics.
- Restaurant-local timezone controls business-date and hour aggregation.
- Net profit remains exactly revenue minus valid tenant expense records.
- Expense UI and analytics now use the same tenant-scoped `restaurants/{restaurantId}/expenses` collection.
- Expense writes are tenant-authorized and schema-validated in Firestore rules.
- No payment/refund inference was introduced.

### Deep-audit finding fixed

The final Phase 12 audit found a real integration defect: the existing Expenses page wrote to a top-level `expenses` collection while analytics read `restaurants/{restaurantId}/expenses`. This could make entered expenses invisible to analytics and broke the intended tenant data contract. The expense UI was aligned with the tenant collection, signed claim-derived identity, explicit `expenseDate`, and a matching Firestore security/schema contract.

### Required verification order

1. `npm run test:phase12:gate1`
2. `npm run test:phase12:gate2`
3. `npm run test:phase12:gates3-4`
4. `npm run test:phase12:gate5`
5. `npm run test:phase12:all`
6. `npm test`
7. Browser/emulator evidence for Admin/SuperAdmin authorization, cross-tenant denial, timezone boundaries, expense visibility, bounded queries, 366-day limits, 5,000-record fail-closed behavior, zero-data behavior, deterministic aggregation, previous-period comparison, and Arabic/English/French/RTL rendering.

### Scope boundaries preserved

- No payment gateway.
- No external analytics database.
- No materialized-summary system yet.
- No dependency version upgrades.
- No broad refactor.

## Phase 13 — Production Readiness, Reliability & Scale

**GATE 13.1 AUTHORIZED — IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

### Gate 13.1 — Production Data Integrity & Schema Closure

Implemented:
- current production collection/ownership inventory;
- canonical tenant namespace and schema invariants;
- explicit legacy-path inventory;
- reversible migration boundary with no destructive migration;
- dedicated Gate 13.1 static contract test;
- package script `npm run test:phase13:gate1`.

Known current legacy callers are explicitly documented:
- `QrCreations.tsx` references `settings/{id}` and `restaurant_qr_config/{id}`;
- `WasteLog.tsx` references top-level `waste_log`.

These are not silently rewritten in Gate 13.1 because safe migration requires production inventory and ownership evidence first.

### Gate 13.2
**PLANNED — NOT AUTHORIZED**

### Gate 13.3
**PLANNED — NOT AUTHORIZED**

### Gate 13.4
**PLANNED — NOT AUTHORIZED**

### Gate 13.5
**PLANNED — NOT AUTHORIZED**

### Gate dependency order

`13.1 → 13.2 → 13.3 → 13.4 → 13.5`

## Operating rule

Implementation, verification, and closure are separate states. Static contract tests do not constitute runtime closure. When a verification barrier cannot be resolved in the current environment, preserve the implementation and evidence, classify the barrier, and defer the blocked verification rather than inventing a PASS or performing unrelated debugging.
