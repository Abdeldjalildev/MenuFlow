# Phase 5 — Testing & CI Expansion Plan

## Purpose

Phase 5 establishes automated evidence for MenuFlow's critical business, security, and customer workflows, then expands CI only after those tests are proven locally.

The phase follows the repository engineering contract: incremental, evidence-driven, reversible, and limited to one approved gate at a time.

## Golden rule

Do not rewrite application architecture to make tests easier. Do not weaken Firestore rules, authorization, validation, or lifecycle constraints to make tests pass. Do not add broad dependencies or unrelated refactors. CI changes happen only after the underlying tests exist and provide a concrete reliability benefit.

## Gate 1 — Domain & Utility Test Foundation

### Objective
Create a deterministic unit-test foundation for pure/reusable business logic and boundary validators that can be tested without Firebase services or a browser.

### In scope
- Order-number date and counter helpers.
- AI input validation limits and boundary conditions.
- Existing order-input normalization contracts that can be verified deterministically.
- Edge cases: empty values, whitespace, invalid numbers, zero/negative values, fractional values, maximum sizes, and malformed payloads.
- A focused test command and inclusion in `npm test`.

### Explicit boundary
Gate 1 does not attempt to prove Firestore transactions, security rules, authentication claims, concurrent writes, or browser routing. Those require integration/emulator coverage in later gates.

### Evidence required
- Deterministic Node test suite passes.
- Existing Phase 2–4 regression suites remain green.
- No production behavior is changed merely to satisfy unit tests.

## Gate 2 — Critical Order Workflow Integration

### Objective
Prove the server-authoritative order lifecycle and integrity guarantees through Firebase Emulator-backed integration tests.

### Coverage
- Order creation and tenant path.
- Valid and illegal lifecycle transitions.
- Role-specific transition boundaries.
- Inventory deduction on preparation.
- Idempotent inventory deduction.
- Missing recipe/ingredient and insufficient-stock failures.
- Concurrent driver claim behavior.
- Concurrent daily order-number allocation.

### Exit condition
The highest-risk Phase 3 guarantees are demonstrated through executable integration behavior, not only static source checks.

## Gate 3 — Customer Critical Path + Firestore Integration

### Objective
Prove the public customer flow from anonymous identity through ordering and post-order actions while preserving tenant and ownership boundaries.

### Coverage
- Anonymous authentication.
- Menu read path.
- Order creation and own-order visibility.
- Order tracking.
- Review/complaint ownership and validation.
- Cross-tenant read/write denial.
- Malformed and oversized customer writes.
- Regression validation for `OrderProvider.appendToOrder`, whose direct mutation of `items` and `totalAmount` must be reconciled with the current `validOrderMutation` rules before being considered healthy.

### Exit condition
The customer-critical path is tested against the Emulator and any permission mismatch is treated as a real defect rather than solved by broadening rules.

## Gate 4 — Authentication / RBAC / Tenant / AI Integration

### Objective
Connect the authentication and authorization model to executable integration tests across all supported actor types and the AI callable boundary.

### Coverage
- Anonymous customer behavior.
- Admin, SuperAdmin, Kitchen, Cashier, and Delivery role boundaries.
- Missing/invalid claims.
- Tenant mismatch denial.
- SuperAdmin explicit tenant targeting.
- AI authentication and authorization ordering.
- AI validation/rate-limit behavior at the callable boundary.

### Exit condition
Security-sensitive authorization behavior is demonstrated through executable integration tests rather than static assumptions alone.

## Gate 5 — CI Expansion + Full Regression

### Objective
Make CI execute the proven test suites with the smallest reliable change to the existing pipeline.

### Coverage
- `npm test` or the smallest equivalent complete test command.
- Existing `npm ci`.
- Existing `git diff --check`.
- Existing lint and build checks.
- No duplicated or flaky workflow jobs.

### Exit condition
CI reliably reproduces the local verification contract and adds clear regression value without unnecessary runtime or complexity.

## Phase 5 exclusions

- No React rewrite.
- No UI redesign.
- No performance optimization; bundle splitting remains Phase 6.
- No broad Firestore schema rewrite.
- No unrelated dependency upgrades or automatic `npm audit fix`.
- No encoding migration; that remains Phase 7.
- No production deployment claim based solely on emulator or static tests.

## Known starting risk carried into later gates

`OrderProvider.appendToOrder()` currently performs a transactional direct update of `items` and `totalAmount`, while the current Firestore order-mutation rules restrict allowed changed fields to the lifecycle/claim/payment fields. This is a high-confidence integration risk and is deliberately deferred to Gate 3 for executable validation rather than changing rules speculatively in Gate 1.
