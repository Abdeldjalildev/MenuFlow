# Phase 4 — Gates 4–5 Status

## Gate 4 — Input Validation + Abuse Protection

Implemented server-side controls for the privileged AI endpoint:

- Prompt must be a non-empty string and is capped at 12,000 characters.
- Menu payload is capped at 100 items and 60,000 serialized characters.
- Menu serialization failures are rejected instead of being sent upstream.
- A Firestore transaction provides a per-caller request budget of 10 requests per 60-second window.
- Rate-limit failures return `resource-exhausted` rather than reaching Gemini.
- The rate-limit key is tenant-scoped and caller-scoped.
- Provider transport remains bounded by the existing 15-second timeout.
- No privileged AI credential is exposed to browser code.

The 12,000-character prompt ceiling intentionally accommodates the existing customer AI flow, which embeds the menu context into the prompt before sending the request.

## Gate 5 — AI Security Regression + CI Verification

Implemented a dedicated regression suite covering:

- server-side secret boundary;
- callable authentication and tenant authorization;
- authorization-before-secret ordering;
- input limits and rate limiting;
- bounded Gemini transport;
- Node 20 Functions runtime;
- unchanged browser callable integration boundary.

Test command:

`npm run test:phase4:gate4`

`npm run test:phase4:gate5`

Both are included in `npm test`.

## Verification state

**VERIFIED — code + local/CI regression evidence.**

Phase 4 Gates 4–5 are verified at the repository/CI level. Production deployment/verification is **BLOCKED**, not passed: the attempted `aiAssistant` deployment to `menuflow-c02e5` could not enable `artifactregistry.googleapis.com` because the project's billing account is not open.

No production success claim is made. This operational blocker does not invalidate the repository-level security implementation or prevent Phase 5 from proceeding under the project's incremental workflow.

No destructive migration, unrelated dependency upgrade, broad rewrite, or unrelated application behavior change was introduced.
