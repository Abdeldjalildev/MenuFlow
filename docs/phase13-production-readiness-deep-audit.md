# Phase 13 — Production Readiness, Reliability & Scale Deep Audit

## Audit status

Phase 13 did not have an existing authoritative gate specification in the repository at the time of this audit. Therefore this document is a **proposed deep-audit roadmap**, not an authorization to implement Phase 13. No Phase 13 code was changed.

The recommended sequence below follows the current architecture and the risks exposed by Phases 8–12. Each gate must be authorized and verified separately before the next gate opens.

## Gate 13.1 — Production Data Integrity & Schema Closure

### Objective
Make the persisted production schema explicit and prevent drift between UI, backend, Firestore rules, and historical records.

### Audit findings
- Order, menu, modifier, expense, notification and analytics contracts now span multiple layers.
- Historical snapshots are essential for analytics and must remain immutable from the analytics perspective.
- Expense data recently exposed a real cross-layer schema mismatch: UI wrote a top-level collection while analytics expected tenant-scoped records. This was corrected in Phase 12 and should become the pattern for Phase 13.
- Legacy collections/aliases remain possible elsewhere and should be inventoried before any migration.

### Planned work
1. Inventory every production collection and authoritative writer.
2. Define required/optional fields and ownership for each operational collection.
3. Identify legacy paths and compatibility readers.
4. Add migration/read-repair only where evidence proves it is required.
5. Add schema integrity checks without changing business semantics.

### Do not do
- No destructive migration.
- No broad database rewrite.
- No dependency upgrades.

## Gate 13.2 — Observability, Error Taxonomy & Operational Diagnostics

### Objective
Make production failures diagnosable without exposing secrets or tenant data.

### Audit findings
- Backend callables already use typed `HttpsError` categories in several domains.
- Some frontend areas still log raw error objects and need a consistent safe diagnostic policy.
- Firebase discovery/emulator problems historically caused misleading application-level symptoms; diagnostics must distinguish environment barriers from application failures.
- Notifications are intentionally failure-isolated and should remain so.

### Planned work
1. Define a safe server/client error taxonomy.
2. Standardize structured backend logs with request/tenant/operation identifiers that contain no secrets.
3. Add failure classification for authorization, validation, dependency, timeout and data-integrity failures.
4. Add operational evidence for critical callable paths.
5. Ensure logs never contain tokens, API keys, full customer PII, or raw tenant datasets.

## Gate 13.3 — Performance & Scalability Hardening

### Objective
Prove that the application remains within defined latency/query/bundle budgets as restaurant data grows.

### Audit findings
- Analytics currently uses bounded query-time aggregation with a fail-closed 5,000-record/source limit.
- This is intentionally safe for the current scale but is not an unlimited scalability strategy.
- Phase 6 already established frontend performance budgets; Phase 13 should verify that later features have not regressed them.
- Firestore query shape and indexes should be evidence-driven rather than optimized speculatively.

### Planned work
1. Measure critical callable latency and Firestore reads.
2. Verify required indexes for real production query shapes.
3. Test representative high-volume tenant datasets.
4. Verify bundle/per-route loading budgets.
5. Define the evidence threshold for migrating analytics from query-time aggregation to materialized summaries.

## Gate 13.4 — Resilience, Recovery & Operational Safety

### Objective
Verify that failures, retries, partial dependencies and recovery do not corrupt business state.

### Audit findings
- Order creation and mutation paths use transactional/idempotent patterns.
- Operational notification failure is isolated from lifecycle mutation.
- Analytics is read-only and fail-closed on bounded-query exhaustion.
- Recovery/backup and restore evidence has not yet been established as a dedicated project phase.

### Planned work
1. Identify critical state transitions and retry semantics.
2. Verify idempotency boundaries for all externally retriable operations.
3. Document backup/restore responsibilities and evidence requirements.
4. Test dependency failure without corrupting canonical business state.
5. Define safe recovery procedures for failed deployments and data operations.

## Gate 13.5 — Production Readiness Closure

### Objective
Perform one controlled final audit across the entire production boundary.

### Planned verification
1. Full authorized test suite.
2. Firestore rules/runtime security verification.
3. Callable authorization and tenant-isolation verification.
4. Critical user journeys for customer, waiter, kitchen, cashier, delivery, admin and superadmin.
5. Performance/bundle evidence.
6. Error/observability evidence.
7. Recovery/idempotency evidence.
8. Security scan for secrets, unsafe client authority and cross-tenant access.
9. Documentation and deployment configuration review.
10. Explicit list of accepted limitations and deferred work.

## Gate dependency order

`13.1 Data Integrity → 13.2 Observability → 13.3 Performance/Scale → 13.4 Resilience/Recovery → 13.5 Production Closure`

No later gate should be implemented early merely because its code appears convenient.

## Phase 13 boundary

Phase 13 is **PLANNED — DEEP-AUDITED — NOT AUTHORIZED**.

No Phase 13 implementation should begin until Phase 12 receives its required test/runtime confirmation and the user explicitly authorizes Phase 13 Gate 13.1.
