# Phase 6 — Gates 3–4 Status

## Scope

This change implements only the approved Phase 6 Gates 3 and 4 on top of the existing Gates 1–2 work. It remains incremental and avoids security, schema, UI redesign, and dependency-upgrade scope.

## Gate 3 — Heavy Feature / Dependency Splitting

The staff QR-scanning route is already route-lazy-loaded by Gate 2. Gate 3 now isolates the QR scanner implementation itself behind a second lazy boundary so the `html5-qrcode` dependency is fetched only when the scanner feature is rendered.

### Preserved behavior

- `/staff` route remains unchanged.
- QR scan handling and redirect logic remain unchanged.
- Scanner cleanup behavior remains unchanged.
- A local `Suspense` fallback is shown while the scanner chunk loads.
- No dependency was added, removed, or upgraded.

Other heavy libraries such as PDF generation and charts remain feature-local and are not broadly rewritten in this gate. Their final bundle impact should be measured from the production build before any further change.

## Gate 4 — Firebase / Runtime Rendering Optimization

### Context stability

`MenuProvider` now uses `useCallback` for the stable table setter and `useMemo` for the provider value. This prevents unrelated provider rerenders from producing a new context value when the exposed state and setter have not changed.

### Derived-data stability

`AnalyticsDashboard` now memoizes its chart-data derivation against its actual inputs (`orders`, `lang`, and the relevant translation value), avoiding repeated O(n) order processing on unrelated rerenders.

### Intentionally deferred

- Firestore query/pagination changes remain deferred because query shape changes can affect behavior and billing.
- Order-provider-wide memoization remains deferred until the complete provider mutation surface is validated together; no high-risk rewrite is introduced here.
- Firebase initialization and data-loading architecture are unchanged.

## Verification contract

Added `tests/phase6-gates3-4-performance.test.mjs` and registered it in `npm test` through `test:phase6:gates3-4`.

The test protects the lazy QR boundary, menu context stability, and analytics memoization contracts.

## Status

**Implementation: complete for Gates 3–4.**

**Phase 6: NOT CLOSED.** Gate 5 remains the final performance-budget and regression-protection gate, and the full CI workflow remains the acceptance authority.
