# Phase 13 Gate 13.2 — Observability, Error Taxonomy & Operational Diagnostics

## Status

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

Gate 13.2 introduces a narrow, safe diagnostic boundary. It does not rewrite every historical log statement or change business error semantics.

## Diagnostic contract

`functions/operationalDiagnostics.js` provides:

- a bounded operation allowlist;
- a bounded error taxonomy: authorization, validation, dependency, timeout, data_integrity, not_found, internal;
- bounded identifiers for restaurant, actor, order and request context;
- message/code truncation;
- no request payload logging;
- no token, API key, password or secret fields in the diagnostic payload.

The diagnostic boundary uses Firebase Functions structured logging rather than raw `console.error` for the operational notification path.

## Failure classification

Existing `HttpsError` categories remain authoritative. The diagnostic layer classifies failures for operations evidence; it does not replace or weaken the error returned to callers.

Dependency and notification failures remain failure-isolated where the existing contract requires it. In particular, operational notification failure still returns `null` after logging and cannot roll back an already committed order transaction.

## Scope protection

- No raw request data is logged.
- No authentication tokens or API keys are logged.
- No tenant dataset is logged.
- No change to authorization decisions.
- No change to order lifecycle authority.
- No dependency upgrade.
- No broad logging rewrite.

## Verification boundary

The dedicated Gate 13.2 contract test must pass before runtime verification. Static contract PASS is not closure. Runtime evidence remains required.
