# Phase 13 Gate 13.3 — Performance & Scalability Hardening

## Status

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

Gate 13.3 establishes evidence boundaries for frontend bundle size, Firestore query volume, analytics scale, and critical callable latency. It does not introduce speculative indexes, caching, or a materialized analytics database.

## Existing budgets retained

Phase 6 established the current frontend JavaScript budgets:

- initial JavaScript: **850 KiB maximum**;
- total JavaScript assets: **3 MiB maximum**.

The existing `scripts/phase6-performance-budget.mjs` remains the authoritative bundle-size check. Gate 13.3 adds regression checks around later-phase architecture instead of replacing the Phase 6 budget.

## Query-time analytics boundary

`getAnalyticsSummary` remains intentionally bounded:

- maximum 5,000 order records per request;
- maximum 5,000 expense records per request;
- fail-closed when the bound is reached;
- restaurant-local date filtering after widened UTC query bounds;
- no unbounded browser query over operational collections.

This is a safe current-scale strategy, not a claim of unlimited scalability. A future materialized-summary design requires production volume/latency evidence first.

## Critical performance evidence to collect

1. callable latency for canonical order creation and mutations;
2. analytics latency at representative ranges and tenant volumes;
3. Firestore read counts for critical flows;
4. query/index evidence from real query shapes;
5. initial and total JavaScript bundle budgets;
6. representative high-volume tenant data before any architectural scaling change.

## Safe scaling rule

No speculative dependency upgrade, cache, index explosion, pagination rewrite, or materialized analytics system is introduced by this gate. Any such change requires measured evidence and an isolated implementation gate.

## Verification boundary

The dedicated Gate 13.3 contract test establishes that these limits are present and later phases do not bypass them. Static PASS is not runtime performance closure. Runtime/load evidence remains required.
