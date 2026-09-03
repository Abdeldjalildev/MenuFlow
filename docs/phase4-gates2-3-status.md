# Phase 4 — Gates 2–3 Status

## Scope

Gates 2 and 3 strengthen the AI service boundary without changing the customer-facing AI workflow.

### Gate 2 — Trusted Server-Side AI Endpoint

- The browser calls only the `aiAssistant` Firebase callable.
- The Gemini provider request is isolated in `functions/aiProvider.js` and is reachable only from the Functions runtime.
- The Gemini API key remains a Firebase Functions Secret Manager secret.
- The provider call has a bounded 15-second timeout so a stalled upstream request cannot wait indefinitely.
- The existing `getAIResponse(...)` flow remains the customer UI integration point.

### Gate 3 — Authentication + Authorization Boundary

- `aiAssistant` rejects requests without Firebase Authentication.
- Anonymous Firebase Auth is accepted for the public customer-menu use case.
- Staff callers must carry a valid MenuFlow authorization role.
- Non-SuperAdmin staff callers must use the same `restaurantId` as their authorization claim.
- SuperAdmin callers may target an explicitly supplied tenant.
- Authorization executes before the privileged Gemini secret is read.
- Cross-tenant staff access is rejected server-side.

## Regression coverage

`tests/phase4-gates2-3-ai-boundary.test.mjs` verifies the server-side provider boundary, callable contract, authentication/tenant checks, authorization ordering, and absence of privileged authorization logic in browser code.

## Verification state

**IMPLEMENTED — awaiting CI verification.**

Do not mark Gates 2 or 3 as fully verified until the Phase 4 CI run passes. Do not treat static regression tests as proof of deployed production behavior.
