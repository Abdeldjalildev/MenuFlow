# Phase 12 Gates 12.3–12.4 — Analytics Dashboard & Advanced Filters

## Status

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

This implementation does not claim runtime or browser closure. Local/emulator verification remains required.

## Gate 12.3 — Analytics Dashboard

The merchant analytics page is available at `/merchant/analytics` and is protected for `Admin` and `SuperAdmin`.

The browser calls the backend `getAnalyticsSummary` callable and consumes only the aggregated analytics result. It does not scan tenant orders or expenses for dashboard rendering.

Implemented views:

- revenue
- expenses
- net profit
- completed orders
- sales over time
- category share
- item share
- peak hour
- peak day
- previous-period revenue comparison
- explicit currency and restaurant timezone

States:

- loading
- recoverable error with retry
- zero/empty data

Localization/layout:

- Arabic
- English
- French
- RTL for Arabic
- responsive dashboard layout

No client-side reconstruction of authoritative order totals is introduced.

## Gate 12.4 — Advanced Filters

Implemented filters/views:

- inclusive start/end calendar dates sent to the server
- day/month/hour granularity
- category selection from aggregated category keys
- item selection from aggregated item keys
- peak hour analysis
- peak day analysis
- previous-period comparison using a range of identical length immediately preceding the selected range

Correctness boundary:

Date range validation and maximum range enforcement remain server-side in the Phase 12 analytics contract. The analytics callable also keeps its 5,000-record per-source fail-closed barrier. Client-side category/item/granularity transformations operate only on already aggregated server results; raw tenant records are not downloaded for filtering.

## Scope boundaries

- No payment/refund inference.
- No external analytics database.
- No materialized-summary system yet.
- No changes to closed order/security architecture.
- No dependency upgrades.
- Gate 12.5 remains unopened.

## Required verification

1. `npm run test:phase12:gate1`
2. `npm run test:phase12:gate2`
3. `node --test tests/phase12-gates3-4-dashboard-filters.test.mjs`
4. `npm run test:phase12:all`
5. `npm test`
6. Browser/runtime verification for Admin/SuperAdmin authorization, tenant switching/isolation, zero-data, timezone boundaries, date-range limits, previous-period comparison, and Arabic/English/French/RTL rendering.
