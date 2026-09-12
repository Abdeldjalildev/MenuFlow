# Phase 7 Gate 5 — Final Quality Barrier & Closure

Phase 7 Gate 5 is the final regression barrier for Gates 1–4.

## Required final verification

```text
npm ci
npm test
npm run lint
npm run build
git diff --check
```

CI is intentionally checked once after all Phase 7 gates are assembled.

## Regression contract

The dedicated `tests/phase7-gate5-quality-barrier.test.mjs` suite verifies:

- the five approved component filename normalizations exist;
- deprecated filename spellings are absent;
- no high-confidence mojibake/replacement-character markers remain in repository text;
- privileged AI credentials and direct browser Gemini provider markers remain absent;
- README is MenuFlow-specific rather than the Vite starter template;
- Gate 1–4 documentation records remain present;
- the root `npm test` command includes Gate 5.

This is a regression barrier, not a general-purpose secret scanner and not a replacement for the existing Firebase Emulator/security tests.

## Safety boundary

Gate 5 does not authorize changes to authentication, Firestore rules, order logic, AI execution, dependencies, or unrelated application behavior. No speculative cleanup is included.

## Closure criteria

Phase 7 is **CLOSED — CODE + CI VERIFIED** only when Gates 1–4 are complete, Gate 5 passes, the full repository test contract passes, lint/build/diff-check pass, and the final GitHub Actions run is green.

Any environmental or unrelated CI failure must be documented honestly rather than weakened or hidden.

## Retained boundaries

- Gate 1 found no sufficiently confident localized mojibake defect.
- Gate 2 therefore made no speculative encoding replacements.
- Gate 3 normalized only the five safe filenames and direct imports.
- Gate 4 documented the current architecture and replaced the stale README.
- Production Firebase verification remains separate from repository CI and may remain externally blocked by billing/deployment constraints documented in earlier phases.

**Principle: the final gate proves coherence; it does not create permission for unrelated cleanup.**
