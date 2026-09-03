# Phase 4 Gate 1 — AI Secret Boundary

Status: **IMPLEMENTED — awaiting CI verification**

## Scope

Remove privileged Gemini credential usage from browser code while preserving the existing customer AI workflow.

## Changes

- `src/services/aiServices.tsx` no longer reads any `VITE_*` AI credential and no longer calls Google Gemini directly.
- The browser delegates AI requests to the `aiAssistant` Firebase callable.
- `restaurantId` is passed as explicit trusted-context input for the server authorization boundary introduced in Gate 3.
- `functions/index.js` declares `GEMINI_API_KEY` with Firebase Functions Secret Manager parameters.
- The Gemini request is executed server-side using the secret value.
- Provider failures are converted to server-side errors without returning the API credential.
- The customer AI UI continues to use the same service layer; its service call now carries the tenant context required by Gate 3.
- A dedicated regression suite protects the client/server secret boundary and is wired into `npm test`.

## Security boundary

```text
Browser
  -> Firebase callable: aiAssistant
  -> server-side authorization
  -> server-side GEMINI_API_KEY secret
  -> Google Gemini
```

The Gemini API key must not be stored in `VITE_*` variables or browser source/bundles.

## Verification

The Gate 1 regression suite checks:

- no `VITE_API_KEY`/`VITE_GEMINI`/`import.meta.env` AI credential access in the frontend AI service;
- no direct Gemini URL in the frontend AI service or customer AI component;
- server-side `defineSecret('GEMINI_API_KEY')` usage;
- callable binding to the secret;
- server-side Gemini invocation;
- Node 20 Functions runtime contract;
- tenant-aware customer AI service invocation.

Full CI verification is required before this gate is marked **VERIFIED**.

## Explicit boundary

Authentication/authorization, rate limiting, abuse controls, and stronger input validation are intentionally handled by later Phase 4 gates. Gate 3 now adds the authentication and tenant authorization boundary; Gate 4 remains responsible for input and abuse controls.

No destructive migration, dependency upgrade, broad rewrite, or unrelated application behavior change was introduced.
