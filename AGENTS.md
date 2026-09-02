# MenuFlow Engineering Contract

This file is the project-local operating contract for Codex and other coding agents working on MenuFlow.

## 1. Mission

MenuFlow is a Vite + React + TypeScript restaurant-management application with customer ordering, merchant operations, staff dashboards, delivery workflows, Firebase authentication/Firestore persistence, QR ordering, and AI-assisted functionality.

The goal of this workflow is to improve the existing application into a production-ready, maintainable, secure, tested system **without breaking existing product behavior unnecessarily**.

Work must be incremental, evidence-driven, and reversible.

## 2. Non-Negotiable Rules

- Read this file before making repository changes.
- Never "fix everything" in one pass.
- Work on exactly one approved phase at a time.
- Do not modify unrelated files.
- Do not introduce a dependency unless it is justified by the current phase.
- Do not remove existing functionality merely to make a check pass.
- Do not weaken security rules to make the UI work.
- Never treat `localStorage` as an authoritative authorization mechanism.
- Never expose new secrets or credentials to browser code.
- Never commit `.env` files, API keys, service-account credentials, tokens, or other secrets.
- Do not blindly rewrite Arabic, French, or multilingual strings. Encoding cleanup must be deliberate and reviewed.
- Do not change Firestore collection paths or security rules without first mapping the existing data model and affected callers.
- Do not change `.github/workflows/ci.yml` unless a concrete CI defect is demonstrated.
- Do not disable, skip, or weaken lint, TypeScript, build, or security checks merely to obtain a green CI run.
- Never use `npm audit fix` automatically as part of unrelated work.
- Do not make destructive Git operations such as force-push or history rewriting unless explicitly authorized.

## 3. Current Baseline

The current development branch for the CI work is `automation/ci-pipeline`.

The repository's CI workflow is `.github/workflows/ci.yml` and currently validates:

1. repository checkout with full history for PR diff checking;
2. Node.js setup;
3. `npm ci`;
4. PR diff formatting with `git diff --check`;
5. `npm run lint`;
6. `npm run build`.

The CI history-depth problem was intentionally fixed with `fetch-depth: 0`. Do not revert that change.

The project has already been verified locally with:

```text
npm ci
npm run lint
npm run build
```

The production build may report warnings about large chunks and ineffective dynamic imports. These are performance findings, not automatic build failures. Address them in the dedicated performance phase rather than masking them.

## 4. Required Workflow For Every Phase

Before changing code:

1. Read `AGENTS.md`.
2. Inspect the relevant files and their callers.
3. Inspect Git status and recent history.
4. State the exact scope of the phase internally before editing.
5. Identify behavior that must remain unchanged.
6. Identify security/data-integrity risks.

While changing code:

- Prefer small, focused changes.
- Preserve existing APIs and behavior unless the phase explicitly requires a contract change.
- Keep TypeScript types explicit around Firebase data and external inputs.
- Keep authorization decisions server/rules-side, not UI-side.
- Add validation at trust boundaries.
- Prefer reusable typed services over duplicating Firestore business logic.

After changing code:

1. Inspect the diff.
2. Run the most relevant tests/checks.
3. Run `npm run lint`.
4. Run `npm run build` when the phase changes application/build code.
5. Run any Firebase Emulator/rules tests when security rules or Firebase behavior changes.
6. Run `git diff --check`.
7. Report failures honestly; never hide them.

Do not commit or push unless the current task explicitly authorizes a commit/push.

## 5. Implementation Phases

### Phase 0 — Baseline / Safety

Purpose: establish a trustworthy baseline and repository instructions.

Tasks:
- Confirm Git state.
- Confirm CI configuration.
- Confirm `npm ci`, lint, and production build behavior.
- Preserve diagnostic files unless explicitly asked to remove them.
- Do not perform application refactors in this phase.

### Phase 1 — Firestore Schema & Authorization Foundation

This is the first substantive implementation phase.

Before editing rules, create a canonical map of all Firestore collections/subcollections used by the application, including:

- orders
- staff
- customers
- inventory
- recipes
- reviews
- complaints
- waste_log
- settings
- restaurant_qr_config
- categories
- menu
- expenses
- suppliers
- stock_take
- restaurants/{restaurantId}/menuItems
- any additional collection discovered during inspection

Determine which paths are authoritative and which are obsolete/duplicated.

Important confirmed baseline findings:
- Frontend code currently uses collections that are not all represented in `firestore.rules`.
- Merchant recipe publishing currently writes to a top-level `menu` collection while customer menu display reads `restaurants/{restaurantId}/menuItems`.
- Firestore rules rely on `request.auth.token.role` and `request.auth.token.restaurantId`, while the repository does not contain an evident trusted claim-provisioning backend.

Do not deploy or finalize new rules until the canonical schema and authorization model are explicitly understood.

### Phase 2 — Authentication, Roles & Tenant Security

Goals:
- Establish one canonical role vocabulary.
- Stop relying on client-local role data for authorization.
- Introduce a trusted mechanism for custom claims if custom claims remain the chosen architecture.
- Correct staff account provisioning so creating a staff user does not replace the administrator's active session.
- Define restaurant/tenant boundaries.
- Harden public customer flows against abuse.

Confirmed baseline issues to address:
- Staff creation uses the primary Auth instance and can switch the active administrator session to the new account.
- Role casing is inconsistent (`cashier`, `delivery` vs `Cashier`, `Delivery`, etc.).
- Login contains client-side role assignment logic and a hard-coded SuperAdmin identity.
- Rules permit some unauthenticated writes with weak validation.

Do not invent a backend architecture without checking the repository and deployment constraints first.

### Phase 3 — Order & Inventory Integrity

Goals:
- Make order state transitions authoritative and validated.
- Restrict mutable fields by role and lifecycle state.
- Prevent duplicate inventory deductions.
- Use Firestore transactions/batched writes where required for consistency.
- Make daily order-number generation safe under concurrency.
- Preserve tenant isolation.

Confirmed baseline risks:
- Inventory deduction is not clearly idempotent.
- Order numbers are derived from client-side in-memory state.
- Current order update rules are too permissive.

### Phase 4 — AI Security

Goals:
- Remove browser exposure of Gemini/API secrets.
- Move privileged AI calls behind a trusted server-side endpoint/function.
- Add authentication/authorization where appropriate.
- Add input validation, rate limiting, and abuse controls.
- Document required environment variables without committing secrets.

Confirmed baseline issue:
- `src/services/aiServices.tsx` reads a `VITE_*` API key and calls Google directly from browser code. `VITE_*` values are bundled into client code and therefore must not contain privileged secrets.

### Phase 5 — Testing & CI Expansion

Add appropriate automated coverage for:
- utility/domain logic;
- critical order workflows;
- Firestore security rules with the Emulator;
- authentication/authorization boundaries;
- critical customer ordering paths.

Only after tests exist should CI be expanded to run them.

Do not make CI slower or more complex without a concrete reliability benefit.

### Phase 6 — Performance

Goals:
- Add route-level lazy loading where safe.
- Split heavy dashboard and feature dependencies.
- Reduce the initial JavaScript payload.
- Resolve ineffective dynamic imports where they are actually useful.
- Introduce a sensible bundle-size budget/check only when it can be maintained reliably.

Confirmed baseline:
- The initial JavaScript bundle is approximately 2.77 MB minified in the observed build.
- Routes are statically imported from `src/App.tsx`.
- Firebase modules and heavy dashboard/QR/PDF functionality contribute to the initial bundle.

Do not sacrifice correctness or introduce fragile lazy-loading boundaries merely to reduce a number.

### Phase 7 — Quality, Naming, Documentation & Encoding

Tasks:
- Repair user-facing encoding corruption carefully.
- Normalize misleading/inconsistent filenames where safe.
- Replace stale Vite README content with MenuFlow documentation.
- Document architecture, setup, Firebase configuration, roles, testing, and deployment.

Encoding work must be reviewed as a dedicated change. Never run a blind global character replacement.

## 6. Firebase Rules & Data Safety

Firestore rules are part of the application's security boundary.

When modifying them:

- Assume client-side checks can be bypassed.
- Validate authentication and tenant ownership in rules.
- Validate allowed fields and state transitions.
- Distinguish public customer actions from staff/admin actions.
- Avoid trusting arbitrary client-supplied restaurant IDs without an authorization relationship.
- Consider App Check/anonymous authentication/backend mediation where appropriate.
- Test rules with the Firebase Emulator before considering the phase complete.

Never solve a permission-denied problem by simply making a rule more permissive.

## 7. React / TypeScript Standards

- Use TypeScript types/interfaces for domain data and Firebase documents.
- Avoid `any` unless there is a documented unavoidable boundary.
- Keep components focused on presentation and interaction.
- Move persistence/domain workflows into typed service modules when complexity warrants it.
- Keep Context providers focused; avoid turning a single provider into an entire domain/data layer.
- Prefer explicit error handling over silent failures.
- Do not create silent no-op defaults that hide missing providers when an explicit failure is safer.
- Preserve React Fast Refresh requirements and existing ESLint intent.
- Do not disable ESLint rules globally to silence local issues.

## 8. Security Standards

Treat the following as security-sensitive:

- authentication state;
- custom claims;
- roles;
- restaurant/tenant identifiers;
- Firestore writes;
- API keys;
- AI endpoints;
- customer/order PII;
- staff records;
- payment-related fields.

Never assume that hiding a button or route is authorization.

Never place service-account credentials in frontend code.

Never put privileged API keys in `VITE_*` variables.

## 9. Dependency Rules

- Keep `package.json` and `package-lock.json` synchronized.
- CI uses `npm ci`; lockfile correctness is therefore mandatory.
- Do not manually edit generated lockfile sections unless there is a compelling reason and the result is validated by `npm ci`.
- After dependency changes, run `npm install` using the project's intended npm version/tooling, then verify with `npm ci`.
- Do not upgrade unrelated dependencies during a feature/security phase.
- Review dependency changes for unnecessary bundle impact.

## 10. Git Rules

Use focused commits with conventional commit messages when commits are explicitly requested, for example:

- `fix: ...`
- `refactor: ...`
- `test: ...`
- `security: ...`
- `ci: ...`
- `docs: ...`

Before a commit:

```text
git status
git diff --check
git diff
```

Never include unrelated diagnostic files in a commit unless explicitly requested.

Do not force-push.

Do not rewrite existing history.

## 11. CI Contract

The current CI pipeline is intentionally minimal and reliable.

Do not:
- remove `fetch-depth: 0`;
- remove `npm ci`;
- skip lint/build to make CI green;
- silently tolerate dependency-lock mismatch;
- add flaky network-dependent checks without a clear reason.

If CI fails:

1. identify the exact failing step;
2. reproduce locally when possible;
3. determine whether the failure is code, dependency, environment, Git history, or CI configuration;
4. fix the root cause;
5. rerun the relevant checks;
6. inspect the resulting GitHub Actions run.

## 12. Reporting Requirements

At the end of each phase, report:

- what changed;
- why it changed;
- exact files changed;
- security implications;
- behavior intentionally preserved;
- checks/tests executed;
- their results;
- remaining known issues;
- whether the phase is complete or blocked.

Distinguish clearly between:

- **Confirmed issue** — demonstrated from repository code/configuration.
- **Risk** — plausible failure mode requiring further validation.
- **Recommendation** — improvement that is not currently a defect.

Never fabricate evidence.

## 13. Current Audit Findings To Preserve

The initial Codex audit identified these confirmed/high-confidence findings. They are the starting backlog, not permission to change everything immediately:

1. Firestore application paths and checked-in rules are materially inconsistent.
2. Customer menu reads a different Firestore path from the merchant recipe publishing path.
3. Browser-side Gemini/API credential exposure exists.
4. Custom claims appear to be required by rules but are not provisioned by an evident trusted backend in this repository.
5. Staff creation can replace the administrator's active Firebase Auth session.
6. Role naming/casing is inconsistent across creation, login, routing, and rules.
7. Order update authorization is too permissive.
8. Public order/review/complaint writes have weak abuse/schema controls.
9. Client-side SuperAdmin assignment is fragile and must not be treated as authoritative.
10. User-facing encoding corruption exists and requires a careful migration.
11. Inventory deduction lacks clear idempotency/transactional protection.
12. Client-generated order numbers can collide under concurrency.
13. `OrderProvider` is overly broad and combines multiple domains.
14. Error handling is frequently insufficient or console-only.
15. TypeScript strictness can be improved, but this should be incremental and validated.
16. Route-level code splitting is absent and the initial bundle is large.
17. There is no meaningful automated application/rules test suite yet.

## 14. First Implementation Gate

Before starting substantive implementation, the agent must be able to answer:

- What Firestore schema is canonical?
- Which actor types exist?
- What is the authoritative source of identity and role?
- How is restaurant/tenant ownership established?
- Which customer operations are intentionally public?
- Where will privileged AI calls execute?
- What tests will prove the security changes work?

If any answer is unknown, stop and investigate rather than guessing.

## 15. Definition of Done

A phase is complete only when:

- its intended scope is implemented;
- no known security regression was introduced;
- relevant tests pass;
- `npm run lint` passes;
- `npm run build` passes when applicable;
- `git diff --check` passes;
- the diff contains no unrelated changes;
- the result is documented clearly;
- the next phase has not been started prematurely.

**Principle: secure first, preserve behavior, change incrementally, verify everything.**
