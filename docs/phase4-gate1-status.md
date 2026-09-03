# Phase 4 Gate 1 — AI Secret Boundary

Status: **IMPLEMENTED — awaiting CI verification**

## Scope

Remove privileged Gemini credential usage from browser code while preserving the existing customer AI service contract.

## Changes

- `src/services/aiServices.tsx` no longer reads any `VITE_*` AI credential and no longer calls Google Gemini directly.
- The browser delegates AI requests to the `aiAssistant` Firebase callable.
- `functions/index.js` declares `GEMINI_API_KEY` with Firebase Functions Secret Manager parameters.
- The Gemini request is executed server-side using the secret value.
- Provider failures are converted to server-side errors without returning the API credential.
- Existing `getAIResponse(userPrompt, menuItems)` behavior is preserved at the frontend service boundary.
- A dedicated regression suite protects the client/server secret boundary and is wired into `npm test`.

## Security boundary

```text
Browser
  -> Firebase callable: aiAssistant
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
- Node 20 Functions runtime contract.

Full CI verification is required before this gate is marked **VERIFIED**.

## Explicit boundary

Authentication/authorization, rate limiting, abuse controls, and stronger input validation are intentionally deferred to Gates 3–4. This gate does not claim those controls are complete.

No destructive migration, dependency upgrade, broad rewrite, or unrelated application behavior change was introduced.
