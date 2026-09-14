# Phase 12 — Gate 12.2 Aggregation Architecture

## Status

**IMPLEMENTATION COMPLETE — VERIFICATION PENDING — NOT CLOSED**

## Architecture

`Firestore operational data → server-side bounded query → deterministic aggregation → tenant-scoped analytics result`

The first implementation uses query-time aggregation because it is the smallest architecture compatible with the current MenuFlow scale and Firebase model. It deliberately does not download raw tenant data into the browser.

## Server boundary

`getAnalyticsSummary` is a callable Function exposed from the deployed Functions entrypoint. Only Admin actors with an explicit restaurant membership and SuperAdmin are authorized. Restaurant membership is checked server-side; URL/localStorage/browser claims are not used as analytics authorization.

## Bounded reads

- Orders are queried by `createdAt` inside a bounded UTC envelope and then filtered using the restaurant timezone.
- Expenses are queried by `expenseDate` inside the same bounded envelope and then filtered using the restaurant timezone.
- Each source is capped at 5,000 documents per request. At the cap, the function fails closed with `resource-exhausted` instead of returning a silently incomplete metric.
- Maximum requested range is 366 calendar days.
- No client-side raw-data scan is part of this architecture.

## Correctness rules

- Revenue status semantics come only from Gate 12.1.
- Historical item price, modifier price, and category snapshots are used for item/category aggregates.
- Restaurant-local date/hour conversion happens on the server.
- Query envelopes are widened at both edges to prevent timezone boundary records from being missed.
- Exact date inclusion is applied after timezone conversion.
- The aggregation result is derived from server data only.

## Scale boundary

Query-time aggregation is the initial implementation, not a promise that it is sufficient forever. If the bounded 5,000-record barrier becomes a real production limitation, a later gate may introduce deterministic materialized summaries with explicit idempotency and rebuild semantics. No external analytics database is introduced here.

## Verification

Deterministic aggregation tests are present in `tests/phase12-gate2-aggregation.test.mjs`. Runtime/emulator authorization, query behavior, and full regression evidence remain required before closure.
