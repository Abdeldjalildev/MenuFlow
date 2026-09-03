# Phase 6 — Gates 1–2 Status

## Scope

This change implements the first two approved performance gates only:

- **Gate 1 — Performance Baseline & Bundle Forensics**
- **Gate 2 — Route-Level Code Splitting**

The work follows the MenuFlow engineering contract: incremental, reversible, focused, and without unrelated dependency, security, schema, or UI changes.

## Gate 1 — Performance Baseline & Bundle Forensics

### Confirmed baseline

The repository's recorded baseline is approximately **2.77 MB minified initial JavaScript** from the observed pre-Phase-6 build. `src/App.tsx` statically imported the customer, staff, merchant, kitchen, cashier, delivery, SuperAdmin, and merchant sub-pages, so these modules were part of the application's initial dependency graph.

### Implementation

Added `scripts/phase6-bundle-report.mjs` and the `perf:bundle-report` npm script. After a production build, the report:

- reads `dist/index.html` to identify initial assets;
- measures initial JavaScript bytes;
- measures total JavaScript asset bytes;
- lists the largest JavaScript assets;
- lists the assets referenced by the initial HTML.

No third-party bundle-analysis dependency was introduced.

### Evidence boundary

The historical 2.77 MB figure is retained as the baseline reference. The new report is the reproducible measurement mechanism for the current build and must be run after `npm run build` when a fresh numeric baseline is required.

## Gate 2 — Route-Level Code Splitting

`src/App.tsx` now loads route components through `React.lazy()` and wraps the route tree in `Suspense`.

The following feature areas are no longer statically imported by `App.tsx`:

- customer menu;
- table entry and staff scanner;
- login;
- kitchen, cashier, delivery, merchant, and SuperAdmin dashboards;
- merchant overview, inventory, customers, suppliers, staff, staff performance, expenses, waste, complaints, reports, recipes, stock take, theme, QR management, and control panel pages.

### Preserved behavior

- Existing route paths are unchanged.
- Existing `ProtectedRoute` authorization boundaries are unchanged.
- Existing provider hierarchy is unchanged.
- Existing navigation and redirect behavior is unchanged.
- No dependencies were added or removed.
- No Firestore paths or rules were changed.

### Loading behavior

A minimal `Suspense` fallback preserves a usable loading state while a route chunk is fetched. The existing authentication loading state remains unchanged.

## Tests / verification

A focused static contract test was added at:

- `tests/phase6-gates1-2-performance.test.mjs`

It verifies the bundle-report command and the route lazy-loading contract.

Full build/lint/test verification is intentionally performed after the branch is pushed through the normal project workflow. No production performance claim is made from static inspection alone.

## Known limitations / deferred work

- Heavy dependency splitting (`jsPDF`, `html2canvas`, `recharts`, QR scanning/generation, etc.) remains Gate 3.
- Firebase/runtime rendering optimization remains Gate 4.
- A maintained bundle-size budget remains Gate 5.
- The fresh post-change numeric bundle measurement must be captured from an actual production build; the script added here provides that evidence without committing generated `dist` output.

## Status

**Implementation: complete for Gates 1–2.**

**Phase 6: NOT CLOSED.**
