# Phase 7 Gate 4 — Architecture & Documentation

## Purpose

Gate 4 replaces the stale starter README and records the architecture that is actually present in the repository after Phases 2–6 and Phase 7 Gates 1–3.

This document is descriptive: it documents confirmed repository behavior and security boundaries. It does not introduce a new architecture or change runtime behavior.

## 1. Product Overview

MenuFlow is a Vite + React + TypeScript restaurant-management application with:

- customer QR/table ordering;
- merchant/admin operations;
- kitchen order workflow;
- cashier payment workflow;
- delivery workflow;
- SuperAdmin operations;
- Firebase Authentication and Firestore persistence;
- QR-code creation/scanning;
- AI-assisted menu/customer functionality.

The frontend is a single React application with route-level lazy loading. Backend-only privileged workflows are implemented with Firebase Cloud Functions.

## 2. Runtime Architecture

```text
Browser
  |
  +--> React + TypeScript + Vite
  |      |
  |      +--> React Router
  |      +--> Context providers (Menu / Order / Cart)
  |      +--> Feature/page components
  |      +--> Firebase Web SDK
  |
  +--> Firebase Authentication
  |
  +--> Firestore (client reads/writes allowed by firestore.rules)
  |
  +--> Callable Cloud Functions
           |
           +--> createOrder
           +--> transitionOrder
           +--> provisionAuthzClaims
           +--> aiAssistant
                    |
                    +--> Gemini provider (server-side secret)
```

### Frontend entry point

`src/main.tsx` mounts the React application. `src/App.tsx` owns the router, top-level providers, authentication readiness check, and route-level lazy-loading boundaries.

### State boundaries

- `MenuProvider` manages menu-related application state and exposes stable memoized values/setters.
- `OrderProvider` manages order workflow state and persistence operations.
- `CartContext` manages customer cart state.

These contexts remain intentionally separate from the Firebase security boundary. Client state is not an authorization source.

## 3. Authentication, Roles & Tenant Isolation

Firebase Authentication provides the identity used by the application. Authorization-sensitive operations use trusted custom claims and Firestore rules/server-side checks.

The canonical role vocabulary is:

- `SuperAdmin`
- `Admin`
- `Kitchen`
- `Cashier`
- `Delivery`

Tenant staff roles carry a `restaurantId` claim. `SuperAdmin` is the cross-tenant administrative role.

`functions/index.js` exposes `provisionAuthzClaims` for trusted claim provisioning. Firestore rules independently validate authentication, role, and restaurant ownership for protected data paths.

The UI's `ProtectedRoute` is a navigation convenience, not the authoritative security boundary. Firestore rules and callable functions remain authoritative.

## 4. Firestore Data Model

The canonical application data is tenant-scoped below `restaurants/{restaurantId}`.

| Collection | Purpose | Typical access boundary |
| --- | --- | --- |
| `restaurants/{restaurantId}` | Restaurant/tenant document | Public read; SuperAdmin write |
| `settings` | Restaurant settings/theme | Theme read; tenant Admin write |
| `menuItems` | Published customer menu items | Public read; tenant Admin write |
| `categories` | Menu categories | Public read; tenant Admin write |
| `qrConfig` | Restaurant QR configuration | Tenant Admin |
| `orders` | Customer and staff order workflow | Anonymous owner/customer read; tenant operators; server lifecycle transitions |
| `reviews` | Customer reviews | Anonymous customer create; staff/admin reads |
| `complaints` | Customer complaints | Anonymous customer create; staff/admin reads |
| `customers` | Customer records | Tenant Admin/Cashier and owner-scoped customer access |
| `staff` | Staff records | Tenant operators read; Admin/SuperAdmin write |
| `inventory` | Ingredient stock | Admin/Kitchen |
| `recipes` | Recipe definitions and ingredients | Admin/Kitchen |
| `waste_log` | Waste records | Tenant operators/SuperAdmin |
| `wasteLog` | Legacy/compatibility waste path retained in rules | Tenant operators/SuperAdmin |
| `orderNumberCounters` | Daily order-number counters | Client denied; Cloud Function only |

Legacy top-level collections such as `orders`, `reviews`, `complaints`, `staff`, `customers`, `inventory`, `recipes`, and waste collections are explicitly denied by `firestore.rules`.

Recipe publishing and customer menu consumption use the tenant-scoped `recipes` and `menuItems` paths established in Phase 3.

## 5. Order Lifecycle

Order creation is mediated by the `createOrder` callable and requires anonymous Firebase Authentication. Daily order numbers are allocated transactionally in `restaurants/{restaurantId}/orderNumberCounters/{YYYY-MM-DD}`.

Lifecycle transitions are validated in both the trusted callable path and Firestore rules. The supported flow is:

```text
pending
  -> preparing
      -> ready
      -> ready_for_payment
      -> driver_claimed
          -> ready_for_delivery
              -> on_the_way
                  -> delivered_unpaid
                      -> paid
                          -> completed
```

Not every branch is available to every role. Kitchen, Delivery, Cashier, Admin, and SuperAdmin have distinct transition boundaries.

Inventory deduction occurs transactionally when an order enters `preparing`. The order is marked as inventory-deducted in the same transaction so repeated preparation attempts do not deduct stock twice.

## 6. AI Security Boundary

The browser does not hold the Gemini API secret and does not call the Gemini REST endpoint directly.

`src/services/aiServices.tsx` invokes the Firebase callable `aiAssistant`. The callable:

1. validates authentication and tenant context;
2. validates prompt/menu payload shape;
3. reads `GEMINI_API_KEY` through Firebase Functions secret configuration;
4. applies provider-side validation/rate limiting;
5. calls Gemini from trusted server-side code;
6. maps provider/security failures to controlled callable errors.

The required secret is named `GEMINI_API_KEY`. Its value must never be committed to the repository or exposed through a `VITE_*` variable.

## 7. Performance Architecture

Phase 6 introduced route-level lazy loading in `src/App.tsx` and feature-level lazy loading for the QR scanner dependency. High-fanout menu context values are memoized, and analytics chart data uses memoization for derived values.

The repository also contains reproducible bundle reporting and a performance budget contract. The current Gate 5 budget is:

- initial JavaScript: maximum 850 KiB;
- total JavaScript: maximum 3 MiB.

The budget is a regression barrier, not a claim about real-user performance or Lighthouse scores.

## 8. Testing & CI

The repository has domain tests, Firestore Emulator rules/integration tests, callable-function integration tests, AI security boundary tests, and performance/static regression tests across Phases 3–6.

`npm test` orchestrates the repository's test suites. CI uses `npm ci`, lint, build, and the repository's test/quality contracts as configured in `.github/workflows/ci.yml`.

Firebase Emulator tests are used where Firestore/Auth/Functions behavior must be verified without treating production as a test environment.

## 9. Local Development

Requirements are determined by the repository's package metadata. The root project uses npm and Vite; Firebase Functions use the `functions` directory.

Typical frontend workflow:

```text
npm ci
npm run dev
```

Quality checks:

```text
npm run lint
npm run build
npm test
```

Firebase Emulator-backed tests are invoked by the dedicated npm scripts in `package.json`.

Do not commit `.env` files, API keys, Firebase service-account credentials, tokens, or other secrets.

## 10. Firebase Configuration

The repository's Firebase project configuration is represented by `firebase.json` and the Firebase Web SDK configuration in `src/firebase.ts`.

The checked-in web configuration contains Firebase client configuration intended for the browser. It must not be confused with privileged service-account credentials or server secrets.

Cloud Functions are sourced from `functions/`. The AI callable declares `GEMINI_API_KEY` as a Functions secret.

Production deployment/verification may require Firebase project permissions and billing that are outside this repository. A successful local Emulator test must not be described as proof of production deployment.

## 11. Security Principles

- Firestore rules are part of the authorization boundary.
- Tenant identifiers must match trusted authorization context for protected operations.
- Client-side route guards do not replace server/rules authorization.
- Privileged AI credentials stay server-side.
- Lifecycle transitions are explicit and role-scoped.
- Inventory and order-number operations that require consistency use transactions.
- Legacy top-level data paths are denied rather than silently made permissive.
- Anonymous customer operations are constrained to their intended public use cases and validated by rules/functions.

## 12. Documentation Scope & Known Follow-ups

Gate 4 intentionally documents the architecture that exists; it does not attempt to redesign it.

Known follow-ups remain separate from this gate:

- translation wording/quality issues found during encoding forensics are not encoding corruption and were intentionally not rewritten;
- remaining performance optimization should be evidence-driven rather than budget-driven alone;
- production verification for Firebase operations that require billing remains a deployment concern;
- further domain decomposition of broad contexts such as `OrderProvider` is a future refactor and is not part of this documentation gate.

## 13. Change Safety

This documentation was produced from repository inspection and is intended to preserve existing application behavior. Gate 4 changes documentation only; it does not modify Firestore rules, authentication behavior, order logic, AI execution, dependencies, or application runtime code.
