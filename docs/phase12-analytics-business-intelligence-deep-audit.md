# Phase 12 — Analytics & Business Intelligence Deep Audit

## Status

**DEEP AUDITED — PLANNED — NOT AUTHORIZED**

This document is a pre-implementation audit only. No Phase 12 code has been implemented in this pass.

Phase 12 must turn existing operational data into a trustworthy business-intelligence layer without moving raw tenant data indiscriminately into the browser. The five gates are sequential because the metric definitions must be frozen before aggregation, and aggregation must be correct before dashboard/filter work.

## Gate 12.1 — Analytics Data Contract

### Objective

Freeze the business meaning of every metric before writing aggregation or UI code.

### Required definitions

- **Revenue:** define whether this means gross order value, paid order value, completed order value, or another explicit business measure.
- **Expenses:** define expense document shape, categories, amount semantics, date semantics, and tenant ownership.
- **Net profit:** explicit formula based on the chosen revenue and expense definitions.
- **Order-status treatment:** explicitly classify pending, preparing, ready, delivered, unpaid, paid, completed, and cancelled/voided orders if cancellation exists.
- **Refund/discount treatment:** define whether discounts reduce revenue and how future refunds would be represented without inventing payment-gateway behavior.
- **Timezone:** define restaurant timezone and how date/day/hour boundaries are computed. Never let browser timezone silently redefine a tenant's business day.
- **Currency:** use the restaurant's configured currency or the current application convention; do not mix currencies in a tenant aggregate.
- **Snapshot semantics:** analytics must use stable authoritative order values, not client-side reconstructed totals.

### Acceptance barrier

No dashboard implementation should begin until the definitions above are explicit and testable.

## Gate 12.2 — Aggregation Architecture

### Objective

Choose the smallest architecture that is reliable for current MenuFlow scale while remaining safe for future growth.

### Preferred direction

Operational Firestore data → server-side aggregation/query layer → tenant-scoped analytics result → dashboard UI.

### Design constraints

- Do not download every raw order/expense document to the browser for every dashboard view.
- Keep tenant isolation authoritative server/rules-side.
- Use server-side aggregation for metrics that would otherwise require unbounded client scans.
- Decide whether current scale justifies query-time aggregation, scheduled materialized summaries, or a hybrid.
- Define idempotency if summary documents are written by triggers/jobs.
- Define backfill/rebuild behavior before introducing materialized analytics.
- Avoid introducing an external analytics database unless current scale or requirements prove Firebase is insufficient.
- Preserve date/timezone semantics from Gate 12.1 in aggregation keys.

### Risks to investigate

- Existing order documents may not have every field needed for historical analytics.
- Expense data shape may need normalization before aggregation.
- Large tenant datasets may make browser-side scans unacceptable.
- Trigger-based aggregation can double-count without deterministic event keys/idempotency.

## Gate 12.3 — Analytics Dashboard

### Metrics

- Sales per day/month.
- Revenue/income using the Gate 12.1 definition.
- Total expenses.
- Net profit.
- Category share.
- Item share.
- Sales over time.
- Peak periods where the aggregation contract supports them.

### Visualization rule

Use a chart only when it communicates the metric clearly:

- line/area for time trends;
- bars for category/item comparison;
- pie/donut only for meaningful composition/share views.

### UX requirements

- Loading state.
- Empty/zero-data state.
- Error state.
- Tenant identity visible enough to prevent operator confusion.
- Currency and date labels explicit.
- No client-side recomputation that can disagree with server-authoritative values.
- Arabic/English/French compatibility and RTL layout where applicable.
- Mobile usability without turning the dashboard into an unreadable dense chart wall.

## Gate 12.4 — Advanced Filters

### Required filters/views

- Date range.
- Day/hour/month granularity.
- Peak hour analysis.
- Peak day analysis.
- Useful comparison periods where definitions are unambiguous.
- Category/item filters where data volume permits.

### Correctness constraints

- Date range boundaries use the restaurant timezone.
- Inclusive/exclusive boundary semantics are documented and tested.
- Changing granularity must not double-count records.
- Empty ranges must produce zero/empty states rather than fabricated values.
- Loading/error state must be preserved while filters change.
- Large ranges must remain bounded by the server-side aggregation design.

## Gate 12.5 — Analytics Security & Accuracy Closure

### Security tests

- Admin A cannot read Admin B's restaurant analytics.
- Staff cannot access another tenant's analytics by changing restaurantId.
- Forged URL/localStorage tenant context cannot bypass backend authorization.
- SuperAdmin behavior is explicit and tested.
- Analytics endpoints/functions validate tenant membership independently of UI state.

### Accuracy tests

- Completed/paid/cancelled semantics match Gate 12.1.
- Date/timezone boundary cases are correct.
- Duplicate aggregation cannot inflate revenue or expenses.
- Expense categories are handled deterministically.
- Zero-data tenants return stable zero/empty results.
- Missing/invalid source records fail closed or are explicitly classified.
- Large datasets use bounded/server-side strategies rather than browser-wide raw scans.
- Rebuild/backfill produces the same result as incremental aggregation.

### Closure evidence

- Static contract suite.
- Emulator/runtime analytics tests.
- Tenant-isolation tests.
- Deterministic fixture dataset with independently calculated expected results.
- Boundary-date/timezone fixtures.
- Duplicate/replay fixtures.
- Browser evidence for dashboard/filter correctness.
- Full regression suite.

## Recommended implementation order after Phase 12 authorization

1. **12.1:** freeze definitions and schemas; no dashboard work yet.
2. **12.2:** implement and verify aggregation architecture against deterministic fixtures.
3. **12.3:** build the dashboard strictly from the verified analytics contract.
4. **12.4:** add filters/granularity without changing metric definitions.
5. **12.5:** perform tenant-security, accuracy, replay, zero-data, scale, and browser closure.

## Explicit non-goals

- No payment gateway.
- No platform commission/revenue-share model.
- No unrelated restaurant-management features.
- No redesign of closed order/security architecture unless new Phase 12 evidence requires it.
- No premature external data warehouse.

## Deep-audit conclusion

Phase 12 is structurally well-defined, but its highest-risk area is **metric semantics**, not chart rendering. The first implementation gate must therefore establish a precise analytics contract and timezone/status policy. Only then should aggregation and UI be built.
