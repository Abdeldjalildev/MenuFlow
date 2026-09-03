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

### Implementation state
**IMPLEMENTED — final verification performed in Gate 5.**

## Gate 2 — Critical Order Workflow Integration

### Objective
Prove the server-authoritative order lifecycle and integrity guarantees through Firebase Emulator-backed integration tests.

### Coverage
- Order creation and tenant path.
- Valid and illegal lifecycle transitions.
- Role-specific transition boundaries.
- Inventory deduction on preparation.
- Idempotent inventory deduction, including concurrent preparation attempts.
- Missing recipe/ingredient and insufficient-stock failures.
- Concurrent driver claim behavior.
- Concurrent daily order-number allocation.

### Implementation
- `tests/phase5-gate2-order-workflow.test.mjs` exercises the Auth, Firestore, and Functions emulators through the real callable endpoints.
- `tests/phase5-gate2-driver-claim.test.mjs` exercises concurrent driver claims against the actual Firestore security rules.
- Firebase Auth, Firestore, and Functions emulator ports are explicitly configured in `firebase.json`.
- Dedicated scripts are registered in `package.json`.

### Implementation state
**IMPLEMENTED — final verification performed in Gate 5.**

## Gate 3 — Customer Critical Path + Firestore Integration

### Objective
Prove the public customer flow from anonymous identity through ordering and post-order actions while preserving tenant and ownership boundaries.

### Coverage
- Anonymous customer identity contract.
- Menu read path.
- Order creation and own-order visibility.
- Order tracking.
- Review/complaint ownership and validation.
- Cross-tenant read/write denial.
- Malformed and oversized customer writes.
- Regression validation for `OrderProvider.appendToOrder`, whose direct mutation of `items` and `totalAmount` must be reconciled with the current `validOrderMutation` rules before being considered healthy.

### Implementation state
**IMPLEMENTED — final verification performed in Gate 5.**

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
- AI validation and rate-limit contract at the callable boundary.

### Implementation
- `tests/phase5-gate4-auth-ai-integration.test.mjs` exercises the Auth and Functions emulators for authentication, role, tenant, and AI callable authorization behavior.
- Authorized AI calls intentionally stop at server-side validation where possible, avoiding a real Gemini credential or external network dependency.
- The existing Phase 4 suites continue to cover the concrete provider rate-limit implementation and error mapping.

### Implementation state
**IMPLEMENTED — final verification pending GitHub Actions.**

## Gate 5 — CI Expansion + Full Regression

### Objective
Make CI execute the complete Phase 5 regression contract with the smallest reliable change to the existing pipeline.

### Implementation
- `npm test` now includes Phase 5 Gates 1–4 in addition to the existing Phase 2–4 and Firestore regression suites.
- `tests/phase5-gate5-ci-contract.test.mjs` verifies the required CI commands and guards against silently weakened checks.
- `.github/workflows/ci.yml` keeps the existing checkout, `npm ci`, diff check, lint, test, build, and Functions Node 20 validation jobs. Only the regression step is renamed to make its full-suite purpose explicit.

### Implementation state
**IMPLEMENTED — final verification pending GitHub Actions.**

## Phase 5 exclusions

- No React rewrite.
- No UI redesign.
- No performance optimization; bundle splitting remains Phase 6.
- No broad Firestore schema rewrite.
- No unrelated dependency upgrades or automatic `npm audit fix`.
- No encoding migration; that remains Phase 7.
- No production deployment claim based solely on emulator or static tests.

## Findings preserved without speculative fixes

### `OrderProvider.appendToOrder()` authorization mismatch

The current client path performs a transactional direct update of `items` and `totalAmount`, while the current Firestore order-mutation rules permit only lifecycle/claim/payment fields. Gate 3 deliberately proves this mismatch with an emulator test. The fix requires an explicit product/security decision about who may append items and how those items/prices are authorized.

### Client-supplied `totalAmount` integrity gap

`createOrder` calculates an expected total but currently accepts a supplied `totalAmount` without requiring equality with that calculated total. This remains a documented integrity hardening opportunity and is not changed during Phase 5 because doing so would expand the approved scope without a dedicated decision.

## Verification policy

Gates 1–4 are implementation-complete. Phase 5 is **not CLOSED** until the final GitHub Actions run passes the complete regression suite, lint, build, Functions validation, and pull-request diff checks.
