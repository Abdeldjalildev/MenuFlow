# Phase 12 — Gate 12.1 Analytics Data Contract

## Status

**IMPLEMENTATION COMPLETE — VERIFICATION PENDING — NOT CLOSED**

## Frozen contract

- Revenue is recognized from `completed` orders only.
- Revenue uses the persisted server-authoritative `totalAmount`, which already reflects the authoritative `discountAmount`.
- Pending, preparing, driver, ready, and delivered-unpaid states are excluded from recognized revenue.
- `cancelled`, `canceled`, and `voided` are explicitly excluded and tracked separately.
- Expenses are tenant-owned records under `restaurants/{restaurantId}/expenses` with a non-negative `amount` and an expense date falling inside the restaurant-local requested range.
- Net profit is `revenue - expenses`.
- No payment gateway or refund inference is introduced; future refunds require an explicit domain representation.
- Analytics dates are restaurant-local calendar dates in `YYYY-MM-DD` format, inclusive at both ends.
- Restaurant timezone is authoritative and must be configured in `restaurant.analytics.timezone`; missing/invalid timezone fails closed.
- Currency is an explicit three-letter code, defaulting to the current application convention `DZD` when restaurant currency is not set.
- Historical analytics use persisted order totals and item price/modifier/category snapshots, never current menu prices.
- A maximum 366-calendar-day query range is enforced.

## Acceptance barrier

No dashboard or filter implementation is permitted to redefine these meanings. Gate 12.2 consumes this contract; Gates 12.3–12.5 must not silently change it.

## Verification

Static contract tests are present in `tests/phase12-gate1-analytics-contract.test.mjs`. Runtime/emulator confirmation remains required before closure.
