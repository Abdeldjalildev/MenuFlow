# Phase 12 Gate 12.5 — Analytics Security & Accuracy Closure

## Purpose

Close the Phase 12 analytics contract only after security and accuracy boundaries are explicit. This gate does not claim runtime closure; it records the implementation-level closure conditions that must be verified locally.

## Security closure

- Analytics is exposed only through the backend `getAnalyticsSummary` callable.
- Unauthenticated callers are rejected.
- Only `Admin` with an explicit restaurant membership or `SuperAdmin` may request analytics.
- Admin membership is checked against the target restaurant and caller UID on the server.
- The browser receives an aggregated analytics result, not raw tenant order/expense collections.
- Expense records are tenant-scoped under `restaurants/{restaurantId}/expenses` and Firestore validates their tenant identity and schema.
- Expense writes are limited to Admin/SuperAdmin; expense updates are disabled and deletion is restricted.
- Query-time aggregation is bounded at 5,000 records per source and fails closed instead of silently returning incomplete analytics.
- Requested ranges are bounded to 366 calendar days.

## Accuracy closure

- Revenue is recognized only for `completed` orders.
- Pending/in-progress/unpaid statuses do not contribute revenue.
- Cancelled/voided statuses are tracked separately and do not contribute revenue.
- Historical server-authoritative order totals are used.
- Historical item price, modifier, name and category snapshots are used; the current menu is never used to reconstruct historical pricing.
- Restaurant-local timezone determines date and hour buckets.
- Expense dates are explicit `expenseDate` timestamps created by the expense UI and are included only when their restaurant-local calendar date falls inside the requested range.
- Net profit is exactly `revenue - expenses`.
- No payment/refund inference is performed.
- Currency is explicit and defaults to DZD only when the restaurant has no configured currency.
- Previous-period comparison uses an equal-length immediately preceding calendar range.

## Confirmed audit fix

The deep audit found a real Phase 12 integration defect: the existing Expenses page wrote to a top-level `expenses` collection while analytics read `restaurants/{restaurantId}/expenses`. This could make valid UI-entered expenses invisible to analytics and also bypass the intended tenant-domain contract.

It was corrected by:

1. moving expense reads/writes/deletes to the tenant-scoped subcollection;
2. deriving the restaurant identity from signed Firebase claims rather than localStorage;
3. writing `expenseDate` and `createdAt` server timestamps;
4. adding a Firestore expense schema/tenant authorization rule.

No unrelated business logic or dependency versions were changed.

## Remaining verification

The following still require local/runtime evidence:

1. `npm run test:phase12:gate1`
2. `npm run test:phase12:gate2`
3. `npm run test:phase12:gates3-4`
4. `npm run test:phase12:all`
5. `npm run test:phase12:gate5`
6. `npm test`
7. Emulator/browser evidence for Admin/SuperAdmin authorization, cross-tenant denial, timezone boundaries, expense visibility, 366-day limits, 5,000-record fail-closed behavior, zero data, comparison ranges, and AR/EN/FR/RTL rendering.

## Status

Phase 12 is **IMPLEMENTATION COMPLETE — DEEP AUDITED — AWAITING TEST/RUNTIME CONFIRMATION — NOT CLOSED**.
