# MenuFlow — Codex / AI Agent Operating Guide

## 1. Mission

MenuFlow is a React + TypeScript + Vite application styled with Tailwind CSS and integrated with Firebase. The goal of this repository is not merely to make the application compile: changes must progressively move the project toward a secure, maintainable, tested, performant, production-ready system without unnecessarily changing existing product behavior.

The agent must work conservatively, verify assumptions from the repository, and preserve working functionality unless a change is explicitly required by the current phase or task.

## 2. Technology Baseline

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- Firebase 12
- React Router 7
- ESLint 10
- Framer Motion, Recharts, Lucide React and existing project dependencies
- Primary commands:
  - `npm run dev`
  - `npm run lint`
  - `npm run build`
  - `npm ci`

Do not introduce a new framework, state-management library, backend service, UI library, or major dependency without first establishing that the repository genuinely requires it.

## 3. Development Roadmap

Follow this order unless the user explicitly changes the plan:

### Phase 0 — Baseline ✅

The project baseline has already been established. Do not redo baseline work unless new evidence requires it.

### Phase 1 — Lint / TypeScript ✅

Lint and TypeScript issues were cleaned up. Keep the repository lint-clean and buildable.

### Phase 2 — Full Deep Audit 🔥

This is the current major engineering phase. Audit the whole application before large refactors.

Audit at minimum:

- Security
- Authentication and authorization
- Firebase configuration and access patterns
- Firestore reads/writes and security rules where available
- Data isolation between customers, merchants, admins, drivers and other roles
- Multi-tenant boundaries
- Sensitive data exposure
- Client-side trust assumptions
- Business-logic correctness
- Race conditions and stale state
- Error handling and loading states
- Routing and protected routes
- Context/provider architecture
- Component responsibilities
- Duplicate logic and unnecessary coupling
- Type safety and unsafe casts
- Dependency and environment-variable usage
- Performance hotspots
- Accessibility and responsive behavior where relevant
- Maintainability and technical debt

Do not silently fix every finding during the audit. First distinguish findings by severity and classify them as critical, high, medium, low, or informational. Prefer evidence from actual code and configuration.

### Automation / CI Pipeline ✅

The repository has a GitHub Actions quality workflow. It must remain green.

The CI quality gate is expected to cover:

1. Clean dependency installation with `npm ci`
2. Diff formatting validation
3. ESLint
4. TypeScript / production build

Never weaken CI simply to make a check pass. Fix the underlying repository or workflow problem.

### Phase 3 — Selective Refactoring

Only refactor after Phase 2 has identified the problems and priorities.

Refactor in small, reviewable units. Every refactor must have a clear reason, a limited scope, and verification. Avoid broad rewrites when a focused change solves the problem.

### Module-by-Module Development

After the audit/refactoring foundation is stable, develop and harden the application module by module.

For each module:

1. Understand current behavior and dependencies.
2. Identify backend/data logic risks.
3. Review UI/UX behavior.
4. Implement the smallest coherent change.
5. Run lint.
6. Run build.
7. Add or improve tests when the project testing strategy supports them.
8. Review for security and regression risks.

Backend/logic and UI/UX should be treated as connected concerns rather than independent rewrites.

### Testing

Testing becomes progressively stronger as modules stabilize. Prefer meaningful tests around business rules, authorization boundaries, data transformations, critical flows and regressions.

Never claim that something is tested unless the relevant command/test actually ran or the evidence is otherwise available.

### Performance

Address performance based on evidence, not speculation. Current build output may contain warnings about large chunks and ineffective Firebase dynamic imports. Treat these as optimization findings, not automatic reasons for a risky rewrite.

### Production Security

Before production readiness, perform a final security pass covering authentication, authorization, Firebase rules/access, data isolation, secrets/environment variables, client trust boundaries, error leakage and dependency risks.

### Production Ready 🚀

The project is production-ready only when critical/high findings are addressed or explicitly accepted, CI is green, builds succeed, critical user flows are verified, and security/data-isolation boundaries are defensible.

## 4. Codex / Agent Working Rules

### Inspect before editing

Before changing code:

- Inspect the relevant file(s).
- Inspect related imports/usages.
- Search for the same symbol or logic elsewhere when appropriate.
- Understand the existing behavior.
- Identify the smallest safe change.

Never modify a file based only on its filename or an assumed implementation.

### Prefer surgical edits

Make precise, localized edits whenever possible. Do not replace an entire file when a small change is sufficient.

Preserve:

- Existing business logic
- Existing routes
- Existing Firebase behavior unless the task requires a change
- Existing public interfaces and component contracts
- Existing styling and UX unless the task explicitly targets them
- Existing naming conventions where they are coherent

### No speculative refactors

Do not:

- Rewrite architecture because it could be cleaner
- Rename large sets of files without a concrete reason
- Replace working patterns merely because another pattern is fashionable
- Add abstractions before a repeated problem is demonstrated
- Change behavior while claiming it is only a cleanup

### Security-first behavior

Treat authorization and data isolation as high-priority concerns.

Never assume that hiding a UI element is authorization. Verify the actual enforcement boundary.

Be especially careful with role-specific data and operations involving:

- Admins / Super Admins
- Merchants
- Customers
- Delivery drivers
- Restaurant data
- Orders
- Customers' personal information
- Firebase/Firestore access

Never expose secrets or hard-code credentials/API keys into source files.

### Firebase rules

When changing Firebase data access, explicitly reason about:

- Who can read the data?
- Who can write it?
- Which document/collection identifies ownership?
- Can one tenant/merchant access another tenant's data?
- Can a client forge an owner/user/role identifier?
- Is authorization enforced server-side/security-rule-side rather than only in React?

Do not weaken Firestore security rules for convenience.

### TypeScript

Prefer real types over `any`, unsafe assertions, or suppression comments.

Do not use `@ts-ignore` or similar suppression as a shortcut. If an exception is genuinely necessary, explain the reason and keep the scope minimal.

### Error handling

Do not swallow errors silently. Preserve useful user-facing behavior while keeping sensitive implementation details out of production UI.

### Dependencies

Do not run automatic dependency upgrades as a generic cleanup. Dependency changes must have a reason and must keep `package.json` and `package-lock.json` synchronized.

The lockfile must remain compatible with clean CI installation using `npm ci`.

### CI discipline

Before proposing or committing a change, prefer to run:

```bash
npm run lint
npm run build
git diff --check
```

When dependency metadata changes, also verify:

```bash
npm ci
```

Do not commit generated build output unless the repository explicitly tracks it.

### Git discipline

Keep commits focused and meaningful.

Do not create empty commits merely to force CI unless there is a specific operational reason.

Do not rewrite history, force-push, delete branches, merge pull requests, or alter protected branches unless the user explicitly requests the action.

For pull requests, review the actual diff before making recommendations.

## 5. Change Classification

Before significant changes, classify them internally as one of:

- `security`: authentication, authorization, secrets, Firebase rules, data isolation
- `bugfix`: incorrect existing behavior
- `refactor`: behavior-preserving structural improvement
- `performance`: measured or clearly evidenced performance improvement
- `ui/ux`: visual, interaction, accessibility or responsive improvement
- `tooling`: CI, ESLint, TypeScript, build or developer tooling
- `feature`: intentional new product behavior

Do not mix unrelated categories in one change unless necessary.

## 6. Audit Severity

Use this priority model during Phase 2:

### Critical
Potential account compromise, cross-tenant/customer data exposure, unauthorized privileged operations, leaked secrets, or severe production integrity/security failure.

### High
Serious authorization flaws, meaningful data leakage, destructive business-logic bugs, major production failure paths, or security weaknesses that can realistically be exploited.

### Medium
Important correctness, maintainability, performance, architecture or UX issues that should be addressed but are not immediately catastrophic.

### Low
Minor cleanup, duplication, naming, cosmetic maintainability issues, or non-critical optimization opportunities.

### Informational
Observations that are useful for future work but do not currently require action.

## 7. Verification Standard

For every completed task, report:

- What changed
- Why it changed
- What was intentionally not changed
- Verification performed
- Any remaining warnings/findings
- Any assumptions that still need confirmation

Do not report success solely because an edit was made.

A green lint/build result does not mean the application is secure. CI is a quality gate, not a substitute for the Phase 2 deep audit.

## 8. Current Repository Context

The project has already passed the baseline and lint/TypeScript cleanup phases. A professional GitHub Actions CI pipeline has been added and its earlier dependency-lockfile and diff-check issues were resolved. Keep the CI workflow green while continuing the roadmap.

The current priority is therefore:

**Phase 2 — Full Deep Audit → findings/priorities → Phase 3 selective refactoring → module-by-module hardening/development → testing → performance → final production security → production readiness.**

Codex should behave as an engineering agent following this roadmap, not as an unrestricted code generator.
