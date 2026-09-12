# MenuFlow

MenuFlow is a restaurant-management web application built with **React, TypeScript, Vite, Tailwind CSS, and Firebase**.

It supports QR/table customer ordering, merchant operations, kitchen workflows, cashier/payment workflows, delivery workflows, SuperAdmin administration, Firestore persistence, Firebase Authentication, QR tools, and AI-assisted functionality.

## Architecture

MenuFlow is a single React frontend backed by Firebase services and callable Cloud Functions.

```text
Browser
  |
  +-- React + TypeScript + Vite
  |     +-- React Router
  |     +-- Menu / Order / Cart contexts
  |     +-- Feature and page components
  |     +-- Firebase Web SDK
  |
  +-- Firebase Authentication
  +-- Firestore
  +-- Callable Cloud Functions
        +-- createOrder
        +-- transitionOrder
        +-- provisionAuthzClaims
        +-- aiAssistant
              +-- Gemini provider (server-side secret)
```

The detailed architecture and security boundaries are documented in [`docs/phase7-gate4-architecture.md`](docs/phase7-gate4-architecture.md).

## Main Application Areas

- **Customer:** table/QR entry, menu browsing, cart, ordering, order tracking, reviews and complaints.
- **Merchant/Admin:** menu, categories, recipes, inventory, customers, staff, suppliers, expenses, waste, reports, stock take, theme and QR configuration.
- **Kitchen:** order preparation and kitchen workflow.
- **Cashier:** payment/completion workflow.
- **Delivery:** driver claim and delivery workflow.
- **SuperAdmin:** cross-tenant administrative operations.
- **AI:** authenticated/tenant-scoped callable AI access with server-side secret handling and abuse controls.

## Roles

The canonical role vocabulary is:

- `SuperAdmin`
- `Admin`
- `Kitchen`
- `Cashier`
- `Delivery`

Tenant staff authorization is associated with a trusted `restaurantId` custom claim. Client-side route guards improve navigation but are not the security boundary; Firestore rules and trusted Cloud Functions enforce authorization.

## Firestore Model

Application data is tenant-scoped under:

```text
restaurants/{restaurantId}/
  settings/
  menuItems/
  categories/
  qrConfig/
  orders/
  reviews/
  complaints/
  customers/
  staff/
  inventory/
  recipes/
  waste_log/
  orderNumberCounters/
```

Legacy top-level application collections are denied by `firestore.rules` rather than treated as authoritative data paths.

Order creation and daily order-number allocation are handled transactionally by Cloud Functions. Order lifecycle transitions and inventory deduction are validated in trusted backend logic and Firestore rules.

## AI Security

The Gemini credential is **server-side only**.

The frontend calls the `aiAssistant` Firebase callable. The backend validates authentication/tenant context, validates input, applies rate limiting, reads the `GEMINI_API_KEY` Functions secret, and calls Gemini without exposing the secret to browser code.

Never place privileged credentials in `VITE_*` variables or commit secrets to the repository.

## Tech Stack

### Frontend

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- React Router 7
- Firebase Web SDK
- Recharts
- Framer Motion
- html5-qrcode
- jsPDF / html2canvas

### Backend

- Firebase Cloud Functions for Node.js 20
- Firebase Admin SDK
- Firestore
- Firebase Authentication
- Gemini API through the server-side AI function

## Local Development

Install root dependencies:

```bash
npm ci
```

Start the frontend:

```bash
npm run dev
```

For Cloud Functions, install the dependencies in `functions/` when working on backend code:

```bash
cd functions
npm ci
```

## Verification

Useful repository checks are:

```bash
npm run lint
npm run build
npm test
```

The test suite includes domain tests, Firestore Emulator rules/integration tests, Firebase Auth/Functions integration tests, AI security regression tests, and performance regression contracts.

Performance helpers:

```bash
npm run perf:bundle-report
npm run perf:budget
```

## Firebase Configuration

Firebase project configuration is represented by `firebase.json`, while the browser Firebase initialization is in `src/firebase.ts`.

Cloud Functions live in `functions/`.

The AI function expects the Firebase Functions secret:

```text
GEMINI_API_KEY
```

Production deployment can require Firebase project permissions and billing. Local Emulator verification must not be treated as proof of production deployment.

## Security Rules

`firestore.rules` is part of the application's security boundary. It enforces authentication, role and tenant checks, allowed fields, order lifecycle transitions, customer ownership, and protected collection paths.

Do not weaken rules to make a client operation succeed. When Firebase behavior changes, use the Emulator-backed tests to validate the security contract.

## Performance

Routes are lazy-loaded in `src/App.tsx`. The QR scanner feature isolates `html5-qrcode` behind a feature-level lazy boundary, and selected context/derived data is memoized where it reduces unnecessary work.

The repository maintains a bundle regression budget of:

- **Initial JavaScript:** max 850 KiB
- **Total JavaScript:** max 3 MiB

These are engineering regression thresholds, not claims about Lighthouse scores or real-user performance.

## Project Documentation

- [`AGENTS.md`](AGENTS.md) — engineering contract and phase workflow.
- [`docs/firestore-schema.md`](docs/firestore-schema.md) — Firestore schema documentation.
- [`docs/phase7-gate4-architecture.md`](docs/phase7-gate4-architecture.md) — current architecture, setup, security, testing and deployment boundaries.
- `docs/phase*-*.md` — implementation and verification records for the completed engineering phases.

## Development Principles

MenuFlow is maintained incrementally. Security, tenant isolation, data integrity and existing product behavior take priority over broad rewrites.

- Preserve existing behavior unless a change is explicitly required.
- Keep authorization server/rules-side.
- Keep privileged secrets out of browser code.
- Prefer transactional operations for consistency-sensitive workflows.
- Use evidence before making performance or architectural changes.
- Never commit secrets or destructive Git changes.
