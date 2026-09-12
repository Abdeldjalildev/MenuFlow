# MenuFlow Engineering Contract

This file is the project-local operating contract for Codex, Cline, and other coding agents working on MenuFlow.

## 1. Mission

MenuFlow is a Vite + React + TypeScript restaurant-management application with customer ordering, merchant operations, staff dashboards, delivery workflows, Firebase authentication/Firestore persistence, QR ordering, and server-side AI-assisted functionality.

The project is now beyond its verified foundational/security implementation. The objective is to evolve the verified baseline into a commercially credible, production-ready restaurant platform **without breaking established behavior or reopening closed work without evidence of regression**.

Work must be incremental, evidence-driven, reversible, security-first, and phase-gated.

---

## 2. Critical Operating Rules

- Read this file completely before repository changes.
- Work on **exactly one approved phase at a time**.
- Do not begin a later phase early, even if its work appears convenient.
- A phase is not complete until its gates and required tests are complete.
- Do not reopen Phases 1–7 merely because older documentation or historical investigation notes describe their former problems. Those phases are CLOSED and form the verified baseline.
- Only reopen a closed phase when a new, reproducible regression or new evidence requires it.
- Do not "fix everything" in one pass.
- Do not modify unrelated files.
- Do not introduce dependencies unless justified by the active gate.
- Do not remove existing functionality merely to make a check pass.
- Do not weaken security rules to make the UI work.
- Never treat `localStorage`, URL parameters, hidden UI, or route guards as authoritative authorization.
- Never expose secrets or privileged credentials to browser code.
- Never commit `.env` files, API keys, service-account credentials, tokens, or other secrets.
- Do not blindly rewrite Arabic, French, English, or other multilingual strings.
- Do not change Firestore collection paths or security rules without mapping the affected data model and callers first.
- Do not make unrelated dependency upgrades.
- Do not use `npm audit fix` automatically.
- Do not force-push or rewrite history.
- Preserve existing diagnostic files unless explicitly authorized to remove them.
- Do not make a code change merely because an old audit listed it as a problem; verify its current state first.

### Important workflow rule

When the user gives a compound task, complete only the explicitly authorized scope. If the task is to analyze a phase, analyze it. If it is to implement a gate, implement that gate and its tests. Do not silently continue into the next gate or phase.

---

## 3. Verified Baseline — Phases 1–7 CLOSED

The following historical implementation phases are **closed and verified**:

- Phase 1 — CLOSED
- Phase 2 — CLOSED
- Phase 3 — CLOSED
- Phase 4 — CLOSED
- Phase 5 — CLOSED
- Phase 6 — CLOSED
- Phase 7 — CLOSED

Do not treat their historical findings as current defects unless current repository evidence demonstrates a regression.

### Verified testing baseline

- Official verification: **123/123 PASS**
- Additional regression verification: **12/12 PASS**
- Total verified passing tests: **135**
- `npm test`: exit code 0
- Phase 5 final: **33/33 PASS**
- Phase 6 build/budget verification passed
- Phase 7 Gate 5: **7/7 PASS**
- CI has successfully validated the verified baseline.

### Verified Git baseline

The verified Phase 7 baseline was merged into `main` through PR #26.

- PR #26: `chore: finalize Phase 7 verified baseline`
- PR head SHA before merge: `0456d7a23906cd5d3c2cab149fdfbb4be12b191b`
- Merge commit: `d6d9da0445953e23f397a3143016d6c7f2eeabca`
- `main` is the verified baseline branch.

The repository must remain reproducible from Git. Before implementation work, inspect `git status`, current branch, current commit, and recent history.

---

## 4. Current Architecture

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- React Context/providers for application domains
- Arabic/English/French support with RTL considerations

### Backend / Firebase

- Firebase Authentication
- Firestore
- Firebase Cloud Functions v2
- Firebase Admin SDK
- Firebase Emulator Suite for verification
- Gemini accessed through a server-side callable function

### Current backend functions

- `provisionAuthzClaims`
- `createOrder`
- `transitionOrder`
- `aiAssistant`

### Runtime

- Functions runtime: Node 20
- Firebase Functions region: `us-central1`
- Emulator ports: Auth `9099`, Firestore `8080`, Functions `5001`, Hub `4400`

### Important security architecture

The verified application now uses trusted backend/rules-side authorization, server-side AI secret handling, server-authoritative order numbering, transactional order/inventory behavior, tenant-aware security rules, and regression/security tests.

Do not regress to the historical architectures documented in old investigation material.

---

## 5. Closed Historical Investigation — Do Not Restart Without New Evidence

The Windows Firebase Functions discovery investigation is closed.

Historical symptoms included intermittent discovery timeouts and `createOrder` deadline failures. The investigation established that:

- Functions-only discovery works under Node 20.
- Functions child processes receive the Firebase emulator environment.
- `/__/functions.yaml` discovery works.
- All four functions are discoverable.
- `createOrder` reaches its handler.
- Firestore emulator communication works.
- The historical Gate 2 suite eventually reached **18/18 PASS**.

An environment-only workaround involving `FUNCTIONS_DISCOVERY_TIMEOUT=120` and npm registry behavior was used during the investigation.

**Do not reopen this investigation, rewrite `functions/index.js`, or replace the emulator architecture unless a new reproducible failure demonstrates that the closed findings no longer hold.**

Historical diagnostic files must not be deleted casually:

- `diagnostic-bisect.cjs`
- `diagnostic-bisect2.cjs`
- `diagnostic-create-order.mjs`
- `diagnostic-spawn.cjs`
- `diagnostic-worker.cjs`
- `functions/diagnostic-createorder.cjs`
- `functions/index.js.before-timing`
- `functions/index.js.diagnostic-backup`
- `worker-stderr.txt`
- `worker-stdout.txt`

---

## 6. Current Audit Findings — Starting Backlog, Not Automatic Instructions

The current independent audit found the following high-confidence issues/risks. These are **backlog items for the new roadmap**, not permission to modify everything immediately.

1. There are currently two potential order-creation paths: server callable creation and a direct Firestore customer-create path.
2. `createOrder` still accepts client-supplied item prices/total values; the product contract must decide and then enforce server-authoritative pricing.
3. `OrderProvider` is overly broad and combines multiple domains.
4. Order/domain fields are fragmented (`price`/`unitPrice`/`originalPrice`, `quantity`/`qty`, `totalAmount`/`totalPrice`).
5. `OrderStatus` and the backend lifecycle contain a contract mismatch around legacy `TrackDone`.
6. Public restaurant identity currently relies partly on URL/localStorage context; this is UX context, not authorization.
7. `firestorePaths.ts` exists but is not consistently used by callers.
8. The menu has a hard-coded demo fallback when database menu data is empty; this may be a production business-correctness issue.
9. Observability is still relatively weak and relies heavily on console logging.
10. CI is strong regression CI but is not yet full production CI/E2E/observability coverage.
11. Browser-level end-to-end coverage of the complete restaurant workflow is limited compared with the strong rules/domain/regression coverage.

### Classification rule

Always distinguish:

- **Confirmed issue** — demonstrated from current repository evidence.
- **Risk** — plausible failure mode requiring validation.
- **Recommendation** — improvement, not a demonstrated defect.

Do not claim a historical issue is still present without current evidence.

---

## 7. Product/Domain Model For The New Roadmap

The intended model for the next stages is:

- Platform Owner / SuperAdmin
- Admin
- Restaurant
- Staff
  - Kitchen
  - Cashier
  - Delivery
  - Waiter
- Customer

Identity, membership, role, permission, and restaurant ownership must be treated as separate concepts where appropriate.

### Multi-Admin direction

An Admin may manage multiple restaurants.

Different Admins must be isolated from each other. Restaurant staff remain scoped to their restaurant. Platform Owner/SuperAdmin retains platform-level authority.

Do not hardcode future revenue-share or commercial commission rules into the core domain at this stage.

### Waiter direction

Waiters are authenticated restaurant-scoped actors.

The future Waiter interface must reuse the same canonical order workflow as customer ordering rather than introducing a second order engine. A waiter may:

- select a restaurant context within their authorized scope;
- select a table;
- browse the full menu;
- build a cart;
- add customer notes;
- submit the order to the kitchen;
- receive a server-authoritative order number.

Expected order provenance should be modeled explicitly, e.g. `orderSource: customer | waiter`, plus appropriate creator/waiter identity fields.

### Analytics direction

Analytics is intended to become a business-intelligence layer, not merely a chart page.

Revenue, expenses, net profit, category/item share, sales over time, and peak periods must have explicit definitions before implementation. Tenant boundaries and date/timezone semantics must be explicit.

As data volume grows, prefer server-side aggregation/query strategies over downloading all raw operational data to the browser.

---

## 8. Explicitly Out Of Scope For The Current Roadmap

### Payment gateway

**Do not implement a payment gateway at this stage.**

This explicitly excludes, for now:

- Stripe
- PayPal
- Algerian payment gateways
- payment webhooks
- payment provider integration
- split payments
- platform payment commissions
- gateway-specific checkout flows

The architecture should avoid blocking future payment integration, but no payment-gateway work is authorized in Phases 8–14 unless the user explicitly changes this decision.

---

## 9. New Master Roadmap — Phases 8–14

The following is the approved high-level roadmap. **Do not start a phase or gate without explicit user authorization.**

Each phase contains five gates. Each gate must be analyzed before implementation and must include appropriate tests.

### PHASE 8 — Core Domain & Security Architecture

**Gate 8.1 — Canonical Domain & Actor Model**
- Establish the actor/domain model: Platform Owner/SuperAdmin, Admin, Kitchen, Cashier, Delivery, Waiter, Customer.
- Separate Identity, Membership, Role, Permission, Restaurant concepts where needed.
- Map current schema and authorization against this model.

**Gate 8.2 — Multi-Admin / Multi-Restaurant Authorization**
- Admin A may manage multiple restaurants.
- Admin B is isolated.
- Staff remain restaurant-scoped.
- Review/adjust trusted claims and authorization relationships.

**Gate 8.3 — Tenant & Public Identity**
- Define authoritative restaurant identity for QR, table, URL parameters, waiter-selected context, and localStorage.
- localStorage remains UX-only and never authorization.
- Define behavior for invalid, disabled, deleted, or unknown restaurants.

**Gate 8.4 — Order Authority Contract**
- Define one canonical order authority for customer and waiter.
- Define who may create/modify/append orders.
- Define authority for restaurantId, customerId, waiterId, source, price, total, and order number.

**Gate 8.5 — Security Contract Closure**
- Test cross-tenant reads/writes.
- Fake restaurant IDs.
- Fake roles/waiter/admin identities.
- Direct order creation attempts.
- Illegal mutations/transitions.
- Anonymous abuse boundaries.
- Ownership and privilege escalation.

### PHASE 9 — Order Integrity & Unified Ordering

**Gate 9.1 — Order Domain Normalization**
- Unify price/unitPrice/originalPrice.
- Unify quantity/qty.
- Unify totalAmount/totalPrice.
- Resolve OrderStatus/legacy TrackDone mismatch.

**Gate 9.2 — Server-Authoritative Pricing**
- Client sends item IDs, quantities, and valid modifiers.
- Server retrieves authoritative prices.
- Server calculates subtotal/discount/total.
- Client cannot lower totals by supplying alternate prices/totals.

**Gate 9.3 — Canonical Order Creation**
- Customer and waiter use one canonical create-order workflow.
- Preserve source identity.
- Preserve server-side numbering, tenant validation, pricing, validation, and persistence.

**Gate 9.4 — Order Mutation Security**
- Review and secure append-to-order, driver claim, status changes, driver assignment, payment-related flags, and other sensitive mutations.
- Business-authoritative mutations belong server/rules-side, not merely in UI code.

**Gate 9.5 — Order Integrity Closure**
- Customer ordering.
- Waiter ordering.
- Concurrency.
- Numbering.
- Fake prices.
- Fake restaurant IDs.
- Fake user/waiter identity.
- Duplicate mutation.
- Illegal append/driver claim.
- Inventory/lifecycle invariants.

### PHASE 10 — Waiter Experience

**Gate 10.1 — Waiter Role & Access**
- Authenticated waiter role.
- Restaurant-scoped access.
- Correct tenant isolation.

**Gate 10.2 — Waiter Menu**
- Full customer-equivalent menu experience.
- Correct language behavior.
- Language selection passed through props/established application state rather than a duplicated language system.

**Gate 10.3 — Waiter Cart & Customer Order**
- Table number.
- Customer notes.
- Cart validation.
- Server-authoritative order number.
- Canonical create-order workflow.

**Gate 10.4 — Kitchen Integration**
- Waiter-created order enters the same kitchen workflow as customer orders.
- No parallel order lifecycle.

**Gate 10.5 — Waiter E2E Closure**
- Login waiter → select/confirm table → menu → cart → notes → submit → server order number → kitchen → tenant isolation → Arabic/English/French.

### PHASE 11 — Restaurant Operations & UX

**Gate 11.1 — Cart Persistence**
- Safe cart persistence and restoration.
- Tenant/table context must not leak across restaurants/tables/users.

**Gate 11.2 — Order UX & Feedback**
- User-facing success/error feedback.
- Clear order lifecycle states.
- Preserve accessibility and multilingual behavior.

**Gate 11.3 — Menu Modifiers**
- Structured modifiers/options.
- Price effects must remain server-authoritative.

**Gate 11.4 — Notifications & Operational Alerts**
- Operational order notifications.
- Inventory alerts where justified.
- Avoid introducing unnecessary external infrastructure.

**Gate 11.5 — Operations Closure**
- Verify customer → order → kitchen → ready → delivery/cashier → completed.
- Verify waiter orders follow the same lifecycle.

### PHASE 12 — Analytics & Business Intelligence

**Gate 12.1 — Analytics Data Contract**
- Define revenue precisely.
- Define expense precisely.
- Define net profit precisely.
- Define treatment of cancelled/unpaid/completed orders.
- Define timezone/date boundaries.

**Gate 12.2 — Aggregation Architecture**
- Operational data → aggregation layer → analytics → UI.
- Avoid downloading all raw data to the browser.
- Choose an architecture proportional to current data volume and Firebase constraints.

**Gate 12.3 — Analytics Dashboard**
- Sales per day/month.
- Category share.
- Item share.
- Income/revenue.
- Total expenses.
- Net profit.
- Bar/line/pie/donut visualizations where each genuinely communicates the metric.

**Gate 12.4 — Advanced Filters**
- Date range.
- Day/hour/month granularity.
- Peak hour/day analysis.
- Useful comparison views.
- Clear empty/loading/error states.

**Gate 12.5 — Analytics Security & Accuracy Closure**
- Tenant isolation.
- Date/timezone boundaries.
- Cancelled/unpaid/completed semantics.
- Duplicate aggregation prevention.
- Expense classification.
- Zero-data behavior.
- Large-dataset behavior.

### PHASE 13 — Multi-Admin Commercial Architecture

**Gate 13.1 — Admin Entity**
- Establish Admin as a first-class domain actor.
- Do not confuse Admin identity with a restaurant itself.

**Gate 13.2 — Admin ↔ Restaurant Membership**
- Admin may manage multiple restaurants.
- Membership is explicit and authoritative.
- Different Admins cannot access each other's restaurants.

**Gate 13.3 — Restaurant Management**
- Create/manage authorized restaurants.
- Maintain restaurant-scoped staff and operational data.

**Gate 13.4 — Platform Owner Controls**
- SuperAdmin/platform-level visibility and administration.
- Safe creation/removal/disablement of Admins and memberships.

**Gate 13.5 — Multi-Tenant Security Closure**
- Admin A/B isolation.
- Staff isolation.
- Platform Owner access.
- Forged restaurant IDs.
- Forged memberships.
- Forged claims.
- Privilege escalation attempts.

### PHASE 14 — Production Security, Observability & Final Hardening

**Gate 14.1 — Structured Logging**
- Replace important console-only operational signals with structured, useful logs.

**Gate 14.2 — Operational Metrics**
- Order failures/latency.
- Function failures.
- AI usage/failures where appropriate.
- Inventory anomalies.

**Gate 14.3 — Abuse Protection**
- Rate limiting/abuse controls proportional to threat and cost.
- App Check or stronger controls where justified.

**Gate 14.4 — Production CI/E2E**
- Browser E2E for critical workflows.
- Production-oriented CI checks.
- Avoid flaky checks and unnecessary pipeline complexity.

**Gate 14.5 — Final Security & Production Audit**
- Full tenant/security review.
- Regression review.
- Production readiness assessment.
- Documentation closure.

---

## 10. Gate/Phase Testing Contract

Every gate must use the appropriate combination of:

1. Unit/domain tests.
2. Integration tests.
3. Firestore Rules/security tests when authorization/data access is affected.
4. Full regression against the verified **135-test baseline**, unless an intentional contract change is explicitly approved and its tests are updated accordingly.
5. Browser E2E for user-facing workflows where applicable.

A gate must not be declared complete if:

- a security test fails;
- tenant isolation fails;
- business authority can be bypassed;
- regression fails without an explicitly approved contract change;
- lint fails;
- build fails when applicable;
- the diff contains unrelated changes;
- the intended behavior is not documented;
- the agent has silently started the next gate/phase.

### Important test principle

Tests are evidence, not decoration. If a test passes but does not actually prove the intended security/business invariant, improve the test rather than merely counting it as coverage.

---

## 11. React / TypeScript / Firebase Standards

- Keep authorization decisions server/rules-side.
- Keep UI language state centralized or explicitly passed through props; do not create competing language systems.
- Prefer typed domain services for complex persistence workflows.
- Keep Context providers focused; do not blindly refactor `OrderProvider` until the active gate requires it.
- Preserve existing React Fast Refresh and ESLint intent.
- Do not disable lint rules globally.
- Validate external input at trust boundaries.
- Preserve tenant boundaries in every service/query/mutation.
- Server-authoritative values must include, where applicable:
  - restaurantId
  - order number
  - prices
  - totals
  - inventory effects
  - roles/claims
  - payment state if introduced later
  - loyalty/financial values if introduced later.

### Public identity rule

URL parameters and localStorage may carry UX context, but they are never sufficient proof that a user may access a restaurant's private data.

---

## 12. Firestore Rules & Data Safety

Firestore rules are part of the security boundary.

When modifying rules:

- Assume client-side checks can be bypassed.
- Validate authentication and tenant ownership.
- Validate allowed fields and lifecycle transitions.
- Distinguish intentionally public customer actions from staff/admin actions.
- Never trust arbitrary client-supplied restaurant IDs without an authorization relationship.
- Never solve a permission-denied problem by simply making rules more permissive.
- Test rules with the Firebase Emulator before closing the gate.

Do not change collection paths or rules until the active gate has explicitly mapped their callers and data contract.

---

## 13. Dependencies & Tooling

- Keep `package.json` and lockfiles synchronized.
- CI uses `npm ci`; lockfile correctness is mandatory.
- Do not upgrade unrelated dependencies.
- Do not manually mutate generated lockfile sections without validation.
- Use the project's intended Node/npm runtime for dependency operations.
- Functions code targets Node 20.
- Do not restart the historical Node/npm/Firebase discovery investigation unless new evidence requires it.

---

## 14. Git / Repository Hygiene

Before implementation:

```text
git status
git branch --show-current
git rev-parse HEAD
git log -5 --oneline
```

Before a commit:

```text
git status
git diff --check
git diff
```

Use focused conventional commits when a commit is explicitly requested, for example:

- `docs: ...`
- `fix: ...`
- `security: ...`
- `refactor: ...`
- `test: ...`
- `ci: ...`

Never force-push.
Never rewrite history.
Never commit unrelated diagnostic files unless explicitly requested.

---

## 15. CI Contract

The current CI pipeline is a verified regression baseline.

It validates repository checkout/history, Node setup, dependency installation, lint, tests/build and Functions Node 20 syntax validation as configured by `.github/workflows/ci.yml`.

Do not:

- remove required history depth;
- remove `npm ci`;
- skip lint/build/tests to obtain green CI;
- silently tolerate lockfile mismatch;
- add flaky network-dependent checks without a concrete reliability benefit.

If CI fails, identify whether the cause is code, dependency, environment, Git history, or CI configuration before changing anything.

---

## 16. Required Phase Workflow

### Before work

1. Read this file.
2. Confirm the user-authorized phase/gate.
3. Inspect Git status, branch, current commit, and recent history.
4. Inspect relevant source, rules, tests, and callers.
5. State the exact active scope internally.
6. Identify behavior that must remain unchanged.
7. Identify security/data-integrity risks.
8. Design the tests that will prove the gate.

### During work

- Make the smallest coherent set of changes required by the active gate.
- Preserve unrelated behavior.
- Do not silently implement future gates.
- Do not change architecture merely for stylistic preference.
- Do not invent requirements.

### After work

1. Inspect the complete diff.
2. Run relevant targeted tests.
3. Run the full regression baseline.
4. Run `npm run lint`.
5. Run `npm run build` when application/build code changed.
6. Run Firebase Emulator/rules tests when Firebase/security behavior changed.
7. Run `git diff --check`.
8. Verify no unrelated files changed.
9. Report exact results and remaining blockers.

Do not commit or push unless the current user task explicitly authorizes it.

---

## 17. Reporting Contract

At the end of each gate/phase report:

- exact scope completed;
- exact files changed;
- architecture/contract decisions;
- security implications;
- behavior intentionally preserved;
- tests/checks executed;
- exact pass/fail results;
- known issues remaining;
- whether the gate is CLOSED, BLOCKED, or awaiting a decision.

Do not report a phase as complete if any required gate remains open.

---

## 18. Definition Of Done

A gate/phase is complete only when:

- the approved scope is implemented;
- no known security regression exists;
- tenant isolation is preserved;
- relevant tests pass;
- full regression remains green or an intentional contract change is explicitly documented;
- `npm run lint` passes;
- `npm run build` passes when applicable;
- `git diff --check` passes;
- no unrelated changes are present;
- documentation is updated where the contract changed;
- the next gate/phase has not been started prematurely.

**Core principle: secure first, preserve behavior, centralize business authority, change incrementally, test the invariants, and verify everything.**
